import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class NearbyDealersDto {
  @ApiProperty({ description: 'Latitude of the search origin', example: 6.5244, minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber({}, { message: 'lat must be a valid number' })
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ description: 'Longitude of the search origin', example: 3.3792, minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber({}, { message: 'lng must be a valid number' })
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({ description: 'Search radius in kilometers (default 20, max 200)', example: 20, minimum: 0.1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'radius must be a valid number' })
  @Min(0.1)
  @Max(200)
  radius?: number;
}
