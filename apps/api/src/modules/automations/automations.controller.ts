import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AutomationsService, CreateAutomationDto } from './automations.service';
import { AutomationTemplatesService } from './templates.service';
import { AutomationStatus, TriggerType } from './automation-rule.entity';

@ApiTags('Automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automations')
export class AutomationsController {
    constructor(
        private readonly automationsService: AutomationsService,
        private readonly templatesService: AutomationTemplatesService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new automation' })
    async create(
        @CurrentUser() user: any,
        @Body() dto: CreateAutomationDto,
    ) {
        return this.automationsService.create(user.tenantId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all automations' })
    @ApiQuery({ name: 'status', required: false, enum: AutomationStatus })
    @ApiQuery({ name: 'triggerType', required: false, enum: TriggerType })
    async findAll(
        @CurrentUser() user: any,
        @Query('status') status?: AutomationStatus,
        @Query('triggerType') triggerType?: TriggerType,
    ) {
        return this.automationsService.findAll(user.tenantId, { status, triggerType });
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get automation statistics' })
    async getStats(@CurrentUser() user: any) {
        return this.automationsService.getStats(user.tenantId);
    }

    @Get('templates')
    @ApiOperation({ summary: 'Get available automation templates' })
    async getTemplates() {
        return this.templatesService.getTemplates();
    }

    @Get('templates/:templateId')
    @ApiOperation({ summary: 'Get specific template configuration' })
    async getTemplateById(@Param('templateId') templateId: string) {
        return this.templatesService.getTemplateById(templateId);
    }

    @Post('templates/:templateId/install')
    @ApiOperation({ summary: 'Install an automation template' })
    async installTemplate(
        @CurrentUser() user: any,
        @Param('templateId') templateId: string,
    ) {
        return this.templatesService.installTemplate(user.tenantId, templateId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get automation by ID' })
    async findById(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.automationsService.findById(user.tenantId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update an automation' })
    async update(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() updates: Partial<CreateAutomationDto>,
    ) {
        return this.automationsService.update(user.tenantId, id, updates);
    }

    @Post(':id/activate')
    @ApiOperation({ summary: 'Activate an automation' })
    async activate(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.automationsService.activate(user.tenantId, id);
    }

    @Post(':id/pause')
    @ApiOperation({ summary: 'Pause an automation' })
    async pause(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.automationsService.pause(user.tenantId, id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete an automation' })
    async delete(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        await this.automationsService.delete(user.tenantId, id);
        return { success: true };
    }

    @Get(':id/logs')
    @ApiOperation({ summary: 'Get automation execution logs' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getLogs(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.automationsService.getLogs(user.tenantId, id, {
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20,
        });
    }
}
