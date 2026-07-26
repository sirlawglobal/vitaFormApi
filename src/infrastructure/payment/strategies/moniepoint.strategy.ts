import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentInitializePayload,
  PaymentInitializeResult,
  PaymentRefundResult,
  PaymentStrategy,
  PaymentVerifyResult,
} from '../interfaces/payment-strategy.interface';

@Injectable()
export class MoniepointStrategy implements PaymentStrategy {
  readonly providerName = 'moniepoint';
  private readonly logger = new Logger(MoniepointStrategy.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('payment.moniepointApiKey', '') || '';
  }

  async initializePayment(
    payload: PaymentInitializePayload,
  ): Promise<PaymentInitializeResult> {
    this.logger.warn(
      `[Moniepoint Strategy] Initializing payment transaction for reference [${payload.reference}]`,
    );

    return {
      authorizationUrl: `https://checkout.moniepoint.com/pay/${payload.reference}`,
      reference: payload.reference,
      gatewayReference: `mnp_${Math.floor(100000 + Math.random() * 900000)}`,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResult> {
    return {
      status: 'SUCCESS',
      amount: 50000,
      currency: 'NGN',
      reference,
      gatewayReference: `mnp_mock_${reference}`,
      paidAt: new Date().toISOString(),
      channel: 'bank_transfer',
    };
  }

  async processRefund(reference: string, amount?: number): Promise<PaymentRefundResult> {
    return {
      success: true,
      refundReference: `mnp_ref_${Date.now()}`,
      amount,
    };
  }

  validateWebhookSignature(_signature: string, _rawBody: string | Buffer): boolean {
    return true; // Dev / Sandbox mode
  }
}
