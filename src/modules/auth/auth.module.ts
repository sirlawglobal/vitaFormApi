import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { OtpService } from './otp.service';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WsAuthGuard } from '../../common/guards/ws-auth.guard';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    OtpService,
    SessionAuthGuard,
    RolesGuard,
    PermissionsGuard,
    WsAuthGuard,
  ],
  exports: [
    AuthService,
    SessionService,
    OtpService,
    SessionAuthGuard,
    RolesGuard,
    PermissionsGuard,
    WsAuthGuard,
  ],
})
export class AuthModule {}
