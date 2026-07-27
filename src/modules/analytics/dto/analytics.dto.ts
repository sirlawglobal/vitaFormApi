import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { AnalyticsEventType } from '../schemas/analytics-event.schema';

export class TrackAnalyticsEventDto {
  @ApiProperty({
    enum: AnalyticsEventType,
    example: AnalyticsEventType.PRODUCT_VIEW,
    description: 'Type of clickstream interaction event',
  })
  @IsEnum(AnalyticsEventType)
  eventType!: AnalyticsEventType;

  @ApiProperty({ example: 'sess_abc123', description: 'Client session or device tracking token' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiPropertyOptional({
    example: { productId: 'prod_vita_supreme', price: 250000, source: 'homepage' },
    description: 'Metadata JSON payload',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
