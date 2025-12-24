import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AuditAction, ResourceType } from './audit-log.entity';
import { Reflector } from '@nestjs/core';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogOptions {
    action: AuditAction;
    resourceType: ResourceType;
    getResourceId?: (request: any, response: any) => string;
    getResourceName?: (request: any, response: any) => string;
    getDescription?: (request: any, response: any) => string;
    getPreviousValues?: (request: any) => Record<string, any>;
    skip?: (request: any) => boolean;
}

export function AuditLog(options: AuditLogOptions) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        Reflect.defineMetadata(AUDIT_LOG_KEY, options, target, key);
        return descriptor;
    };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(
        private readonly auditService: AuditService,
        private readonly reflector: Reflector,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const handler = context.getHandler();

        const auditOptions = this.reflector.get<AuditLogOptions>(
            AUDIT_LOG_KEY,
            handler,
        );

        if (!auditOptions) {
            return next.handle();
        }

        if (auditOptions.skip && auditOptions.skip(request)) {
            return next.handle();
        }

        const startTime = Date.now();
        const previousValues = auditOptions.getPreviousValues?.(request);

        return next.handle().pipe(
            tap({
                next: async (response) => {
                    try {
                        const tenantId = request.user?.tenantId || request.query?.tenantId || request.body?.tenantId;

                        if (!tenantId) return;

                        const resourceId = auditOptions.getResourceId?.(request, response) ||
                            request.params?.id ||
                            response?.id;
                        const resourceName = auditOptions.getResourceName?.(request, response) ||
                            response?.name ||
                            response?.title;
                        const description = auditOptions.getDescription?.(request, response) ||
                            `${auditOptions.action} ${auditOptions.resourceType}`;

                        await this.auditService.log({
                            tenantId,
                            userId: request.user?.id,
                            userEmail: request.user?.email,
                            action: auditOptions.action,
                            resourceType: auditOptions.resourceType,
                            resourceId,
                            resourceName,
                            previousValues,
                            newValues: auditOptions.action === AuditAction.UPDATE ? request.body : undefined,
                            ipAddress: this.getClientIp(request),
                            userAgent: request.headers['user-agent'],
                            metadata: {
                                method: request.method,
                                path: request.path,
                                duration: Date.now() - startTime,
                            },
                            description,
                        });
                    } catch (error) {
                        console.error('Failed to log audit event:', error);
                    }
                },
                error: (error) => {
                    // Optionally log failed attempts
                },
            }),
        );
    }

    private getClientIp(request: any): string {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        return request.ip || request.connection?.remoteAddress || '';
    }
}
