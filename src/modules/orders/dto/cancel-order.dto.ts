import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @ApiPropertyOptional({
    example: 'Ordered wrong mattress size by mistake',
    description: 'Customer reason for cancelling order',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
