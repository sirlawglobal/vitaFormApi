import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ClaimStatus } from '../warranty.schema';

export class ModerateClaimDto {
  @IsEnum(ClaimStatus)
  status!: ClaimStatus;

  @IsOptional()
  @IsString()
  resolution?: string;
}
