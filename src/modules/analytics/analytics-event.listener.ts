import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEventType } from './schemas/analytics-event.schema';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';

@Injectable()
export class AnalyticsEventListener {
  private readonly logger = new Logger(AnalyticsEventListener.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @OnEvent(DOMAIN_EVENTS.CART_ITEM_ADDED)
  async handleCartItemAdded(event: any) {
    this.logger.debug(`Tracking ADD_TO_CART analytics event for cart [${event.aggregateId}]`);
    const payload = event.payload || {};
    const user = payload.user;

    await this.analyticsService.trackEvent(
      {
        sessionId: payload.cartId || event.aggregateId,
        eventType: AnalyticsEventType.ADD_TO_CART,
        metadata: {
          sku: payload.sku,
          productName: payload.productName,
          price: payload.price,
          quantity: payload.quantity,
          isGuest: payload.isGuest,
        },
      },
      user ? { userId: user.userId, email: user.email, phone: user.phone } : undefined,
    );
  }

  @OnEvent(DOMAIN_EVENTS.CHECKOUT_INITIATED)
  async handleCheckoutInitiated(event: any) {
    this.logger.debug(`Tracking CHECKOUT_START analytics event for ref [${event.aggregateId}]`);
    const payload = event.payload || {};
    const user = payload.user;

    await this.analyticsService.trackEvent(
      {
        sessionId: payload.checkoutRef || event.aggregateId,
        eventType: AnalyticsEventType.CHECKOUT_START,
        metadata: {
          checkoutRef: payload.checkoutRef,
          totalAmount: payload.totalAmount,
          subTotal: payload.subTotal,
          itemCount: payload.itemCount,
          paymentMethod: payload.paymentMethod,
        },
      },
      user ? { userId: user.userId, email: user.email, phone: user.phone } : undefined,
    );
  }

  @OnEvent(DOMAIN_EVENTS.ORDER_CREATED)
  @OnEvent(DOMAIN_EVENTS.PAYMENT_COMPLETED)
  async handlePurchaseCompleted(event: any) {
    this.logger.debug(`Tracking PURCHASE analytics event for [${event.aggregateId}]`);
    const payload = event.payload || {};
    const user = payload.user;

    await this.analyticsService.trackEvent(
      {
        sessionId: payload.orderNumber || payload.checkoutRef || event.aggregateId,
        eventType: AnalyticsEventType.PURCHASE,
        metadata: {
          orderId: event.aggregateId,
          orderNumber: payload.orderNumber,
          totalAmount: payload.totalAmount,
          itemCount: payload.items?.length,
        },
      },
      user ? { userId: user.userId || payload.userId, email: user.email, phone: user.phone } : undefined,
    );
  }
}
