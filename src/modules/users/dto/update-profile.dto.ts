import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'First name of the user',
    example: 'Chinedu',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name of the user',
    example: 'Okafor',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'URL to profile avatar image',
    example: 'https://res.cloudinary.com/vitaform/image/upload/v12345/avatars/65ab1234.jpg',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
