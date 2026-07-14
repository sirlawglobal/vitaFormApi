import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { SessionData } from '../types/session.types';

/**
 * Enforces Role-Based Access Control (RBAC) based on the session's role attribute.
 * Must be used after SessionAuthGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const session: SessionData = request.session;

    if (!session || !session.role) {
      throw new ForbiddenException('Access denied: no user role found in session');
    }

    const hasRole = requiredRoles.includes(session.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: requires one of the following roles [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
