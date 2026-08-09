import { IsString, IsNotEmpty, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterWarrantyDto {
  @IsString()
  @IsNotEmpty()
  serialNumber!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsDate()
  @Type(() => Date)
  purchaseDate!: Date;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
