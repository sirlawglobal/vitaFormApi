import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchDealersDto {
  @ApiProperty({
    description: 'City or state to search for (matched against each dealer\'s city/state/address)',
    example: 'Enugu',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  location!: string;
}
