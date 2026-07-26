import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  defaultProvider: process.env.PAYMENT_DEFAULT_PROVIDER ?? 'paystack',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? '',
  paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET ?? '',
  flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY ?? '',
  flutterwavePublicKey: process.env.FLUTTERWAVE_PUBLIC_KEY ?? '',
  flutterwaveWebhookHash: process.env.FLUTTERWAVE_WEBHOOK_HASH ?? '',
  moniepointApiKey: process.env.MONIEPOINT_API_KEY ?? '',
  moniepointWebhookSecret: process.env.MONIEPOINT_WEBHOOK_SECRET ?? '',
  opayMerchantId: process.env.OPAY_MERCHANT_ID ?? '',
  opaySecretKey: process.env.OPAY_SECRET_KEY ?? '',
}));
