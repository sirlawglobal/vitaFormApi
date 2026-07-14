import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'customer@vitafoam.com',
    description: 'User email or E.164 phone number',
  })
  @IsString()
  @IsNotEmpty({ message: 'Identifier (email or phone) is required' })
  identifier!: string;

  @ApiProperty({ example: 'StrongPass!2026', description: 'Account password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password!: string;
}
