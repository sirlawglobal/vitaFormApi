import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_KEYS } from '../../common/constants/cache-keys.constants';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes.constants';
import { OtpType } from './dto/resend-otp.dto';

/**
 * Pure Redis OTP Management Engine.
 * Generates 6-digit numeric OTPs, hashes them with SHA-256, and stores strictly in Redis with 5-min TTL.
 * Enforces brute-force lockout protection after 5 failed attempts.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_TTL_SECONDS = 300; // 5 minutes
  private readonly COOLDOWN_SECONDS = 60; // 60 seconds between resends
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_SECONDS = 3600; // 1 hour lockout

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Generates a 6-digit OTP, stores its SHA-256 hash inside Redis, sets cooldown, and returns the plaintext OTP.
   */
  async createOtp(type: OtpType, identifier: string): Promise<{ otp: string; expiresInSeconds: number }> {
    const cleanId = identifier.toLowerCase().trim();
    await this.checkCooldown(type, cleanId);

    const otp = crypto.randomInt(100000, 999999).toString();
    const sha256Hash = this.hashOtp(otp);

    const otpKey = CACHE_KEYS.otp(type, cleanId);
    const cooldownKey = `vitaform:otp:cooldown:${type}:${cleanId}`;

    await Promise.all([
      this.cacheService.set(otpKey, sha256Hash, this.OTP_TTL_SECONDS),
      this.cacheService.set(cooldownKey, '1', this.COOLDOWN_SECONDS),
    ]);

    this.logger.log(`Generated [${type}] OTP for identifier [${cleanId}]`);
    return { otp, expiresInSeconds: this.OTP_TTL_SECONDS };
  }

  /**
   * Verifies the submitted OTP against the SHA-256 hash in Redis.
   * Enforces brute-force attempt limits.
   */
  async verifyOtp(type: OtpType, identifier: string, submittedOtp: string): Promise<boolean> {
    const cleanId = identifier.toLowerCase().trim();
    await this.checkLockout(cleanId);

    const otpKey = CACHE_KEYS.otp(type, cleanId);
    const storedHash = await this.cacheService.get<string>(otpKey);

    if (!storedHash) {
      throw new BusinessException({
        code: ERROR_CODES.INVALID_OTP,
        message: 'Verification code has expired or is invalid',
      });
    }

    const submittedHash = this.hashOtp(submittedOtp.trim());

    if (!this.timingSafeCompare(storedHash, submittedHash)) {
      await this.recordFailedAttempt(cleanId);
      throw new BusinessException({
        code: ERROR_CODES.INVALID_OTP,
        message: 'Invalid verification code submitted',
      });
    }

    await Promise.all([
      this.cacheService.del(otpKey),
      this.cacheService.del(CACHE_KEYS.otpAttempts(cleanId)),
      this.cacheService.del(`vitaform:ratelimit:otp:${cleanId}`),
    ]);

    this.logger.log(`Successfully verified [${type}] OTP for identifier [${cleanId}]`);
    return true;
  }

  /**
   * Checks if the identifier is currently locked out due to too many failed attempts.
   */
  private async checkLockout(identifier: string): Promise<void> {
    const lockoutKey = `vitaform:ratelimit:otp:${identifier}`;
    const isLocked = await this.cacheService.get<string>(lockoutKey);

    if (isLocked) {
      throw new BusinessException({
        code: ERROR_CODES.OTP_LIMIT_EXCEEDED,
        message: 'Too many incorrect verification attempts. Please wait 1 hour before trying again.',
      });
    }
  }

  /**
   * Checks if the user requested an OTP less than 60 seconds ago.
   */
  private async checkCooldown(type: OtpType, identifier: string): Promise<void> {
    const cooldownKey = `vitaform:otp:cooldown:${type}:${identifier}`;
    const onCooldown = await this.cacheService.get<string>(cooldownKey);

    if (onCooldown) {
      throw new BusinessException({
        code: ERROR_CODES.OTP_LIMIT_EXCEEDED,
        message: 'Please wait 60 seconds before requesting a new verification code.',
      });
    }
  }

  /**
   * Records a failed OTP attempt and locks the account if MAX_ATTEMPTS is reached.
   */
  private async recordFailedAttempt(identifier: string): Promise<void> {
    const attemptsKey = CACHE_KEYS.otpAttempts(identifier);
    const currentAttempts = await this.cacheService.incr(attemptsKey);

    if (currentAttempts === 1) {
      await this.cacheService.expire(attemptsKey, 3600);
    }

    if (currentAttempts >= this.MAX_ATTEMPTS) {
      const lockoutKey = `vitaform:ratelimit:otp:${identifier}`;
      await Promise.all([
        this.cacheService.set(lockoutKey, 'LOCKED', this.LOCKOUT_SECONDS),
        this.cacheService.del(attemptsKey),
      ]);
      this.logger.warn(`Locked out identifier [${identifier}] for 1 hour after ${this.MAX_ATTEMPTS} failed OTP attempts`);
    }
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private timingSafeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
