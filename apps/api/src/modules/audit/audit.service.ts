import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, ILike } from 'typeorm';
import { AuditLog, AuditAction, ResourceType } from './audit-log.entity';

export interface CreateAuditLogDto {
    tenantId: string;
    userId?: string;
    userEmail?: string;
    action: AuditAction;
    resourceType: ResourceType;
    resourceId?: string;
    resourceName?: string;
    previousValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    description?: string;
}

export interface AuditLogQueryDto {
    tenantId: string;
    userId?: string;
    action?: AuditAction;
    resourceType?: ResourceType;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
}

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogRepository: Repository<AuditLog>,
    ) { }

    async log(dto: CreateAuditLogDto): Promise<AuditLog> {
        const auditLog = this.auditLogRepository.create(dto);
        return this.auditLogRepository.save(auditLog);
    }

    async findAll(query: AuditLogQueryDto): Promise<{
        data: AuditLog[];
        total: number;
        page: number;
        limit: number;
    }> {
        const {
            tenantId,
            userId,
            action,
            resourceType,
            resourceId,
            startDate,
            endDate,
            search,
            page = 1,
            limit = 50
        } = query;

        const where: FindOptionsWhere<AuditLog> = { tenantId };

        if (userId) where.userId = userId;
        if (action) where.action = action;
        if (resourceType) where.resourceType = resourceType;
        if (resourceId) where.resourceId = resourceId;

        if (startDate && endDate) {
            where.createdAt = Between(startDate, endDate);
        }

        if (search) {
            where.description = ILike(`%${search}%`);
        }

        const [data, total] = await this.auditLogRepository.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { data, total, page, limit };
    }

    async findById(tenantId: string, id: string): Promise<AuditLog | null> {
        return this.auditLogRepository.findOne({
            where: { id, tenantId },
        });
    }

    async getStats(tenantId: string, startDate: Date, endDate: Date): Promise<{
        totalLogs: number;
        byAction: Record<string, number>;
        byResourceType: Record<string, number>;
        byUser: { userId: string; userEmail: string; count: number }[];
    }> {
        const logs = await this.auditLogRepository.find({
            where: {
                tenantId,
                createdAt: Between(startDate, endDate),
            },
            select: ['action', 'resourceType', 'userId', 'userEmail'],
        });

        const byAction: Record<string, number> = {};
        const byResourceType: Record<string, number> = {};
        const userMap = new Map<string, { userEmail: string; count: number }>();

        for (const log of logs) {
            byAction[log.action] = (byAction[log.action] || 0) + 1;
            byResourceType[log.resourceType] = (byResourceType[log.resourceType] || 0) + 1;

            if (log.userId) {
                const existing = userMap.get(log.userId);
                if (existing) {
                    existing.count++;
                } else {
                    userMap.set(log.userId, { userEmail: log.userEmail || '', count: 1 });
                }
            }
        }

        const byUser = Array.from(userMap.entries())
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalLogs: logs.length,
            byAction,
            byResourceType,
            byUser,
        };
    }

    async exportToJson(tenantId: string, startDate: Date, endDate: Date): Promise<AuditLog[]> {
        return this.auditLogRepository.find({
            where: {
                tenantId,
                createdAt: Between(startDate, endDate),
            },
            order: { createdAt: 'DESC' },
        });
    }

    async deleteOldLogs(tenantId: string, retentionDays: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await this.auditLogRepository
            .createQueryBuilder()
            .delete()
            .where('tenantId = :tenantId', { tenantId })
            .andWhere('createdAt < :cutoffDate', { cutoffDate })
            .execute();

        return result.affected || 0;
    }
}
