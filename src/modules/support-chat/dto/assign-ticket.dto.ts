import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class AssignTicketDto {
  @ApiProperty({
    description: 'The ObjectId of the agent to assign the ticket to',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  agentId: Types.ObjectId;
}
