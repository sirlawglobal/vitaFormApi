import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    example: 2,
    minimum: 1,
    description: 'Updated quantity of the item in the cart',
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: { customWidthCm: 180 },
    description: 'Updated custom options or dimensions',
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}
