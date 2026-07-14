import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Ip,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { SessionData } from '../../common/types/session.types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account and trigger OTP verification' })
  @ApiResponse({ status: 201, description: 'User account created successfully' })
  @ApiResponse({ status: 409, description: 'User with email or phone already exists' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate credentials and issue a Redis session hash' })
  @ApiHeader({ name: 'x-device-id', required: false, description: 'Unique device hardware identifier' })
  @ApiHeader({ name: 'x-device-platform', required: false, enum: ['ios', 'android', 'web'] })
  @ApiResponse({ status: 200, description: 'Session issued successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many failed login attempts' })
  async login(
    @Body() dto: LoginDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Ip() ip: string,
  ) {
    return this.authService.login(dto, headers, ip);
  }

  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current device session from Redis' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  async logout(@Req() req: any) {
    return this.authService.logout(req.sessionToken);
  }

  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'O(1) multi-device wipe: log out from all active devices' })
  @ApiResponse({ status: 200, description: 'Logged out of all active devices' })
  async logoutAll(@CurrentUser('userId') userId: string) {
    return this.authService.logoutAll(userId);
  }

  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @Get('sessions')
  @ApiOperation({ summary: 'List all active device sessions for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of active sessions returned' })
  async listSessions(@CurrentUser('userId') userId: string, @Req() req: any) {
    return this.authService.listSessions(userId, req.sessionToken);
  }

  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @Delete('sessions/:token')
  @ApiOperation({ summary: 'Revoke a specific remote device session' })
  @ApiResponse({ status: 200, description: 'Remote session terminated' })
  async revokeRemoteSession(
    @CurrentUser('userId') userId: string,
    @Param('token') token: string,
  ) {
    return this.authService.revokeRemoteSession(userId, token);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispatch a fresh 6-digit OTP code to email or phone' })
  @ApiResponse({ status: 200, description: 'OTP dispatched successfully' })
  @ApiResponse({ status: 429, description: 'Cooldown active, please wait 60 seconds' })
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Public()
  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 6-digit phone verification OTP' })
  @ApiResponse({ status: 200, description: 'Phone verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyPhone(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyPhone(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 6-digit email verification OTP' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyEmail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate password reset (includes account harvest defense)' })
  @ApiResponse({ status: 200, description: 'Password reset code sent if account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP, reset password, and wipe all active sessions' })
  @ApiResponse({ status: 200, description: 'Password reset and all sessions wiped' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
