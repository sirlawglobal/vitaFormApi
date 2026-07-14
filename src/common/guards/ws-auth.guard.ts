import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_KEYS } from '../constants/cache-keys.constants';
import { SessionData } from '../types/session.types';
import { Role } from '../enums/role.enum';
import { ROLE_PERMISSIONS, Permission } from '../constants/permissions.constants';

/**
 * WebSocket Authentication Guard.
 * Intercepts real-time socket connections or event handlers, extracts X-Session-Token
 * from client handshake headers/auth, validates against Redis hash, and attaches session data.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(private readonly cacheService: CacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`WebSocket authentication failed: missing token`);
      throw new WsException('Unauthorized: missing session token');
    }

    const sessionKey = CACHE_KEYS.session(token);
    const rawSession = await this.cacheService.hgetall(sessionKey);

    if (!rawSession || Object.keys(rawSession).length === 0 || !rawSession.userId) {
      this.logger.warn(`WebSocket authentication failed: invalid token ${token}`);
      throw new WsException('Unauthorized: invalid or expired session');
    }

    const role = (rawSession.role as Role) || Role.CUSTOMER;
    let permissions: Permission[] = [];
    try {
      permissions = rawSession.permissions ? JSON.parse(rawSession.permissions) : ROLE_PERMISSIONS[role] || [];
    } catch {
      permissions = ROLE_PERMISSIONS[role] || [];
    }

    const sessionData: SessionData = {
      userId: rawSession.userId,
      role,
      permissions,
      email: rawSession.email || '',
      deviceId: rawSession.deviceId || 'unknown',
      devicePlatform: rawSession.devicePlatform || 'web',
      ip: rawSession.ip || client.handshake?.address || '0.0.0.0',
      userAgent: rawSession.userAgent || client.handshake?.headers?.['user-agent'] || 'unknown',
      lastActivity: Number(rawSession.lastActivity || Date.now()),
      createdAt: Number(rawSession.createdAt || Date.now()),
    };

    client.data = client.data || {};
    client.data.session = sessionData;
    client.data.user = sessionData;

    return true;
  }

  private extractToken(client: any): string | null {
    if (client.handshake?.auth?.token) {
      return client.handshake.auth.token;
    }
    if (client.handshake?.headers?.['x-session-token']) {
      return client.handshake.headers['x-session-token'];
    }
    if (client.handshake?.query?.token) {
      return client.handshake.query.token;
    }
    return null;
  }
}
