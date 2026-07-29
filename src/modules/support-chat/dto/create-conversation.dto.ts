import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketCategory } from '../schemas/conversation.schema';

export class CreateConversationDto {
  @ApiProperty({
    description: 'The category of the support ticket',
    enum: TicketCategory,
  })
  @IsEnum(TicketCategory)
  @IsNotEmpty()
  category: TicketCategory;

  @ApiProperty({
    description: 'The subject or initial description of the issue',
    example: 'Delayed delivery for my order',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;
}
