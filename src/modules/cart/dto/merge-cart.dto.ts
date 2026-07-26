import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MergeCartDto {
  @ApiProperty({
    example: 'guest_987xyz',
    description: 'The guest session ID identifier whose cart items will be merged into the user account',
  })
  @IsString()
  guestSessionId: string;
}
