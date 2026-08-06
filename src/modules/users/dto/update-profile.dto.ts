import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'First name of the user',
    example: 'Chinedu',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name of the user',
    example: 'Okafor',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Phone number of the user',
    example: '+2348012345678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'URL to profile avatar image',
    example: 'https://res.cloudinary.com/vitaform/image/upload/v12345/avatars/65ab1234.jpg',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
