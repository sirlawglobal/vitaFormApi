import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './notifications.schema';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent(DOMAIN_EVENTS.ORDER_CREATED)
  async handleOrderCreated(event: { orderId: string; userId: string; amount: number; orderNumber: string }) {
    if (!event?.userId) {
      this.logger.warn(`Skipping ${DOMAIN_EVENTS.ORDER_CREATED} notification due to missing userId`);
      return;
    }
    this.logger.log(`Handling ${DOMAIN_EVENTS.ORDER_CREATED} for user ${event.userId}`);
    await this.notificationsService.send(
      event.userId,
      NotificationType.ORDER,
      '🛒 Order Placed!',
      `Your order #${event.orderNumber} for ₦${event.amount?.toLocaleString() || event.amount} has been received.`,
      { orderId: event.orderId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.ORDER_CONFIRMED)
  async handleOrderConfirmed(event: { orderId: string; userId: string; orderNumber: string }) {
    await this.notificationsService.send(
      event.userId,
      NotificationType.ORDER,
      '✅ Order Confirmed',
      `Your order #${event.orderNumber} has been confirmed and is being processed.`,
      { orderId: event.orderId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.ORDER_SHIPPED)
  async handleOrderShipped(event: { orderId: string; userId: string; orderNumber: string }) {
    await this.notificationsService.send(
      event.userId,
      NotificationType.ORDER,
      '🚚 Order Shipped',
      `Your order #${event.orderNumber} is on its way to you!`,
      { orderId: event.orderId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.ORDER_DELIVERED)
  async handleOrderDelivered(event: { orderId: string; userId: string; orderNumber: string }) {
    await this.notificationsService.send(
      event.userId,
      NotificationType.ORDER,
      '📦 Order Delivered',
      `Your order #${event.orderNumber} has been delivered. We hope you enjoy it! Please share your review.`,
      { orderId: event.orderId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.ORDER_CANCELLED)
  async handleOrderCancelled(event: { orderId: string; userId: string; orderNumber: string }) {
    await this.notificationsService.send(
      event.userId,
      NotificationType.ORDER,
      '❌ Order Cancelled',
      `Your order #${event.orderNumber} has been cancelled.`,
      { orderId: event.orderId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.PAYMENT_COMPLETED)
  async handlePaymentCompleted(event: { paymentId: string; userId: string; amount: number }) {
    await this.notificationsService.send(
      event.userId,
      NotificationType.PAYMENT,
      '💳 Payment Successful',
      `Your payment of ₦${event.amount?.toLocaleString() || event.amount} was successful.`,
      { paymentId: event.paymentId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.PAYMENT_FAILED)
  async handlePaymentFailed(event: { paymentId: string; userId: string; amount: number }) {
    await this.notificationsService.send(
      event.userId,
      NotificationType.PAYMENT,
      '⚠️ Payment Failed',
      `Your payment of ₦${event.amount?.toLocaleString() || event.amount} failed. Please try again.`,
      { paymentId: event.paymentId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.REVIEW_APPROVED)
  async handleReviewApproved(event: { reviewId: string; userId: string; productId: string }) {
    await this.notificationsService.send(
      event.userId,
      NotificationType.REVIEW,
      '⭐ Review Published',
      'Your review has been approved and is now live!',
      { reviewId: event.reviewId, productId: event.productId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.USER_VERIFIED)
  async handleUserVerified(event: { userId: string; email: string }) {
    if (!event?.userId) return;
    this.logger.log(`Handling ${DOMAIN_EVENTS.USER_VERIFIED} for user ${event.userId}`);
    await this.notificationsService.sendWelcomeAndRecentNotifications(event.userId);
  }
}
