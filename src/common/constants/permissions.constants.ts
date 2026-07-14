/**
 * Fine-grained permission constants for RBAC.
 * Format: resource:action
 */
export const PERMISSIONS = {
  // Products
  PRODUCTS_READ: 'products:read',
  PRODUCTS_WRITE: 'products:write',
  PRODUCTS_DELETE: 'products:delete',

  // Orders
  ORDERS_READ_OWN: 'orders:read:own',
  ORDERS_READ_ALL: 'orders:read:all',
  ORDERS_WRITE: 'orders:write',
  ORDERS_STATUS_UPDATE: 'orders:status:update',

  // Users
  USERS_READ_OWN: 'users:read:own',
  USERS_READ_ALL: 'users:read:all',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  USERS_ROLE_CHANGE: 'users:role:change',

  // Inventory
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',

  // Reviews
  REVIEWS_MODERATE: 'reviews:moderate',

  // Payments
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_REFUND: 'payments:refund',

  // Analytics
  ANALYTICS_READ: 'analytics:read',

  // Admin
  ADMIN_ACCESS: 'admin:access',
  SETTINGS_WRITE: 'settings:write',

  // Support
  SUPPORT_READ: 'support:read',
  SUPPORT_WRITE: 'support:write',
  SUPPORT_CLOSE: 'support:close',

  // Dealers
  DEALERS_WRITE: 'dealers:write',

  // Notifications
  NOTIFICATIONS_SEND_BULK: 'notifications:send:bulk',

  // Promotions
  PROMOTIONS_WRITE: 'promotions:write',

  // Warranty
  WARRANTY_MODERATE: 'warranty:moderate',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Default permission sets by role */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  customer: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.ORDERS_READ_OWN,
    PERMISSIONS.USERS_READ_OWN,
    PERMISSIONS.USERS_WRITE,
  ],
  support: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.ORDERS_READ_ALL,
    PERMISSIONS.USERS_READ_ALL,
    PERMISSIONS.SUPPORT_READ,
    PERMISSIONS.SUPPORT_WRITE,
    PERMISSIONS.SUPPORT_CLOSE,
  ],
  dealer: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.ORDERS_READ_OWN,
  ],
  admin: Object.values(PERMISSIONS) as Permission[],
};
