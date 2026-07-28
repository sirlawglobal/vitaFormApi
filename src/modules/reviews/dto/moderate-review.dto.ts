import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class ModerateReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}

export class RejectReviewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  adminNote!: string;
}
