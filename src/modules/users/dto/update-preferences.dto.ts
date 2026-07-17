import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Preferred sleeping position',
    enum: ['side', 'back', 'stomach'],
    example: 'side',
  })
  @IsOptional()
  @IsIn(['side', 'back', 'stomach'])
  sleepPosition?: 'side' | 'back' | 'stomach';

  @ApiPropertyOptional({
    description: 'User body weight in kilograms (used for mattress firmness recommendation)',
    example: 75,
    minimum: 20,
    maximum: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  bodyWeightKg?: number;

  @ApiPropertyOptional({
    description: 'Preferred mattress firmness level',
    enum: ['soft', 'medium', 'firm', 'extra-firm'],
    example: 'firm',
  })
  @IsOptional()
  @IsIn(['soft', 'medium', 'firm', 'extra-firm'])
  mattressPreference?: 'soft' | 'medium' | 'firm' | 'extra-firm';

  @ApiPropertyOptional({
    description: 'Opt-in for email newsletter and promotions',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  newsletter?: boolean;

  @ApiPropertyOptional({
    description: 'Opt-in for SMS transactional/promotional alerts',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  smsAlerts?: boolean;

  @ApiPropertyOptional({
    description: 'Opt-in for mobile push notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;
}
