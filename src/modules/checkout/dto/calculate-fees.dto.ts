import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CalculateFeesDto {
  @ApiPropertyOptional({
    example: '65d8a123f456789012345678',
    description: 'MongoDB ObjectId of the user shipping address',
  })
  @IsOptional()
  @IsString()
  shippingAddressId?: string;
}
