import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { PaymentMethodEnum } from '../../checkout/dto/initiate-checkout.dto';

export class CreateOrderFromCheckoutDto {
  @ApiProperty({
    example: 'CHK-2026-9812-4412',
    description: 'Checkout authorization reference generated in Phase 8',
  })
  @IsString()
  checkoutRef: string;

  @ApiProperty({
    example: '65d8a123f456789012345678',
    description: 'Shipping address ObjectId',
  })
  @IsString()
  shippingAddressId: string;

  @ApiProperty({
    enum: PaymentMethodEnum,
    example: PaymentMethodEnum.PAYSTACK,
    description: 'Payment method chosen by customer',
  })
  @IsEnum(PaymentMethodEnum)
  paymentMethod: PaymentMethodEnum;

  @ApiPropertyOptional({
    example: 'Call upon arrival',
    description: 'Delivery notes or instructions',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
