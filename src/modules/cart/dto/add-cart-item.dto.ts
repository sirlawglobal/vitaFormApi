import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({
    example: 'VF-ORTHO-KING-01',
    description: 'Unique SKU identifier of the product variant',
  })
  @IsString()
  sku: string;

  @ApiProperty({
    example: 1,
    minimum: 1,
    description: 'Quantity of items to add to the cart',
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: { customWidthCm: 180, customLengthCm: 200 },
    description: 'Optional custom configuration or dimensions for the item',
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}
