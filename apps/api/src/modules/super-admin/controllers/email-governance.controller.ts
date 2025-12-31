
import { Controller, Get, Put, Body, UseGuards, Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { EmailGovernanceService } from '../services/email-governance.service';
import { EmailTemplatePolicy } from '../entities/email-template-policy.entity';

@Controller('admin/governance/email')
@UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
export class EmailGovernanceController {
    constructor(private readonly governanceService: EmailGovernanceService) { }

    @Get()
    async getPolicy() {
        return await this.governanceService.getPolicy();
    }

    @Put()
    async updatePolicy(@Body() data: Partial<EmailTemplatePolicy>) {
        return await this.governanceService.updatePolicy(data);
    }

    @Post('validate')
    async validateEmail(
        @Body() body: { tenantId: string; email: any }
    ) {
        return await this.governanceService.validateEmail(body.tenantId, body.email);
    }
}
