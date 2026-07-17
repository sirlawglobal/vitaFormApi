import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Firmness } from '../products.schema';

export class ProductDimensionsDto {
  @ApiProperty({ example: 190, description: 'Length of mattress/item' })
  @IsNumber()
  @Min(1)
  length!: number;

  @ApiProperty({ example: 180, description: 'Width of mattress/item' })
  @IsNumber()
  @Min(1)
  width!: number;

  @ApiProperty({ example: 25, description: 'Height/thickness of mattress/item' })
  @IsNumber()
  @Min(1)
  height!: number;

  @ApiPropertyOptional({ example: 'cm', default: 'cm' })
  @IsOptional()
  @IsString()
  unit?: string;
}

export class ProductWeightDto {
  @ApiProperty({ example: 35, description: 'Weight value' })
  @IsNumber()
  @Min(0.1)
  value!: number;

  @ApiPropertyOptional({ example: 'kg', default: 'kg' })
  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateProductVariantDto {
  @ApiProperty({ example: 'SKU-GLX-FIRM-6FT', description: 'Unique SKU string' })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiProperty({ example: 'Galaxy Orthopedic — 6ft x 6ft x 10in', description: 'Variant name/label' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 320000, description: 'Selling price in NGN' })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 380000, description: 'Original compare-at price before discount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ enum: Firmness, example: Firmness.FIRM })
  @IsOptional()
  @IsEnum(Firmness)
  firmness?: Firmness;

  @ApiPropertyOptional({ type: ProductDimensionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductDimensionsDto)
  dimensions?: ProductDimensionsDto;

  @ApiPropertyOptional({ type: ProductWeightDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductWeightDto)
  weight?: ProductWeightDto;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://r2.vitafoam.com/products/galaxy-1.jpg' })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ example: 'Galaxy Orthopedic Mattress front view' })
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Vita Galaxy Orthopedic Mattress' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'vita-galaxy-orthopedic-mattress' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ example: 'High-density orthopedic mattress designed specifically for superior back and lumbar support.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: '65ab1234cd5678ef90123456', description: 'Parent Category ID' })
  @IsMongoId()
  @IsNotEmpty()
  categoryId!: string;

  @ApiPropertyOptional({ type: [String], example: ['orthopedic', 'mattress', 'firm', 'lumbar'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [CreateProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @ApiPropertyOptional({ type: [CreateProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];

  @ApiPropertyOptional({
    example: { coverMaterial: 'Jacquard Fabric', warranty: '5 Years', density: 'High Density (Orthopedic)' },
  })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;

  @ApiPropertyOptional({ example: '5 Years Manufacturer Warranty against sagging and core defects.' })
  @IsOptional()
  @IsString()
  warrantyTerms?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
