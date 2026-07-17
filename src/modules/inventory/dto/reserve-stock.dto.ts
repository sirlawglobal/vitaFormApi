import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ReserveStockDto {
  @ApiProperty({ example: 'SKU-GLX-FIRM-6FT', description: 'Variant SKU to reserve or release' })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiProperty({ example: 2, description: 'Number of units to reserve or release' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 'ORD-2026-9901', description: 'Reference Order or Cart ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;
}
