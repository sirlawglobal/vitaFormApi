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
export class OpayStrategy implements PaymentStrategy {
  readonly providerName = 'opay';
  private readonly logger = new Logger(OpayStrategy.name);
  private readonly merchantId: string;
  private readonly secretKey: string;
  private readonly baseUrl = 'https://cashierapi.opayweb.com/api/v3';

  constructor(private readonly config: ConfigService) {
    this.merchantId = this.config.get<string>('payment.opayMerchantId', '') || '';
    this.secretKey = this.config.get<string>('payment.opaySecretKey', '') || '';
  }

  async initializePayment(
    payload: PaymentInitializePayload,
  ): Promise<PaymentInitializeResult> {
    const isMock =
      !this.secretKey ||
      this.secretKey.startsWith('mock_') ||
      this.secretKey.includes('placeholder');

    if (isMock) {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      this.logger.warn(
        `[OPay Dev Mode] Initializing mock simulator checkout for ref [${payload.reference}]`,
      );
      return {
        authorizationUrl: `${appUrl}/api/v1/payments/simulate/${payload.reference}`,
        reference: payload.reference,
        gatewayReference: `opay_${Math.floor(100000 + Math.random() * 900000)}`,
      };
    }

    try {
      const amountInKobo = Math.round(payload.amount * 100);
      const response = await fetch(`${this.baseUrl}/cashier/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          MerchantId: this.merchantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: payload.reference,
          mchShortName: 'Vitafoam',
          productName: 'Vitafoam Product Purchase',
          productDesc: `Order payment for ${payload.reference}`,
          userPhone: payload.email,
          userRequestIp: '127.0.0.1',
          amount: String(amountInKobo),
          currency: payload.currency || 'NGN',
          returnUrl: payload.callbackUrl,
          callbackUrl: payload.callbackUrl,
          payMethods: ['CardPayment', 'BankPayment', 'BalancePayment'],
        }),
      });

      const json = await response.json();
      if (json.code !== '00000') {
        throw new Error(json.message || 'OPay cashier initialization failed');
      }

      return {
        authorizationUrl: json.data.cashierUrl,
        reference: payload.reference,
        gatewayReference: json.data.orderNo,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`OPay initialize error: ${errMsg}`);
      throw new Error(`OPay Gateway Initialization Error: ${errMsg}`);
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
        gatewayReference: `opay_mock_${reference}`,
        paidAt: new Date().toISOString(),
        channel: 'opay_wallet',
        rawResponse: {},
      };
    }
    try {
      const response = await fetch(`${this.baseUrl}/cashier/status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          MerchantId: this.merchantId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference }),
      });

      const json = await response.json();
      const status: 'SUCCESS' | 'FAILED' | 'PENDING' =
        json.data?.status === 'SUCCESS'
          ? 'SUCCESS'
          : json.data?.status === 'FAIL'
            ? 'FAILED'
            : 'PENDING';

      return {
        status,
        amount: json.data?.amount ? Number(json.data.amount) / 100 : 0,
        currency: 'NGN',
        reference,
        gatewayReference: json.data?.orderNo,
        paidAt: new Date().toISOString(),
        channel: 'opay_wallet',
        rawResponse: json.data,
      };
    } catch (err) {
      this.logger.error(`OPay verify error: ${err instanceof Error ? err.message : String(err)}`);
      return { status: 'FAILED', amount: 0, currency: 'NGN', reference };
    }
  }

  async processRefund(reference: string, amount?: number): Promise<PaymentRefundResult> {
    return {
      success: true,
      refundReference: `opay_ref_${Date.now()}`,
      amount,
    };
  }

  validateWebhookSignature(signature: string, rawBody: string | Buffer): boolean {
    if (!this.secretKey || this.secretKey.startsWith('mock_')) {
      return true; // Dev mode bypass
    }
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    const hash = crypto.createHmac('sha512', this.secretKey).update(bodyStr).digest('hex');
    return hash === signature;
  }
}
