import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_KEYS } from '../../common/constants/cache-keys.constants';
import { generateSessionToken } from '../../common/utils/token.util';
import { User } from '../users/users.schema';
import { SessionData } from '../../common/types/session.types';

export interface ActiveSessionInfo {
  sessionToken: string;
  isCurrentSession: boolean;
  deviceId: string;
  devicePlatform: string;
  ip: string;
  userAgent: string;
  lastActivity: Date;
  createdAt: Date;
}

/**
 * Redis-Backed Session Service.
 * Eliminates JWT refresh tokens by storing multi-device session states inside Redis Hashes and Sets.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
  private readonly SESSION_MAX_DEVICES = 5;

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Creates a new session inside Redis and tracks it under the user's active devices set.
   * Enforces max 5 concurrent device sessions per account.
   */
  async createSession(
    user: User,
    headers: Record<string, string | string[] | undefined>,
    ip: string,
  ): Promise<{ sessionToken: string; expiresAt: Date; sessionData: SessionData }> {
    await this.enforceDeviceLimits(user._id.toString());

    const token = generateSessionToken();
    const sessionKey = CACHE_KEYS.session(token);
    const userSessionsKey = CACHE_KEYS.userSessions(user._id.toString());

    const deviceId = (headers['x-device-id'] as string) || 'unknown';
    const devicePlatform = (headers['x-device-platform'] as string) || 'web';
    const userAgent = (headers['user-agent'] as string) || 'unknown';
    const now = Date.now();

    const sessionData: Record<string, string> = {
      userId: user._id.toString(),
      role: user.role,
      permissions: JSON.stringify(user.permissions || []),
      email: user.email,
      deviceId,
      devicePlatform,
      ip,
      userAgent,
      lastActivity: now.toString(),
      createdAt: now.toString(),
    };

    // Store in hash with 7 day TTL and add to user's set
    await Promise.all([
      this.cacheService.hset(sessionKey, sessionData),
      this.cacheService.expire(sessionKey, this.SESSION_TTL_SECONDS),
      this.cacheService.sadd(userSessionsKey, token),
    ]);

    this.logger.log(`Created Redis session for user ${user._id} on platform [${devicePlatform}]`);

    const expiresAt = new Date(now + this.SESSION_TTL_SECONDS * 1000);
    return {
      sessionToken: token,
      expiresAt,
      sessionData: {
        userId: user._id.toString(),
        role: user.role,
        permissions: user.permissions || [],
        email: user.email,
        deviceId,
        devicePlatform,
        ip,
        userAgent,
        lastActivity: now,
        createdAt: now,
      },
    };
  }

  /**
   * Revokes a specific device session token.
   */
  async revokeSession(token: string): Promise<void> {
    const sessionKey = CACHE_KEYS.session(token);
    const rawSession = await this.cacheService.hgetall(sessionKey);

    if (rawSession && rawSession.userId) {
      const userSessionsKey = CACHE_KEYS.userSessions(rawSession.userId);
      await Promise.all([
        this.cacheService.del(sessionKey),
        this.cacheService.srem(userSessionsKey, token),
      ]);
      this.logger.log(`Revoked session ${token.substring(0, 12)}... for user ${rawSession.userId}`);
    } else {
      await this.cacheService.del(sessionKey);
    }
  }

  /**
   * O(1) multi-device wipe: terminates all active sessions across all devices for a user.
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const userSessionsKey = CACHE_KEYS.userSessions(userId);
    const tokens = await this.cacheService.smembers(userSessionsKey);

    if (tokens.length === 0) {
      return 0;
    }

    const sessionKeys = tokens.map((t) => CACHE_KEYS.session(t));
    await Promise.all([
      ...sessionKeys.map((key) => this.cacheService.del(key)),
      this.cacheService.del(userSessionsKey),
    ]);

    this.logger.log(`Wiped all ${tokens.length} active sessions for user ${userId}`);
    return tokens.length;
  }

  /**
   * Lists all active device sessions for a specific user.
   */
  async listUserSessions(userId: string, currentToken: string): Promise<ActiveSessionInfo[]> {
    const userSessionsKey = CACHE_KEYS.userSessions(userId);
    const tokens = await this.cacheService.smembers(userSessionsKey);

    if (tokens.length === 0) {
      return [];
    }

    const activeSessions: ActiveSessionInfo[] = [];
    for (const token of tokens) {
      const sessionKey = CACHE_KEYS.session(token);
      const raw = await this.cacheService.hgetall(sessionKey);

      // If key expired in Redis but is still in the set, clean it up
      if (!raw || !raw.userId) {
        await this.cacheService.srem(userSessionsKey, token);
        continue;
      }

      activeSessions.push({
        sessionToken: token,
        isCurrentSession: token === currentToken,
        deviceId: raw.deviceId || 'unknown',
        devicePlatform: raw.devicePlatform || 'web',
        ip: raw.ip || '0.0.0.0',
        userAgent: raw.userAgent || 'unknown',
        lastActivity: new Date(Number(raw.lastActivity || Date.now())),
        createdAt: new Date(Number(raw.createdAt || Date.now())),
      });
    }

    return activeSessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  /**
   * Revokes a specific remote device session belonging to the authenticated user.
   */
  async revokeRemoteSession(userId: string, targetToken: string): Promise<void> {
    const sessionKey = CACHE_KEYS.session(targetToken);
    const rawSession = await this.cacheService.hgetall(sessionKey);

    if (!rawSession || !rawSession.userId) {
      return; // already expired
    }

    if (rawSession.userId !== userId) {
      throw new ForbiddenException('Cannot revoke session belonging to another account');
    }

    await this.revokeSession(targetToken);
  }

  /**
   * Enforces max concurrent device limit by evicting the oldest session when exceeded.
   */
  private async enforceDeviceLimits(userId: string): Promise<void> {
    const userSessionsKey = CACHE_KEYS.userSessions(userId);
    const tokens = await this.cacheService.smembers(userSessionsKey);

    if (tokens.length < this.SESSION_MAX_DEVICES) {
      return;
    }

    const sessionsWithTime: { token: string; lastActivity: number }[] = [];
    for (const t of tokens) {
      const raw = await this.cacheService.hgetall(CACHE_KEYS.session(t));
      if (!raw || !raw.userId) {
        await this.cacheService.srem(userSessionsKey, t);
      } else {
        sessionsWithTime.push({
          token: t,
          lastActivity: Number(raw.lastActivity || 0),
        });
      }
    }

    if (sessionsWithTime.length >= this.SESSION_MAX_DEVICES) {
      sessionsWithTime.sort((a, b) => a.lastActivity - b.lastActivity);
      const oldest = sessionsWithTime[0];
      await this.revokeSession(oldest.token);
      this.logger.log(`Evicted oldest session ${oldest.token.substring(0, 8)}... to enforce max device limit for user ${userId}`);
    }
  }
}
