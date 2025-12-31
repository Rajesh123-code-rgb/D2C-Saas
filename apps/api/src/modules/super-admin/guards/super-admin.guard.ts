import { Injectable, UnauthorizedException, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SuperAdminPermissions, SuperAdminStatus } from '../entities/super-admin-user.entity';

export const SUPER_ADMIN_PERMISSION_KEY = 'superAdminPermission';

export const RequireSuperAdminPermission = (...permissions: (keyof SuperAdminPermissions)[]) => {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
        Reflect.defineMetadata(SUPER_ADMIN_PERMISSION_KEY, permissions, descriptor?.value ?? target);
    };
};

@Injectable()
export class SuperAdminGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        // Passport populates request.user by default from the JWT strategy
        const admin = request.user;

        if (!admin) {
            throw new UnauthorizedException('Super Admin authentication required');
        }

        if (admin.status !== SuperAdminStatus.ACTIVE) {
            throw new UnauthorizedException('Super Admin account is not active');
        }

        // Check specific permissions if required
        const requiredPermissions = this.reflector.get<(keyof SuperAdminPermissions)[]>(
            SUPER_ADMIN_PERMISSION_KEY,
            context.getHandler(),
        );

        if (requiredPermissions && requiredPermissions.length > 0) {
            const effectivePermissions = admin.getEffectivePermissions();
            const hasAllPermissions = requiredPermissions.every(
                (permission) => effectivePermissions[permission] === true,
            );

            if (!hasAllPermissions) {
                throw new UnauthorizedException(
                    `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
                );
            }
        }

        return true;
    }
}
