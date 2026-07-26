import { Module } from '@nestjs/common';
import { PaystackStrategy } from './strategies/paystack.strategy';
import { FlutterwaveStrategy } from './strategies/flutterwave.strategy';
import { MoniepointStrategy } from './strategies/moniepoint.strategy';
import { OpayStrategy } from './strategies/opay.strategy';
import { PaymentProviderFactory } from './factories/payment-provider.factory';

@Module({
  providers: [
    PaystackStrategy,
    FlutterwaveStrategy,
    MoniepointStrategy,
    OpayStrategy,
    PaymentProviderFactory,
  ],
  exports: [PaymentProviderFactory],
})
export class PaymentInfrastructureModule {}
