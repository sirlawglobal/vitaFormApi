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
export class FlutterwaveStrategy implements PaymentStrategy {
  readonly providerName = 'flutterwave';
  private readonly logger = new Logger(FlutterwaveStrategy.name);
  private readonly secretKey: string;
  private readonly webhookHash: string;
  private readonly baseUrl = 'https://api.flutterwave.com/v3';

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>('payment.flutterwaveSecretKey', '') || '';
    this.webhookHash = this.config.get<string>('payment.flutterwaveWebhookHash', '') || '';
  }

  async initializePayment(
    payload: PaymentInitializePayload,
  ): Promise<PaymentInitializeResult> {
    if (!this.secretKey || this.secretKey.startsWith('mock_')) {
      this.logger.warn(
        `[Flutterwave Dev Mode] Initializing mock payment for ref [${payload.reference}]`,
      );
      return {
        authorizationUrl: `https://checkout.flutterwave.com/v3/hosted/pay/mock-${payload.reference}`,
        reference: payload.reference,
        gatewayReference: `flw_${Math.floor(100000 + Math.random() * 900000)}`,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: payload.reference,
          amount: payload.amount,
          currency: payload.currency || 'NGN',
          redirect_url: payload.callbackUrl,
          customer: {
            email: payload.email,
          },
          meta: payload.metadata,
          payment_options: 'card,banktransfer,ussd,mobilemoney',
        }),
      });

      const json = await response.json();
      if (json.status !== 'success') {
        throw new Error(json.message || 'Flutterwave initialization failed');
      }

      return {
        authorizationUrl: json.data.link,
        reference: payload.reference,
        gatewayReference: payload.reference,
      };
    } catch (err) {
      this.logger.error(`Flutterwave initialize error: ${err instanceof Error ? err.message : String(err)}`);
      return {
        authorizationUrl: `https://checkout.flutterwave.com/v3/hosted/pay/demo-${payload.reference}`,
        reference: payload.reference,
      };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResult> {
    if (!this.secretKey || this.secretKey.startsWith('mock_')) {
      return {
        status: 'SUCCESS',
        amount: 50000,
        currency: 'NGN',
        reference,
        gatewayReference: `flw_mock_${reference}`,
        paidAt: new Date().toISOString(),
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      const json = await response.json();
      if (json.status !== 'success') {
        return { status: 'FAILED', amount: 0, currency: 'NGN', reference };
      }

      const data = json.data;
      const status: 'SUCCESS' | 'FAILED' | 'PENDING' =
        data.status === 'successful' ? 'SUCCESS' : data.status === 'failed' ? 'FAILED' : 'PENDING';

      return {
        status,
        amount: data.amount,
        currency: data.currency || 'NGN',
        reference: data.tx_ref,
        gatewayReference: String(data.id),
        paidAt: data.created_at,
        rawResponse: data,
      };
    } catch (err) {
      this.logger.error(`Flutterwave verify error: ${err instanceof Error ? err.message : String(err)}`);
      return { status: 'FAILED', amount: 0, currency: 'NGN', reference };
    }
  }

  async processRefund(reference: string, amount?: number): Promise<PaymentRefundResult> {
    if (!this.secretKey || this.secretKey.startsWith('mock_')) {
      return { success: true, refundReference: `flw_ref_${Date.now()}`, amount };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transactions/${reference}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      const json = await response.json();
      return {
        success: json.status === 'success',
        refundReference: json.data?.id ? String(json.data.id) : undefined,
        message: json.message,
      };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  validateWebhookSignature(signature: string, _rawBody: string | Buffer): boolean {
    if (!this.webhookHash || this.secretKey.startsWith('mock_')) {
      return true; // Bypass in dev mode
    }
    return signature === this.webhookHash;
  }
}
