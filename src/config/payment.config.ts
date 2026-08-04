import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  defaultProvider: process.env.PAYMENT_DEFAULT_PROVIDER ?? 'paystack',
  paystackSecretKey:
    process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_SECRET_KEY !== 'placeholder'
      ? process.env.PAYSTACK_SECRET_KEY
      : 'sk_test_117ddce6c2abe2d6a3b481d714d569b045b7858b',
  paystackPublicKey:
    process.env.PAYSTACK_PUBLIC_KEY && process.env.PAYSTACK_PUBLIC_KEY !== 'placeholder'
      ? process.env.PAYSTACK_PUBLIC_KEY
      : 'pk_test_3ef0a34c1128110585ad85d6d34ac31f8d177bd9',
  paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET ?? '',
  flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY ?? '',
  flutterwavePublicKey: process.env.FLUTTERWAVE_PUBLIC_KEY ?? '',
  flutterwaveWebhookHash: process.env.FLUTTERWAVE_WEBHOOK_HASH ?? '',
  moniepointApiKey: process.env.MONIEPOINT_API_KEY ?? '',
  moniepointWebhookSecret: process.env.MONIEPOINT_WEBHOOK_SECRET ?? '',
  opayMerchantId: process.env.OPAY_MERCHANT_ID ?? '',
  opaySecretKey: process.env.OPAY_SECRET_KEY ?? '',
}));
