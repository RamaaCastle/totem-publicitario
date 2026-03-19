import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Super admins bypass all permission checks
    if (user.isSuperAdmin) {
      return true;
    }

    const userPermissions = user.permissions;

    const hasAllPermissions = requiredPermissions.every((required) => {
      // Check exact permission OR manage permission for the resource
      const [resource] = required.split(':');
      return (
        userPermissions.includes(required) ||
        userPermissions.includes(`${resource}:manage`)
      );
    });

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
