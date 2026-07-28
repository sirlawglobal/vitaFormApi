import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class RegisterWarrantyDto {
  @IsString()
  @IsNotEmpty()
  serialNumber!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsDateString()
  purchaseDate!: Date;
}
