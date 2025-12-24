import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService, DateRange } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    private parseDateRange(startDate?: string, endDate?: string): DateRange | undefined {
        if (startDate && endDate) {
            return {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            };
        }
        return undefined;
    }

    @Get('dashboard')
    async getDashboardMetrics(
        @Req() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { error: 'Tenant ID required' };
        }
        const dateRange = this.parseDateRange(startDate, endDate);
        return this.analyticsService.getDashboardMetrics(tenantId, dateRange);
    }

    @Get('campaigns')
    async getCampaignMetrics(
        @Req() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { error: 'Tenant ID required' };
        }
        const dateRange = this.parseDateRange(startDate, endDate);
        return this.analyticsService.getCampaignMetrics(tenantId, dateRange);
    }

    @Get('automations')
    async getAutomationMetrics(
        @Req() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { error: 'Tenant ID required' };
        }
        const dateRange = this.parseDateRange(startDate, endDate);
        return this.analyticsService.getAutomationMetrics(tenantId, dateRange);
    }

    @Get('channels')
    async getChannelMetrics(
        @Req() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { error: 'Tenant ID required' };
        }
        const dateRange = this.parseDateRange(startDate, endDate);
        return this.analyticsService.getChannelMetrics(tenantId, dateRange);
    }

    @Get('messages/weekly')
    async getWeeklyMessageStats(@Req() req: any) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { error: 'Tenant ID required' };
        }
        return this.analyticsService.getWeeklyMessageStats(tenantId);
    }

    @Get('revenue')
    async getRevenueMetrics(
        @Req() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { error: 'Tenant ID required' };
        }
        const dateRange = this.parseDateRange(startDate, endDate);
        return this.analyticsService.getRevenueMetrics(tenantId, dateRange);
    }
}
