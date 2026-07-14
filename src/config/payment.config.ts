import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  provider: process.env.PAYMENT_PROVIDER ?? 'paystack',
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY ?? '',
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET ?? '',
    baseUrl: 'https://api.paystack.co',
  },
  flutterwave: {
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY ?? '',
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY ?? '',
    webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET ?? '',
    baseUrl: 'https://api.flutterwave.com/v3',
  },
  moniepoint: {
    apiKey: process.env.MONIEPOINT_API_KEY ?? '',
    webhookSecret: process.env.MONIEPOINT_WEBHOOK_SECRET ?? '',
  },
}));
