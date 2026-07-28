import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsArray, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  body!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
