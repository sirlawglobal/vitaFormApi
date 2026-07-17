import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Unique hardware identifier or UUID of the device',
    example: 'd9b2d63d-a233-4123-8478-36fa8b9195d2',
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 100)
  deviceId!: string;

  @ApiProperty({
    description: 'Platform OS of the client device',
    enum: ['ios', 'android', 'web'],
    example: 'android',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ios', 'android', 'web'])
  platform!: 'ios' | 'android' | 'web';

  @ApiPropertyOptional({
    description: 'Firebase Cloud Messaging (FCM) token for push notifications',
    example: 'e0X9a_v9Q-m3_xyz123abc...',
  })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}
