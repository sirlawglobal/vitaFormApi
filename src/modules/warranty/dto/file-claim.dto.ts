import { IsString, IsNotEmpty, IsArray, IsOptional, MaxLength } from 'class-validator';

export class FileClaimDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
