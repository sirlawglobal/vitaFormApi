import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { UsersRepository } from '../users/users.repository';
import { SessionService, ActiveSessionInfo } from './session.service';
import { OtpService } from './otp.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { hashPassword, comparePassword } from '../../common/utils/hash.util';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes.constants';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';
import { QUEUE_NAMES, JOB_NAMES } from '../../common/constants/queue-names.constants';
import { Role } from '../../common/enums/role.enum';
import { ROLE_PERMISSIONS } from '../../common/constants/permissions.constants';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly LOGIN_MAX_ATTEMPTS = 5;

  constructor(
    @InjectConnection() private readonly mongooseConnection: Connection,
    private readonly usersRepository: UsersRepository,
    private readonly sessionService: SessionService,
    private readonly otpService: OtpService,
    private readonly outboxService: OutboxService,
    private readonly queueService: QueueService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Registers a new user inside an ACID Mongoose transaction.
   * Generates SHA-256 hashed OTPs and saves UserRegistered outbox event.
   */
  async register(dto: RegisterDto): Promise<{ userId: string; email: string; isVerified: boolean }> {
    const cleanEmail = dto.email.toLowerCase().trim();
    const cleanPhone = dto.phone.trim();

    const [existingEmail, existingPhone] = await Promise.all([
      this.usersRepository.findByEmail(cleanEmail),
      this.usersRepository.findByPhone(cleanPhone),
    ]);

    if (existingEmail || existingPhone) {
      throw new BusinessException({
        code: ERROR_CODES.CONFLICT,
        message: 'An account with this email or phone number already exists',
      });
    }

    const passwordHash = await hashPassword(dto.password);
    const session = await this.mongooseConnection.startSession();

    try {
      let createdUser: any = null;
      await session.withTransaction(async () => {
        createdUser = await this.usersRepository.create(
          {
            email: cleanEmail,
            phone: cleanPhone,
            passwordHash,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            role: Role.CUSTOMER,
            permissions: ROLE_PERMISSIONS[Role.CUSTOMER],
            isVerified: false,
            isActive: true,
          },
          session,
        );

        await this.outboxService.saveEvent(
          {
            aggregateType: 'User',
            aggregateId: createdUser._id.toString(),
            eventType: DOMAIN_EVENTS.USER_REGISTERED,
            payload: {
              userId: createdUser._id.toString(),
              email: createdUser.email,
              phone: createdUser.phone,
              firstName: createdUser.firstName,
              lastName: createdUser.lastName,
            },
          },
          session,
        );
      });

      if (createdUser) {
        const [emailOtp, phoneOtp] = await Promise.all([
          this.otpService.createOtp('email-verify', cleanEmail),
          this.otpService.createOtp('phone-verify', cleanPhone),
        ]);

        await Promise.all([
          this.queueService.add(QUEUE_NAMES.EMAIL, JOB_NAMES.SEND_VERIFICATION_OTP, {
            email: cleanEmail,
            firstName: dto.firstName,
            otp: emailOtp.otp,
            type: 'email-verify',
          }),
          this.queueService.add(QUEUE_NAMES.SMS, JOB_NAMES.SEND_VERIFICATION_OTP, {
            phone: cleanPhone,
            otp: phoneOtp.otp,
            type: 'phone-verify',
          }),
        ]);
      }

      return {
        userId: createdUser._id.toString(),
        email: createdUser.email,
        isVerified: false,
      };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Authenticates user credentials and issues a high-speed Redis session.
   */
  async login(
    dto: LoginDto,
    headers: Record<string, string | string[] | undefined>,
    ip: string,
  ): Promise<{
    sessionToken: string;
    expiresAt: Date;
    user: { id: string; firstName: string; lastName: string; email: string; role: Role; isVerified: boolean };
  }> {
    const cleanIdentifier = dto.identifier.toLowerCase().trim();
    await this.checkLoginRateLimit(cleanIdentifier, ip);

    let user = await this.usersRepository.findByEmail(cleanIdentifier);
    if (!user) {
      user = await this.usersRepository.findByPhone(cleanIdentifier);
    }

    if (!user) {
      await this.recordFailedLogin(cleanIdentifier, ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.recordFailedLogin(cleanIdentifier, ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new BusinessException({
        code: ERROR_CODES.ACCOUNT_DISABLED,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    await Promise.all([
      this.cacheService.del(`vitaform:ratelimit:login:${cleanIdentifier}`),
      this.cacheService.del(`vitaform:ratelimit:login:ip:${ip}`),
    ]);

    const sessionResult = await this.sessionService.createSession(user, headers, ip);

    return {
      sessionToken: sessionResult.sessionToken,
      expiresAt: sessionResult.expiresAt,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  }

  async logout(token: string): Promise<{ message: string }> {
    await this.sessionService.revokeSession(token);
    return { message: 'Session revoked successfully' };
  }

  async logoutAll(userId: string): Promise<{ revokedCount: number; message: string }> {
    const count = await this.sessionService.revokeAllUserSessions(userId);
    return {
      revokedCount: count,
      message: `Logged out of all ${count} active device sessions`,
    };
  }

  async listSessions(userId: string, currentToken: string): Promise<ActiveSessionInfo[]> {
    return this.sessionService.listUserSessions(userId, currentToken);
  }

  async revokeRemoteSession(userId: string, targetToken: string): Promise<{ message: string }> {
    await this.sessionService.revokeRemoteSession(userId, targetToken);
    return { message: 'Remote device session terminated' };
  }

  async resendOtp(dto: ResendOtpDto): Promise<{ message: string; expiresInSeconds: number }> {
    const cleanId = dto.identifier.toLowerCase().trim();
    let user = await this.usersRepository.findByEmail(cleanId);
    if (!user) {
      user = await this.usersRepository.findByPhone(cleanId);
    }

    if (!user) {
      throw new BusinessException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'No account found matching this identifier',
      });
    }

    const otpResult = await this.otpService.createOtp(dto.type, cleanId);

    if (dto.type.includes('email') || dto.type === 'password-reset') {
      await this.queueService.add(QUEUE_NAMES.EMAIL, JOB_NAMES.RESEND_OTP, {
        email: user.email,
        firstName: user.firstName,
        otp: otpResult.otp,
        type: dto.type,
      });
    } else {
      await this.queueService.add(QUEUE_NAMES.SMS, JOB_NAMES.RESEND_OTP, {
        phone: user.phone,
        otp: otpResult.otp,
        type: dto.type,
      });
    }

    return {
      message: 'Verification code dispatched successfully',
      expiresInSeconds: otpResult.expiresInSeconds,
    };
  }

  async verifyPhone(dto: VerifyOtpDto): Promise<{ isVerified: boolean; message: string }> {
    const cleanPhone = dto.identifier.trim();
    await this.otpService.verifyOtp('phone-verify', cleanPhone, dto.otp);

    const session = await this.mongooseConnection.startSession();
    try {
      await session.withTransaction(async () => {
        const user = await this.usersRepository.findOneAndUpdate(
          { phone: cleanPhone },
          { $set: { isVerified: true } },
          session,
        );

        if (user) {
          await this.outboxService.saveEvent(
            {
              aggregateType: 'User',
              aggregateId: user._id.toString(),
              eventType: DOMAIN_EVENTS.USER_VERIFIED,
              payload: { userId: user._id.toString(), phone: user.phone, verifiedAt: new Date() },
            },
            session,
          );
        }
      });
    } finally {
      await session.endSession();
    }

    return { isVerified: true, message: 'Phone number successfully verified' };
  }

  async verifyEmail(dto: VerifyOtpDto): Promise<{ isVerified: boolean; message: string }> {
    const cleanEmail = dto.identifier.toLowerCase().trim();
    await this.otpService.verifyOtp('email-verify', cleanEmail, dto.otp);

    const session = await this.mongooseConnection.startSession();
    try {
      await session.withTransaction(async () => {
        const user = await this.usersRepository.findOneAndUpdate(
          { email: cleanEmail },
          { $set: { isVerified: true } },
          session,
        );

        if (user) {
          await this.outboxService.saveEvent(
            {
              aggregateType: 'User',
              aggregateId: user._id.toString(),
              eventType: DOMAIN_EVENTS.USER_VERIFIED,
              payload: { userId: user._id.toString(), email: user.email, verifiedAt: new Date() },
            },
            session,
          );
        }
      });
    } finally {
      await session.endSession();
    }

    return { isVerified: true, message: 'Email address successfully verified' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const cleanEmail = dto.email.toLowerCase().trim();
    const user = await this.usersRepository.findByEmail(cleanEmail);

    if (user) {
      const otpResult = await this.otpService.createOtp('password-reset', cleanEmail);
      await this.queueService.add(QUEUE_NAMES.EMAIL, JOB_NAMES.SEND_PASSWORD_RESET_OTP, {
        email: user.email,
        firstName: user.firstName,
        otp: otpResult.otp,
        type: 'password-reset',
      });
    }

    return {
      message: 'If an account matches that email, a password reset code has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const cleanEmail = dto.email.toLowerCase().trim();
    const user = await this.usersRepository.findByEmail(cleanEmail);

    if (!user) {
      throw new BusinessException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Account not found',
      });
    }

    await this.otpService.verifyOtp('password-reset', cleanEmail, dto.otp);
    const passwordHash = await hashPassword(dto.newPassword);

    const session = await this.mongooseConnection.startSession();
    try {
      await session.withTransaction(async () => {
        await this.usersRepository.updateById(
          user._id.toString(),
          { $set: { passwordHash } },
          session,
        );

        await this.outboxService.saveEvent(
          {
            aggregateType: 'User',
            aggregateId: user._id.toString(),
            eventType: DOMAIN_EVENTS.USER_PASSWORD_CHANGED,
            payload: { userId: user._id.toString(), email: user.email, resetAt: new Date() },
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    await this.sessionService.revokeAllUserSessions(user._id.toString());

    return {
      message: 'Password updated successfully. All active sessions have been logged out.',
    };
  }

  private async checkLoginRateLimit(identifier: string, ip: string): Promise<void> {
    const [idAttempts, ipAttempts] = await Promise.all([
      this.cacheService.get<string>(`vitaform:ratelimit:login:${identifier}`),
      this.cacheService.get<string>(`vitaform:ratelimit:login:ip:${ip}`),
    ]);

    if (Number(idAttempts || 0) >= this.LOGIN_MAX_ATTEMPTS || Number(ipAttempts || 0) >= this.LOGIN_MAX_ATTEMPTS * 2) {
      throw new BusinessException({
        code: ERROR_CODES.TOO_MANY_REQUESTS,
        message: 'Account or IP temporarily locked due to too many failed login attempts. Try again in 15 minutes.',
      });
    }
  }

  private async recordFailedLogin(identifier: string, ip: string): Promise<void> {
    const idKey = `vitaform:ratelimit:login:${identifier}`;
    const ipKey = `vitaform:ratelimit:login:ip:${ip}`;

    await Promise.all([
      this.cacheService.incr(idKey).then(async (c) => {
        if (c === 1) await this.cacheService.expire(idKey, 900);
      }),
      this.cacheService.incr(ipKey).then(async (c) => {
        if (c === 1) await this.cacheService.expire(ipKey, 900);
      }),
    ]);
  }
}
