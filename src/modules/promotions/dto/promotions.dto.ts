import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DiscountType } from '../schemas/coupon.schema';

export class ValidateCouponDto {
  @ApiProperty({ example: 'VITA10', description: 'Uppercase promotional discount coupon code' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 250000, description: 'Total cart price in NGN before discount' })
  @IsNumber()
  @Min(0)
  cartTotal!: number;

  @ApiPropertyOptional({ example: ['prod_vita_supreme'], description: 'Product IDs contained in cart' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];
}

export class CreateCouponDto {
  @ApiProperty({ example: 'VITA10', description: 'Unique uppercase coupon code' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE, description: 'Percentage or fixed amount discount' })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiProperty({ example: 10, description: 'Discount value (e.g. 10 for 10% or 5000 for 5000 NGN)' })
  @IsNumber()
  @Min(0)
  discountValue!: number;

  @ApiPropertyOptional({ example: 100000, description: 'Minimum cart order total required to use coupon' })
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 50000, description: 'Maximum NGN discount cap for percentage coupons' })
  @IsOptional()
  @IsNumber()
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 500, description: 'Total global usage limit (0 = unlimited)' })
  @IsOptional()
  @IsInt()
  usageLimitTotal?: number;

  @ApiPropertyOptional({ example: 1, description: 'Maximum usages per customer' })
  @IsOptional()
  @IsInt()
  usageLimitPerUser?: number;

  @ApiPropertyOptional({ example: [], description: 'Specific category IDs (empty array = global)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategoryIds?: string[];

  @ApiPropertyOptional({ example: ['prod_vita_supreme'], description: 'Specific product IDs (empty array = global)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableProductIds?: string[];

  @ApiProperty({ example: '2026-07-27T00:00:00.000Z', description: 'Activation start date ISO string' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-08-31T23:59:59.000Z', description: 'Expiration date ISO string' })
  @IsDateString()
  expiresAt!: string;

  @ApiPropertyOptional({ example: true, description: 'Is coupon active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Get 10% OFF your first orthopedic mattress purchase' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCouponDto {
  @ApiPropertyOptional({ example: 'VITA10_EDITED' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 60000 })
  @IsOptional()
  @IsNumber()
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsInt()
  usageLimitTotal?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  usageLimitPerUser?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Updated promotional offer' })
  @IsOptional()
  @IsString()
  description?: string;
}
