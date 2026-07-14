import * as crypto from 'crypto';

/**
 * Generates a cryptographically secure session token.
 * 48 bytes = 64 hex characters — sufficient entropy for session IDs.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Generates a correlation ID for request tracing.
 */
export function generateCorrelationId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generates a short random ID (e.g., for order numbers).
 */
export function generateShortId(prefix = ''): string {
  const id = crypto.randomBytes(4).toString('hex').toUpperCase();
  return prefix ? `${prefix}-${id}` : id;
}
