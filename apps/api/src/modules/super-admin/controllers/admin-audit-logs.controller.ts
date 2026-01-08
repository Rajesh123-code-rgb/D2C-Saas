import {
    Controller,
    Get,
    Param,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { Response } from 'express';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import {
    AdminAuditLogFilterDto,
    AdminAuditLogResponseDto,
    PaginatedAdminAuditLogsDto,
} from '../dto/admin-audit-log.dto';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';

@ApiTags('Admin Audit Logs')
@Controller('admin/audit-logs')
@UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
@ApiBearerAuth()
export class AdminAuditLogsController {
    constructor(
        @InjectRepository(AdminAuditLog)
        private readonly auditLogRepository: Repository<AdminAuditLog>,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get all admin audit logs with filters' })
    @ApiResponse({ status: 200, description: 'Paginated audit logs list' })
    async getAll(
        @Query() filter: AdminAuditLogFilterDto,
    ): Promise<PaginatedAdminAuditLogsDto> {
        const { action, resourceType, adminId, startDate, endDate, page = 1, limit = 20 } = filter;

        const queryBuilder = this.auditLogRepository.createQueryBuilder('log');

        if (action) {
            queryBuilder.andWhere('log.action = :action', { action });
        }

        if (resourceType) {
            queryBuilder.andWhere('log.resourceType = :resourceType', { resourceType });
        }

        if (adminId) {
            queryBuilder.andWhere('log.adminId = :adminId', { adminId });
        }

        if (startDate) {
            queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: new Date(startDate) });
        }

        if (endDate) {
            queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: new Date(endDate) });
        }

        if (filter.tenantId) {
            queryBuilder.andWhere('log.targetTenantId = :tenantId', { tenantId: filter.tenantId });
        }

        queryBuilder.orderBy('log.createdAt', 'DESC');
        queryBuilder.skip((page - 1) * limit).take(limit);

        const [logs, total] = await queryBuilder.getManyAndCount();

        const data: AdminAuditLogResponseDto[] = logs.map(log => ({
            id: log.id,
            adminId: log.adminId,
            adminEmail: log.adminEmail,
            adminName: log.adminName,
            action: log.action as any,
            resourceType: log.resourceType as any,
            resourceId: log.resourceId,
            resourceName: log.resourceName,
            targetTenantId: log.targetTenantId,
            targetTenantName: log.targetTenantName,
            previousValues: log.previousValues,
            newValues: log.newValues,
            description: log.description,
            ipAddress: log.ipAddress,
            success: log.success,
            createdAt: log.createdAt.toISOString(),
        }));

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get audit log by ID' })
    @ApiResponse({ status: 200, description: 'Audit log details' })
    async getById(@Param('id') id: string): Promise<AdminAuditLogResponseDto> {
        const log = await this.auditLogRepository.findOneOrFail({ where: { id } });

        return {
            id: log.id,
            adminId: log.adminId,
            adminEmail: log.adminEmail,
            adminName: log.adminName,
            action: log.action as any,
            resourceType: log.resourceType as any,
            resourceId: log.resourceId,
            resourceName: log.resourceName,
            targetTenantId: log.targetTenantId,
            targetTenantName: log.targetTenantName,
            previousValues: log.previousValues,
            newValues: log.newValues,
            description: log.description,
            ipAddress: log.ipAddress,
            success: log.success,
            createdAt: log.createdAt.toISOString(),
        };
    }

    @Get('export')
    @ApiOperation({ summary: 'Export audit logs' })
    @ApiResponse({ status: 200, description: 'Export URL' })
    async export(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('format') format: 'json' | 'csv' = 'json',
        @Res() res?: Response,
    ) {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('log');

        if (startDate) {
            queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: new Date(startDate) });
        }

        if (endDate) {
            queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: new Date(endDate) });
        }

        queryBuilder.orderBy('log.createdAt', 'DESC');
        queryBuilder.take(1000); // Limit export to 1000 records

        const logs = await queryBuilder.getMany();

        if (format === 'csv' && res) {
            const csvHeader = 'id,action,resourceType,resourceId,resourceName,adminId,adminEmail,adminName,ipAddress,description,success,createdAt\n';
            const csvRows = logs.map(log =>
                `${log.id},${log.action},${log.resourceType},${log.resourceId || ''},${log.resourceName || ''},${log.adminId || ''},${log.adminEmail || ''},${log.adminName || ''},${log.ipAddress || ''},"${log.description || ''}",${log.success},${log.createdAt.toISOString()}`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=admin-audit-logs.csv');
            return res.send(csvHeader + csvRows);
        }

        if (res) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=admin-audit-logs.json');
            return res.json(logs);
        }

        // If no response object, return URL (mock)
        return { url: '/api/admin/audit-logs/export?format=' + format };
    }
}
