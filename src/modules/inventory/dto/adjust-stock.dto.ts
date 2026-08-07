import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({ example: 'SKU-GLX-FIRM-6FT', description: 'Variant SKU to adjust' })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiPropertyOptional({ example: '65ab1234cd5678ef90123456', description: 'Parent Product ID' })
  @IsOptional()
  @IsMongoId()
  productId?: string;

  @ApiProperty({ example: 50, description: 'Positive or negative stock quantity change, or total to set if operation is SET' })
  @Type(() => Number)
  @IsInt()
  quantityChange!: number;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Reorder alert threshold' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional({ example: 50, default: 50, description: 'Recommended batch reorder quantity' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reorderQuantity?: number;

  @ApiPropertyOptional({ example: 'Main Warehouse — Ikeja', default: 'Main Warehouse — Ikeja' })
  @IsOptional()
  @IsString()
  warehouse?: string;

  @ApiPropertyOptional({ example: 'Factory Restock Intake', description: 'Audit or intake reason note' })
  @IsOptional()
  @IsString()
  reason?: string;
}
