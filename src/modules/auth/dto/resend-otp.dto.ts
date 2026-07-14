import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export type OtpType = 'phone-verify' | 'email-verify' | 'password-reset' | 'login-2fa';

export class ResendOtpDto {
  @ApiProperty({
    example: 'customer@vitafoam.com',
    description: 'Email or phone number to receive the fresh OTP',
  })
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({
    example: 'email-verify',
    enum: ['phone-verify', 'email-verify', 'password-reset', 'login-2fa'],
    description: 'The purpose flow of the OTP code',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['phone-verify', 'email-verify', 'password-reset', 'login-2fa'])
  type!: OtpType;
}
