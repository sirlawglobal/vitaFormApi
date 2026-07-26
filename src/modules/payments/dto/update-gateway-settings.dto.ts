import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethodEnum } from '../../checkout/dto/initiate-checkout.dto';

export class UpdateGatewaySettingsDto {
  @ApiProperty({
    enum: PaymentMethodEnum,
    example: PaymentMethodEnum.PAYSTACK,
    description: 'Active default payment provider selected by admin',
  })
  @IsEnum(PaymentMethodEnum)
  defaultProvider: PaymentMethodEnum;

  @ApiPropertyOptional({
    type: [String],
    example: ['paystack', 'flutterwave', 'moniepoint'],
    description: 'List of payment providers enabled for customers at checkout',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledProviders?: string[];
}
