import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum SleepingPositionEnum {
  SIDE = 'side',
  BACK = 'back',
  STOMACH = 'stomach',
  COMBINATION = 'combination',
}

export enum FirmnessEnum {
  SOFT = 'soft',
  MEDIUM = 'medium',
  FIRM = 'firm',
  EXTRA_FIRM = 'extra-firm',
}

export enum TemperatureEnum {
  COOL = 'cool',
  NEUTRAL = 'neutral',
  WARM = 'warm',
}

export enum KidsOrAdultsEnum {
  KIDS = 'kids',
  ADULTS = 'adults',
  BOTH = 'both',
}

export class SubmitSleepQuizDto {
  @ApiProperty({
    example: 'side',
    description: 'Primary sleeping position',
  })
  @IsOptional()
  @IsString()
  sleepingPosition?: string;

  @ApiPropertyOptional({ example: 'Under 60 kg', description: 'Body weight range or kg' })
  @IsOptional()
  bodyWeightKg?: any;

  @ApiPropertyOptional({ example: 'Under 30 years', description: 'User age or age range' })
  @IsOptional()
  age?: any;

  @ApiPropertyOptional({ example: 'Under ₦100,000', description: 'Max budget or budget range' })
  @IsOptional()
  budget?: any;

  @ApiPropertyOptional({
    example: 'medium',
    description: 'Preferred mattress firmness',
  })
  @IsOptional()
  @IsString()
  preferredFirmness?: string;

  @ApiPropertyOptional({ example: true, description: 'Has back pain' })
  @IsOptional()
  hasBackPain?: any;

  @ApiPropertyOptional({ example: false, description: 'Has neck pain' })
  @IsOptional()
  hasNeckPain?: any;

  @ApiPropertyOptional({ example: true, description: 'Is user currently pregnant' })
  @IsOptional()
  isPregnant?: any;

  @ApiPropertyOptional({
    example: ['Scoliosis', 'Arthritis'],
    type: [String],
    description: 'Specific medical conditions',
  })
  @IsOptional()
  medicalConditions?: any;

  @ApiPropertyOptional({ example: 'King (6x6ft)', description: 'Preferred mattress size' })
  @IsOptional()
  @IsString()
  preferredSize?: string;

  @ApiPropertyOptional({
    example: 'cool',
    description: 'Sleeping temperature preference',
  })
  @IsOptional()
  @IsString()
  temperaturePreference?: string;

  @ApiPropertyOptional({ example: true, description: 'Sleeps with partner' })
  @IsOptional()
  partnerSleep?: any;

  @ApiPropertyOptional({
    example: 'adults',
    description: 'Who is the mattress for',
  })
  @IsOptional()
  @IsString()
  kidsOrAdults?: string;
}
