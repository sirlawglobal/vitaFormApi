import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { Permission } from '../constants/permissions.constants';

export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';

/** Restrict route to specific roles */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Restrict route to users with specific permissions */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
