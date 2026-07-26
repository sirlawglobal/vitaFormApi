import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethodEnum } from '../../checkout/dto/initiate-checkout.dto';

export class InitializePaymentDto {
  @ApiProperty({
    example: 'CHK-2026-9812-4412',
    description: 'Checkout authorization reference generated in Phase 8',
  })
  @IsString()
  checkoutRef: string;

  @ApiPropertyOptional({
    enum: PaymentMethodEnum,
    example: PaymentMethodEnum.PAYSTACK,
    description: 'Optional payment gateway provider to override default',
  })
  @IsOptional()
  @IsEnum(PaymentMethodEnum)
  provider?: PaymentMethodEnum;
}
