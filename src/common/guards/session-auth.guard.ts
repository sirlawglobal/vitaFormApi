import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CACHE_KEYS } from '../constants/cache-keys.constants';
import { SessionData } from '../types/session.types';
import { Role } from '../enums/role.enum';
import { ROLE_PERMISSIONS, Permission } from '../constants/permissions.constants';

/**
 * Enterprise Redis Session Authentication Guard.
 * Intercepts incoming requests, extracts X-Session-Token, validates against Redis hash,
 * attaches SessionData to request, and performs asynchronous non-blocking TTL/activity refresh.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  private readonly logger = new Logger(SessionAuthGuard.name);
  private readonly SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    const sessionKey = CACHE_KEYS.session(token);
    const rawSession = await this.cacheService.hgetall(sessionKey);

    if (!rawSession || Object.keys(rawSession).length === 0 || !rawSession.userId) {
      throw new UnauthorizedException('Invalid or expired session');
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
      ip: rawSession.ip || request.ip || '0.0.0.0',
      userAgent: rawSession.userAgent || request.headers['user-agent'] || 'unknown',
      lastActivity: Number(rawSession.lastActivity || Date.now()),
      createdAt: Number(rawSession.createdAt || Date.now()),
    };

    request.session = sessionData;
    request.sessionToken = token;
    request.user = sessionData;

    this.refreshSessionAsync(sessionKey);

    return true;
  }

  private extractTokenFromRequest(request: any): string | null {
    const headerToken = request.headers['x-session-token'];
    if (headerToken && typeof headerToken === 'string') {
      return headerToken.trim();
    }

    const authHeader = request.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }

    if (request.cookies && request.cookies['x-session-token']) {
      return request.cookies['x-session-token'];
    }

    return null;
  }

  private refreshSessionAsync(sessionKey: string): void {
    const now = Date.now().toString();
    Promise.all([
      this.cacheService.hset(sessionKey, { lastActivity: now }),
      this.cacheService.expire(sessionKey, this.SESSION_TTL_SECONDS),
    ]).catch((err) => {
      this.logger.warn(`Failed to async refresh session TTL for ${sessionKey}: ${err.message}`);
    });
  }
}
