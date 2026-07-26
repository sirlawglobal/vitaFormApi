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
    enum: SleepingPositionEnum,
    example: SleepingPositionEnum.SIDE,
    description: 'Primary sleeping position',
  })
  @IsEnum(SleepingPositionEnum)
  sleepingPosition: SleepingPositionEnum;

  @ApiPropertyOptional({ example: 75, description: 'Body weight in kg' })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  bodyWeightKg?: number;

  @ApiPropertyOptional({ example: 32, description: 'User age' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({ example: 350000, description: 'Max budget in NGN' })
  @IsOptional()
  @IsNumber()
  @Min(10000)
  budget?: number;

  @ApiPropertyOptional({
    enum: FirmnessEnum,
    example: FirmnessEnum.MEDIUM,
    description: 'Preferred mattress firmness',
  })
  @IsOptional()
  @IsEnum(FirmnessEnum)
  preferredFirmness?: FirmnessEnum;

  @ApiPropertyOptional({ example: true, description: 'Has back pain' })
  @IsOptional()
  @IsBoolean()
  hasBackPain?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Has neck pain' })
  @IsOptional()
  @IsBoolean()
  hasNeckPain?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Is user currently pregnant' })
  @IsOptional()
  @IsBoolean()
  isPregnant?: boolean;

  @ApiPropertyOptional({
    example: ['Scoliosis', 'Arthritis'],
    type: [String],
    description: 'Specific medical conditions',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalConditions?: string[];

  @ApiPropertyOptional({ example: 'King (6x6ft)', description: 'Preferred mattress size' })
  @IsOptional()
  @IsString()
  preferredSize?: string;

  @ApiPropertyOptional({
    enum: TemperatureEnum,
    example: TemperatureEnum.COOL,
    description: 'Sleeping temperature preference',
  })
  @IsOptional()
  @IsEnum(TemperatureEnum)
  temperaturePreference?: TemperatureEnum;

  @ApiPropertyOptional({ example: true, description: 'Sleeps with partner' })
  @IsOptional()
  @IsBoolean()
  partnerSleep?: boolean;

  @ApiPropertyOptional({
    enum: KidsOrAdultsEnum,
    example: KidsOrAdultsEnum.ADULTS,
    description: 'Who is the mattress for',
  })
  @IsOptional()
  @IsEnum(KidsOrAdultsEnum)
  kidsOrAdults?: KidsOrAdultsEnum;
}
