export interface PaymentInitializePayload {
  email: string;
  amount: number; // In Naira (e.g. 50000 = NGN 50,000)
  currency?: string;
  reference: string; // Internal payment reference (PAY-2026-XXXXX)
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentInitializeResult {
  authorizationUrl: string;
  reference: string;
  gatewayReference?: string;
  accessCode?: string;
}

export interface PaymentVerifyResult {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amount: number;
  currency: string;
  reference: string;
  gatewayReference?: string;
  paidAt?: string;
  channel?: string;
  rawResponse?: Record<string, any>;
}

export interface PaymentRefundResult {
  success: boolean;
  refundReference?: string;
  amount?: number;
  message?: string;
}

export interface PaymentStrategy {
  readonly providerName: string;

  initializePayment(payload: PaymentInitializePayload): Promise<PaymentInitializeResult>;

  verifyPayment(reference: string): Promise<PaymentVerifyResult>;

  processRefund(reference: string, amount?: number): Promise<PaymentRefundResult>;

  validateWebhookSignature(signature: string, rawBody: string | Buffer): boolean;
}
