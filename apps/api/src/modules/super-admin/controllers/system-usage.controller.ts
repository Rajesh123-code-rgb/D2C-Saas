
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { SystemUsageService } from '../services/system-usage.service';

@Controller('admin/system-usage')
@UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
export class SystemUsageController {
    constructor(private readonly usageService: SystemUsageService) { }

    @Get('overview')
    async getOverview() {
        return {
            system: await this.usageService.getSystemStats(),
            activity: await this.usageService.getActivityStats(),
        };
    }

    @Get('database')
    async getDatabaseStats() {
        return await this.usageService.getDatabaseStats();
    }
}
