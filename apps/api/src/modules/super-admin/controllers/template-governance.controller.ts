
import { Controller, Get, Put, Body, UseGuards, Post, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { TemplateGovernanceService } from '../services/template-governance.service';
import { WhatsAppTemplatePolicy } from '../entities/whatsapp-template-policy.entity';

@Controller('admin/governance/templates')
@UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
export class TemplateGovernanceController {
    constructor(private readonly governanceService: TemplateGovernanceService) { }

    @Get('policy')
    async getPolicy() {
        return await this.governanceService.getPolicy();
    }

    @Put('policy')
    async updatePolicy(@Body() data: Partial<WhatsAppTemplatePolicy>) {
        return await this.governanceService.updatePolicy(data);
    }

    @Post('validate')
    async validateTemplate(
        @Body() body: { tenantId: string; template: any }
    ) {
        return await this.governanceService.validateTemplate(body.tenantId, body.template);
    }
    @Get('monitoring')
    async getTemplates(
        @Query('tenantId') tenantId?: string,
        @Query('status') status?: string,
        @Query('category') category?: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ) {
        return await this.governanceService.getTemplates({
            tenantId,
            status,
            category,
            limit: limit ? Number(limit) : 10,
            offset: offset ? Number(offset) : 0,
        });
    }
}
