import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Friendly label for the delivery address',
    example: 'Home',
    maxLength: 30,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 30)
  label!: string;

  @ApiProperty({
    description: 'Street address including house number',
    example: '14 Allen Avenue',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 150)
  street!: string;

  @ApiProperty({
    description: 'City or town of delivery location',
    example: 'Ikeja',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  city!: string;

  @ApiProperty({
    description: 'State of delivery location',
    example: 'Lagos',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  state!: string;

  @ApiPropertyOptional({
    description: 'Postal code if available',
    example: '100281',
  })
  @IsOptional()
  @IsString()
  @Length(2, 20)
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Country of delivery location',
    example: 'Nigeria',
    default: 'Nigeria',
  })
  @IsOptional()
  @IsString()
  @Length(2, 60)
  country?: string;

  @ApiPropertyOptional({
    description: 'Set as default delivery address',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'GPS coordinates [longitude, latitude] for dealer locator matching',
    example: [3.3515, 6.6018],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  coordinates?: [number, number];
}
