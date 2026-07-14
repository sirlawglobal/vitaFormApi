/** RabbitMQ exchange names */
export const EXCHANGE_NAMES = {
  DOMAIN_EVENTS: 'vitaform.domain.events',
  DEAD_LETTER: 'vitaform.dead.letter',
} as const;

/** RabbitMQ routing keys — map domain events to routing keys */
export const ROUTING_KEYS = {
  // Orders
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUNDED: 'order.refunded',

  // Payments
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Users
  USER_REGISTERED: 'user.registered',
  USER_VERIFIED: 'user.verified',

  // Products
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',

  // Inventory
  STOCK_DEPLETED: 'inventory.depleted',
  STOCK_RESTOCKED: 'inventory.restocked',

  // Reviews
  REVIEW_SUBMITTED: 'review.submitted',

  // Warranty
  WARRANTY_REGISTERED: 'warranty.registered',
  WARRANTY_EXPIRING: 'warranty.expiring',

  // Recommendations
  RECOMMENDATION_REQUESTED: 'recommendation.requested',
} as const;

export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];
