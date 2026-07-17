import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { Firmness } from '../products.schema';

export enum ProductSortBy {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING = 'rating',
  NEWEST = 'newest',
}

export class QueryProductsDto {
  @ApiPropertyOptional({ example: 'orthopedic', description: 'Filter by category slug' })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ enum: Firmness, example: Firmness.FIRM, description: 'Filter by mattress firmness' })
  @IsOptional()
  @IsEnum(Firmness)
  firmness?: Firmness;

  @ApiPropertyOptional({ example: 50000, description: 'Minimum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 500000, description: 'Maximum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 'galaxy', description: 'Search query for product name/description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'orthopedic', description: 'Filter by tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter only featured products' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: ProductSortBy, example: ProductSortBy.NEWEST })
  @IsOptional()
  @IsEnum(ProductSortBy)
  sortBy?: ProductSortBy;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
