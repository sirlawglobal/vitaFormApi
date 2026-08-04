import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PaymentsRepository } from './payments.repository';
import { PaymentProviderFactory } from '../../infrastructure/payment/factories/payment-provider.factory';
import { OrdersService } from '../orders/orders.service';
import { OrdersRepository } from '../orders/orders.repository';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { UpdateGatewaySettingsDto } from './dto/update-gateway-settings.dto';
import { OrderStatus, PaymentStatus } from '../orders/enums/order-status.enum';
import { PaymentDocument } from './payments.schema';
import { ERROR_CODES } from '../../common/constants/error-codes.constants';
import { BusinessException } from '../../common/exceptions/business.exception';

const GATEWAY_SETTINGS_KEY = 'settings:payment_gateways';

export interface GatewaySettings {
  defaultProvider: string;
  enabledProviders: string[];
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentProviderFactory: PaymentProviderFactory,
    private readonly ordersService: OrdersService,
    private readonly ordersRepository: OrdersRepository,
    private readonly outboxService: OutboxService,
    private readonly cacheService: CacheService,
  ) {}

  async getGatewaySettings(): Promise<GatewaySettings> {
    const cached = await this.cacheService.get<GatewaySettings>(GATEWAY_SETTINGS_KEY);
    if (cached) return cached;

    const defaultSettings: GatewaySettings = {
      defaultProvider: 'paystack',
      enabledProviders: ['paystack', 'flutterwave', 'moniepoint'],
    };
    await this.cacheService.set(GATEWAY_SETTINGS_KEY, defaultSettings);
    return defaultSettings;
  }

  async updateGatewaySettings(dto: UpdateGatewaySettingsDto): Promise<GatewaySettings> {
    const supported = this.paymentProviderFactory.getSupportedProviders();
    if (!supported.includes(dto.defaultProvider.toLowerCase())) {
      throw new BusinessException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `Provider '${dto.defaultProvider}' is not supported. Supported: ${supported.join(', ')}`,
      });
    }

    const settings: GatewaySettings = {
      defaultProvider: dto.defaultProvider.toLowerCase(),
      enabledProviders: (dto.enabledProviders && dto.enabledProviders.length > 0
        ? dto.enabledProviders
        : supported
      ).map((p) => p.toLowerCase()),
    };

    await this.cacheService.set(GATEWAY_SETTINGS_KEY, settings);
    this.logger.log(`Admin updated active default payment gateway to [${settings.defaultProvider}]`);
    return settings;
  }

  async initializePayment(
    userId: string,
    dto: InitializePaymentDto,
    userEmail: string,
  ): Promise<{ authorizationUrl: string; paymentRef: string; orderNumber: string }> {
    // 1. Check if Order exists for checkoutRef
    let order = await this.ordersRepository.findByCheckoutRef(dto.checkoutRef);

    if (!order) {
      throw new NotFoundException(
        `Order associated with checkout authorization ref '${dto.checkoutRef}' not found. Please initiate checkout first.`,
      );
    }

    // Dynamic Admin Gateway Resolution
    const settings = await this.getGatewaySettings();
    const providerName =
      dto.provider || order.paymentSummary.paymentMethod || settings.defaultProvider;

    const strategy = this.paymentProviderFactory.getProvider(providerName);

    // 2. Generate unique internal payment reference (adding timestamp suffix for global uniqueness)
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const paymentRef = `PAY-${new Date().getFullYear()}-${randomCode}-${Date.now().toString().slice(-6)}`;

    const frontendUrl = process.env.FRONTEND_URL || 'https://vitaform-store.vercel.app';
    const callbackUrl = `${frontendUrl}/account/orders?paymentRef=${paymentRef}`;

    // 3. Initialize Gateway Session
    const initResult = await strategy.initializePayment({
      email: userEmail,
      amount: order.paymentSummary.totalAmount,
      currency: 'NGN',
      reference: paymentRef,
      callbackUrl,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        checkoutRef: dto.checkoutRef,
        userId,
      },
    });

    // 4. Save Payment Document
    await this.paymentsRepository.create({
      paymentRef,
      checkoutRef: dto.checkoutRef,
      orderId: order._id as Types.ObjectId,
      orderNumber: order.orderNumber,
      userId: new Types.ObjectId(userId),
      provider: strategy.providerName,
      amount: order.paymentSummary.totalAmount,
      currency: 'NGN',
      status: PaymentStatus.PENDING,
      authorizationUrl: initResult.authorizationUrl,
      gatewayReference: initResult.gatewayReference,
    });

    this.logger.log(
      `Initialized payment [${paymentRef}] via provider [${strategy.providerName}] for Order [${order.orderNumber}]`,
    );

    return {
      authorizationUrl: initResult.authorizationUrl,
      paymentRef,
      orderNumber: order.orderNumber,
    };
  }

  async verifyPayment(paymentRef: string): Promise<PaymentDocument> {
    const payment = await this.paymentsRepository.findByRef(paymentRef);
    if (!payment) {
      throw new NotFoundException(`Payment record for reference '${paymentRef}' not found`);
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return payment; // Idempotent check
    }

    const strategy = this.paymentProviderFactory.getProvider(payment.provider);
    const verifyResult = await strategy.verifyPayment(paymentRef);

    if (verifyResult.status === 'SUCCESS') {
      // 1. Update Payment record status
      const updatedPayment = await this.paymentsRepository.updateStatus(
        paymentRef,
        PaymentStatus.SUCCESS,
        verifyResult.gatewayReference,
        verifyResult.rawResponse,
      );

      // 2. Update Order paymentStatus to SUCCESS
      await this.ordersRepository.updatePaymentStatus(
        payment.orderId.toString(),
        PaymentStatus.SUCCESS,
        paymentRef,
      );

      // 3. Transition Order status PENDING -> CONFIRMED
      try {
        await this.ordersService.updateOrderStatus(
          payment.orderId.toString(),
          {
            status: OrderStatus.CONFIRMED,
            note: `Payment confirmed via ${payment.provider} (Ref: ${paymentRef})`,
          },
          'system_payment_webhook',
        );
      } catch (err) {
        this.logger.warn(`Order status update warning: ${err instanceof Error ? err.message : String(err)}`);
      }

      // 4. Emit PaymentSuccess Outbox Event for Notification System
      await this.outboxService.saveEvent({
        aggregateType: 'Payment',
        aggregateId: payment._id.toString(),
        eventType: 'PaymentSuccess',
        payload: {
          paymentRef,
          orderId: payment.orderId.toString(),
          orderNumber: payment.orderNumber,
          userId: payment.userId.toString(),
          amount: payment.amount,
          provider: payment.provider,
        },
      });

      this.logger.log(`Verified payment [${paymentRef}] as SUCCESS. Order [${payment.orderNumber}] confirmed.`);
      return updatedPayment!;
    } else {
      const updatedPayment = await this.paymentsRepository.updateStatus(
        paymentRef,
        PaymentStatus.FAILED,
        verifyResult.gatewayReference,
        verifyResult.rawResponse,
      );
      this.logger.warn(`Verified payment [${paymentRef}] as FAILED`);
      return updatedPayment!;
    }
  }

  async processWebhook(
    provider: string,
    signature: string,
    rawBody: string | Buffer,
    bodyPayload: any,
  ): Promise<{ success: boolean; message: string }> {
    const strategy = this.paymentProviderFactory.getProvider(provider);

    // 1. Cryptographic HMAC Signature Validation
    const isValid = strategy.validateWebhookSignature(signature, rawBody);
    if (!isValid) {
      this.logger.error(`Webhook HMAC signature verification failed for provider [${provider}]`);
      throw new BusinessException({
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Invalid payment webhook signature signature mismatch',
      });
    }

    // 2. Extract reference from provider payload
    let reference =
      bodyPayload?.data?.reference ||
      bodyPayload?.data?.tx_ref ||
      bodyPayload?.reference ||
      bodyPayload?.tx_ref;

    if (!reference) {
      this.logger.warn(`Webhook body missing reference parameter for provider [${provider}]`);
      return { success: true, message: 'Ignored webhook missing reference' };
    }

    // 3. Execute Verification & Order State Transition
    await this.verifyPayment(reference);

    return { success: true, message: `Webhook processed successfully for reference ${reference}` };
  }

  async getAdminPayments(page = 1, limit = 20) {
    return this.paymentsRepository.findAdminFiltered(page, limit);
  }
}
