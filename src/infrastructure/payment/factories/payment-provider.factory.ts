import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStrategy } from '../interfaces/payment-strategy.interface';
import { PaystackStrategy } from '../strategies/paystack.strategy';
import { FlutterwaveStrategy } from '../strategies/flutterwave.strategy';
import { MoniepointStrategy } from '../strategies/moniepoint.strategy';
import { OpayStrategy } from '../strategies/opay.strategy';

@Injectable()
export class PaymentProviderFactory {
  private readonly strategies: Map<string, PaymentStrategy> = new Map();

  constructor(
    private readonly config: ConfigService,
    paystackStrategy: PaystackStrategy,
    flutterwaveStrategy: FlutterwaveStrategy,
    moniepointStrategy: MoniepointStrategy,
    opayStrategy: OpayStrategy,
  ) {
    this.strategies.set('paystack', paystackStrategy);
    this.strategies.set('flutterwave', flutterwaveStrategy);
    this.strategies.set('moniepoint', moniepointStrategy);
    this.strategies.set('opay', opayStrategy);
  }

  getProvider(providerName?: string): PaymentStrategy {
    const defaultProvider = this.config.get<string>('payment.defaultProvider', 'paystack');
    const target = (providerName || defaultProvider).toLowerCase().trim();

    const strategy = this.strategies.get(target);
    if (!strategy) {
      throw new NotFoundException(
        `Payment provider '${target}' is not supported. Available providers: ${Array.from(this.strategies.keys()).join(', ')}`,
      );
    }

    return strategy;
  }

  getSupportedProviders(): string[] {
    return Array.from(this.strategies.keys());
  }
}
