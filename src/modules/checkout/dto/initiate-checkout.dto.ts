import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PaymentMethodEnum {
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
  MONIEPOINT = 'moniepoint',
  OPAY = 'opay',
}

export class InitiateCheckoutDto {
  @ApiProperty({
    example: '65d8a123f456789012345678',
    description: 'Selected user shipping address ObjectId',
  })
  @IsString()
  shippingAddressId: string;

  @ApiPropertyOptional({
    example: '65d8a123f456789012345678',
    description: 'Billing address ObjectId (defaults to shipping address if omitted)',
  })
  @IsOptional()
  @IsString()
  billingAddressId?: string;

  @ApiProperty({
    enum: PaymentMethodEnum,
    example: PaymentMethodEnum.PAYSTACK,
    description: 'Selected payment provider gateway',
  })
  @IsEnum(PaymentMethodEnum)
  paymentMethod: PaymentMethodEnum;

  @ApiPropertyOptional({
    example: 'Please call before delivery',
    description: 'Special delivery instructions or order note',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
