import { IsString, IsNotEmpty, IsDate } from 'class-validator';
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
}
