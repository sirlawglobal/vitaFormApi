import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../notifications.schema';

export class BroadcastNotificationDto {
  @ApiProperty({ description: 'Title of the broadcast notification', example: 'Flash Sale!' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Body text of the broadcast notification', example: 'Get 20% off all ortho mattresses this weekend.' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiProperty({ enum: NotificationType, required: false, default: NotificationType.PROMO })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType = NotificationType.PROMO;
}
