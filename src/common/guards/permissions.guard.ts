import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/roles.decorator';
import { Permission } from '../constants/permissions.constants';
import { SessionData } from '../types/session.types';

/**
 * Enforces fine-grained permission checks.
 * Checks if the user's session contains every permission required by @RequirePermissions(...).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const session: SessionData = request.session;

    if (!session || !Array.isArray(session.permissions)) {
      throw new ForbiddenException('Access denied: no permissions found in session');
    }

    const userPermissions = session.permissions;
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAllPermissions) {
      const missing = requiredPermissions.filter((p) => !userPermissions.includes(p));
      throw new ForbiddenException(
        `Access denied: missing required permissions [${missing.join(', ')}]`,
      );
    }

    return true;
  }
}
