/**
 * Domain event names — single source of truth.
 * Used by OutboxService, RabbitMQ consumers, and event handlers.
 */
export const DOMAIN_EVENTS = {
  // ── User Events ────────────────────────────────────────────
  USER_REGISTERED: 'UserRegistered',
  USER_VERIFIED: 'UserVerified',
  USER_PROFILE_UPDATED: 'UserProfileUpdated',
  USER_PASSWORD_CHANGED: 'UserPasswordChanged',
  USER_DEACTIVATED: 'UserDeactivated',

  // ── Order Events ───────────────────────────────────────────
  ORDER_CREATED: 'OrderCreated',
  ORDER_CONFIRMED: 'OrderConfirmed',
  ORDER_PROCESSING: 'OrderProcessing',
  ORDER_SHIPPED: 'OrderShipped',
  ORDER_DELIVERED: 'OrderDelivered',
  ORDER_CANCELLED: 'OrderCancelled',
  ORDER_REFUNDED: 'OrderRefunded',

  // ── Payment Events ─────────────────────────────────────────
  PAYMENT_INITIATED: 'PaymentInitiated',
  PAYMENT_COMPLETED: 'PaymentCompleted',
  PAYMENT_FAILED: 'PaymentFailed',
  PAYMENT_REFUNDED: 'PaymentRefunded',

  // ── Inventory Events ───────────────────────────────────────
  STOCK_RESERVED: 'StockReserved',
  STOCK_RELEASED: 'StockReleased',
  STOCK_DEPLETED: 'StockDepleted',
  STOCK_RESTOCKED: 'StockRestocked',

  // ── Product Events ─────────────────────────────────────────
  PRODUCT_CREATED: 'ProductCreated',
  PRODUCT_UPDATED: 'ProductUpdated',
  PRODUCT_DELETED: 'ProductDeleted',
  PRODUCT_STATUS_CHANGED: 'ProductStatusChanged',

  // ── Review Events ──────────────────────────────────────────
  REVIEW_SUBMITTED: 'ReviewSubmitted',
  REVIEW_APPROVED: 'ReviewApproved',
  REVIEW_REJECTED: 'ReviewRejected',

  // ── Warranty Events ────────────────────────────────────────
  WARRANTY_REGISTERED: 'WarrantyRegistered',
  WARRANTY_EXPIRING: 'WarrantyExpiring',
  WARRANTY_CLAIM_SUBMITTED: 'WarrantyClaimSubmitted',
  WARRANTY_CLAIM_RESOLVED: 'WarrantyClaimResolved',

  // ── Recommendation Events ──────────────────────────────────
  RECOMMENDATION_GENERATED: 'RecommendationGenerated',
  RECOMMENDATION_REQUESTED: 'RecommendationRequested',

  // ── Notification Events ────────────────────────────────────
  NOTIFICATION_SENT: 'NotificationSent',

  // ── Article Events ─────────────────────────────────────────
  ARTICLE_PUBLISHED: 'ArticlePublished',
} as const;

export type DomainEvent = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];
