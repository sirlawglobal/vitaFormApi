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
  async handleOrderCreated(event: any) {
    const payload = event?.payload || event;
    if (!payload?.userId) {
      this.logger.warn(`Skipping ${DOMAIN_EVENTS.ORDER_CREATED} notification due to missing userId`);
      return;
    }
    this.logger.log(`Handling ${DOMAIN_EVENTS.ORDER_CREATED} for user ${payload.userId}`);
    await this.notificationsService.send(
      payload.userId,
      NotificationType.ORDER,
      '🛒 Order Placed!',
      `Your order #${payload.orderNumber} for ₦${payload.amount?.toLocaleString() || payload.amount} has been received.`,
      { orderId: payload.orderId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.ORDER_CONFIRMED)
  async handleOrderConfirmed(event: any) {
    const payload = event?.payload || event;
    await this.notificationsService.send(
      payload.userId,
      NotificationType.ORDER,
      '✅ Order Confirmed',
      `Your order #${payload.orderNumber} has been confirmed and is being processed.`,
      { orderId: payload.orderId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.ORDER_SHIPPED)
  async handleOrderShipped(event: any) {
    const payload = event?.payload || event;
    await this.notificationsService.send(
      payload.userId,
      NotificationType.ORDER,
      '🚚 Order Shipped',
      `Your order #${payload.orderNumber} is on its way to you!`,
      { orderId: payload.orderId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.ORDER_DELIVERED)
  async handleOrderDelivered(event: any) {
    const payload = event?.payload || event;
    await this.notificationsService.send(
      payload.userId,
      NotificationType.ORDER,
      '📦 Order Delivered',
      `Your order #${payload.orderNumber} has been delivered. We hope you enjoy it! Please share your review.`,
      { orderId: payload.orderId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.ORDER_CANCELLED)
  async handleOrderCancelled(event: any) {
    const payload = event?.payload || event;
    await this.notificationsService.send(
      payload.userId,
      NotificationType.ORDER,
      '❌ Order Cancelled',
      `Your order #${payload.orderNumber} has been cancelled.`,
      { orderId: payload.orderId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.PAYMENT_COMPLETED)
  async handlePaymentCompleted(event: any) {
    const payload = event?.payload || event;
    await this.notificationsService.send(
      payload.userId,
      NotificationType.PAYMENT,
      '💳 Payment Successful',
      `Your payment of ₦${payload.amount?.toLocaleString() || payload.amount} was successful.`,
      { paymentId: payload.paymentId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.PAYMENT_FAILED)
  async handlePaymentFailed(event: any) {
    const payload = event?.payload || event;
    await this.notificationsService.send(
      payload.userId,
      NotificationType.PAYMENT,
      '⚠️ Payment Failed',
      `Your payment of ₦${payload.amount?.toLocaleString() || payload.amount} failed. Please try again.`,
      { paymentId: payload.paymentId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.REVIEW_APPROVED)
  async handleReviewApproved(event: any) {
    const payload = event?.payload || event;
    await this.notificationsService.send(
      payload.userId,
      NotificationType.REVIEW,
      '⭐ Review Published',
      'Your review has been approved and is now live!',
      { reviewId: payload.reviewId, productId: payload.productId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.USER_VERIFIED)
  async handleUserVerified(event: any) {
    const payload = event?.payload || event;
    if (!payload?.userId) return;
    this.logger.log(`Handling ${DOMAIN_EVENTS.USER_VERIFIED} for user ${payload.userId}`);
    await this.notificationsService.sendWelcomeAndRecentNotifications(payload.userId);
  }
}
