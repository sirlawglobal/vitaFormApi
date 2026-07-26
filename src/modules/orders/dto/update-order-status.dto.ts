import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.SHIPPED,
    description: 'New status for the order state machine transition',
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({
    example: 'Handed over to GIG Logistics for dispatch',
    description: 'Reason or fulfillment notes for the status change',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    example: 'GIG-9812456',
    description: 'Tracking number assigned by logistics courier',
  })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({
    example: 'GIG Logistics',
    description: 'Name of the courier or logistics provider',
  })
  @IsOptional()
  @IsString()
  courierName?: string;
}
