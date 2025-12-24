import {
    Controller,
    Get,
    Query,
    Param,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuditService, AuditLogQueryDto } from './audit.service';
import { AuditAction, ResourceType } from './audit-log.entity';

// Placeholder for auth guard - replace with actual guard
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/audit-logs')
// @UseGuards(JwtAuthGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get()
    async findAll(
        @Query('tenantId') tenantId: string,
        @Query('userId') userId?: string,
        @Query('action') action?: AuditAction,
        @Query('resourceType') resourceType?: ResourceType,
        @Query('resourceId') resourceId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const query: AuditLogQueryDto = {
            tenantId,
            userId,
            action,
            resourceType,
            resourceId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 50,
        };

        return this.auditService.findAll(query);
    }

    @Get('stats')
    async getStats(
        @Query('tenantId') tenantId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.auditService.getStats(
            tenantId,
            new Date(startDate),
            new Date(endDate),
        );
    }

    @Get('export')
    async exportLogs(
        @Query('tenantId') tenantId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('format') format: 'json' | 'csv' = 'json',
        @Res() res: Response,
    ) {
        const logs = await this.auditService.exportToJson(
            tenantId,
            new Date(startDate),
            new Date(endDate),
        );

        if (format === 'csv') {
            const csvHeader = 'id,action,resourceType,resourceId,resourceName,userId,userEmail,ipAddress,description,createdAt\n';
            const csvRows = logs.map(log =>
                `${log.id},${log.action},${log.resourceType},${log.resourceId || ''},${log.resourceName || ''},${log.userId || ''},${log.userEmail || ''},${log.ipAddress || ''},"${log.description || ''}",${log.createdAt.toISOString()}`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${tenantId}.csv`);
            return res.send(csvHeader + csvRows);
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${tenantId}.json`);
        return res.json(logs);
    }

    @Get(':id')
    async findOne(
        @Query('tenantId') tenantId: string,
        @Param('id') id: string,
    ) {
        return this.auditService.findById(tenantId, id);
    }
}
