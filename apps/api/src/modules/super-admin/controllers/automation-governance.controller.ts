import { Controller, Get, Put, Post, Body, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { AutomationGovernanceService } from '../services/automation-governance.service';
import { AutomationPolicy } from '../entities/automation-policy.entity';
import { AutomationRule } from '../../automations/automation-rule.entity';

@Controller('admin/governance/automation')
@UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
export class AutomationGovernanceController {
    constructor(private governanceService: AutomationGovernanceService) { }

    @Get()
    async getPolicy() {
        return this.governanceService.getPolicy();
    }

    @Put()
    async updatePolicy(@Body() policy: Partial<AutomationPolicy>) {
        return this.governanceService.updatePolicy(policy);
    }

    @Post('validate')
    async validateAutomation(@Body() body: { tenantId: string; automation: Partial<AutomationRule> }) {
        return this.governanceService.validateAutomation(body.tenantId, body.automation);
    }
}
