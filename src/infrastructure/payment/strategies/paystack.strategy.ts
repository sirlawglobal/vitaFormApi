import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PaymentInitializePayload,
  PaymentInitializeResult,
  PaymentRefundResult,
  PaymentStrategy,
  PaymentVerifyResult,
} from '../interfaces/payment-strategy.interface';

@Injectable()
export class PaystackStrategy implements PaymentStrategy {
  readonly providerName = 'paystack';
  private readonly logger = new Logger(PaystackStrategy.name);
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>('payment.paystackSecretKey', '') || '';
  }

  async initializePayment(
    payload: PaymentInitializePayload,
  ): Promise<PaymentInitializeResult> {
    const amountInKobo = Math.round(payload.amount * 100);
    const isMock =
      !this.secretKey ||
      this.secretKey.startsWith('mock_') ||
      this.secretKey.includes('placeholder');

    if (isMock) {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      this.logger.warn(
        `[Paystack Dev Mode] Initializing mock simulator checkout for ref [${payload.reference}]`,
      );
      return {
        authorizationUrl: `${appUrl}/api/v1/payments/simulate/${payload.reference}`,
        reference: payload.reference,
        gatewayReference: `pstk_${Math.floor(100000 + Math.random() * 900000)}`,
        accessCode: `acc_${Math.floor(100000 + Math.random() * 900000)}`,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: payload.email,
          amount: amountInKobo,
          reference: payload.reference,
          callback_url: payload.callbackUrl,
          metadata: payload.metadata,
          channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money'],
        }),
      });

      const json = await response.json();
      if (!json.status) {
        throw new Error(json.message || 'Paystack initialization failed');
      }

      return {
        authorizationUrl: json.data.authorization_url,
        reference: payload.reference,
        gatewayReference: json.data.reference,
        accessCode: json.data.access_code,
      };
    } catch (err) {
      this.logger.error(
        `Paystack initialize error: ${err instanceof Error ? err.message : String(err)}`,
      );
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      return {
        authorizationUrl: `${appUrl}/api/v1/payments/simulate/${payload.reference}`,
        reference: payload.reference,
        gatewayReference: `pstk_demo_${payload.reference}`,
      };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResult> {
    const isMock =
      !this.secretKey ||
      this.secretKey.startsWith('mock_') ||
      this.secretKey.includes('placeholder');

    if (isMock) {
      return {
        status: 'SUCCESS',
        amount: 50000,
        currency: 'NGN',
        reference,
        gatewayReference: `pstk_mock_${reference}`,
        paidAt: new Date().toISOString(),
        channel: 'card',
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      const json = await response.json();
      if (!json.status) {
        return { status: 'FAILED', amount: 0, currency: 'NGN', reference };
      }

      const data = json.data;
      const status: 'SUCCESS' | 'FAILED' | 'PENDING' =
        data.status === 'success' ? 'SUCCESS' : data.status === 'failed' ? 'FAILED' : 'PENDING';

      return {
        status,
        amount: data.amount / 100,
        currency: data.currency || 'NGN',
        reference: data.reference,
        gatewayReference: String(data.id),
        paidAt: data.paid_at,
        channel: data.channel,
        rawResponse: data,
      };
    } catch (err) {
      this.logger.error(`Paystack verify error: ${err instanceof Error ? err.message : String(err)}`);
      return { status: 'FAILED', amount: 0, currency: 'NGN', reference };
    }
  }

  async processRefund(reference: string, amount?: number): Promise<PaymentRefundResult> {
    if (!this.secretKey || this.secretKey.startsWith('mock_')) {
      return { success: true, refundReference: `ref_${Date.now()}`, amount };
    }

    try {
      const response = await fetch(`${this.baseUrl}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: reference,
          amount: amount ? Math.round(amount * 100) : undefined,
        }),
      });

      const json = await response.json();
      return {
        success: Boolean(json.status),
        refundReference: json.data?.id ? String(json.data.id) : undefined,
        message: json.message,
      };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  validateWebhookSignature(signature: string, rawBody: string | Buffer): boolean {
    if (!this.secretKey || this.secretKey.startsWith('mock_')) {
      return true; // Bypass in dev mode
    }

    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(bodyStr)
      .digest('hex');

    return hash === signature;
  }
}
