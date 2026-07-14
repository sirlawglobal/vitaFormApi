import { Role } from '../enums/role.enum';
import { Permission } from '../constants/permissions.constants';

/**
 * The shape of a session stored in Redis.
 * Deserialized from Redis hash on every authenticated request.
 */
export interface SessionData {
  userId: string;
  role: Role;
  permissions: Permission[];
  email: string;
  deviceId: string;
  devicePlatform: string;
  ip: string;
  userAgent: string;
  lastActivity: number; // Unix timestamp
  createdAt: number;    // Unix timestamp
}

/**
 * Extends Express Request to attach the authenticated session.
 */
export interface AuthenticatedRequest extends Request {
  session: SessionData;
  sessionToken: string;
  correlationId: string;
}
