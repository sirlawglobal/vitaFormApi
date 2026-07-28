import { IsString, IsNotEmpty } from 'class-validator';

export class AddToWishlistDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;
}
