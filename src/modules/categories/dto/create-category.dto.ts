import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Name of the category',
    example: 'Orthopedic Mattresses',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'URL slug for the category (must be unique)',
    example: 'orthopedic-mattresses',
  })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the category',
    example: 'Firm mattresses engineered for optimal spinal support.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'MongoDB ObjectId of the parent category (if subcategory)',
    type: String,
    example: null,
    nullable: true,
  })
  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Display ordering priority (lower numbers display first)',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Whether this category is publicly active and visible',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'URL to category banner or thumbnail image',
    example: 'https://res.cloudinary.com/vitaform/image/upload/v12345/categories/ortho-banner.jpg',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
