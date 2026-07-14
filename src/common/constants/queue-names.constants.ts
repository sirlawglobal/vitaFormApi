/** BullMQ queue name constants */
export const QUEUE_NAMES = {
  NOTIFICATION: 'notification.queue',
  EMAIL: 'email.queue',
  SMS: 'sms.queue',
  RECOMMENDATION: 'recommendation.queue',
  ANALYTICS: 'analytics.queue',
  SEARCH: 'search.queue',
  PAYMENT: 'payment.queue',
  INVENTORY: 'inventory.queue',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** BullMQ job name constants */
export const JOB_NAMES = {
  // Notification
  SEND_PUSH: 'send-push',
  SEND_BULK_PUSH: 'send-bulk-push',

  // Email
  SEND_EMAIL: 'send-email',
  SEND_BULK_EMAIL: 'send-bulk-email',

  // SMS
  SEND_SMS: 'send-sms',
  SEND_OTP: 'send-otp',

  // Recommendation
  GENERATE_RECS: 'generate-recs',
  BATCH_RECS: 'batch-recs',

  // Analytics
  TRACK_EVENT: 'track-event',
  FLUSH_SESSION: 'flush-session',

  // Search
  INDEX_PRODUCT: 'index-product',
  REINDEX_ALL: 'reindex-all',

  // Payment
  VERIFY_PAYMENT: 'verify-payment',
  PROCESS_REFUND: 'process-refund',

  // Inventory
  RESERVE_STOCK: 'reserve-stock',
  RELEASE_STOCK: 'release-stock',
  LOW_STOCK_ALERT: 'low-stock-alert',
} as const;
