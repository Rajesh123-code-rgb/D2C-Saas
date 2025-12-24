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
import { CampaignsService, CreateCampaignDto } from './campaigns.service';
import { CampaignStatus, CampaignType } from './entities/campaign.entity';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new campaign' })
    async create(
        @CurrentUser() user: any,
        @Body() dto: CreateCampaignDto,
    ) {
        return this.campaignsService.create(user.tenantId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all campaigns' })
    @ApiQuery({ name: 'status', required: false, enum: CampaignStatus })
    @ApiQuery({ name: 'type', required: false, enum: CampaignType })
    async findAll(
        @CurrentUser() user: any,
        @Query('status') status?: CampaignStatus,
        @Query('type') type?: CampaignType,
    ) {
        return this.campaignsService.findAll(user.tenantId, { status, type });
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get campaign statistics' })
    async getStats(@CurrentUser() user: any) {
        return this.campaignsService.getStats(user.tenantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get campaign by ID' })
    async findById(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.campaignsService.findById(user.tenantId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a campaign' })
    async update(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() updates: Partial<CreateCampaignDto>,
    ) {
        return this.campaignsService.update(user.tenantId, id, updates);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a campaign' })
    async delete(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        await this.campaignsService.delete(user.tenantId, id);
        return { success: true };
    }

    @Post(':id/schedule')
    @ApiOperation({ summary: 'Schedule a campaign for sending' })
    async schedule(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() body: { scheduledAt?: string },
    ) {
        const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;
        return this.campaignsService.schedule(user.tenantId, id, scheduledAt);
    }

    @Post(':id/send')
    @ApiOperation({ summary: 'Send campaign immediately' })
    async send(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.campaignsService.schedule(user.tenantId, id);
    }

    @Post(':id/pause')
    @ApiOperation({ summary: 'Pause a running campaign' })
    async pause(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.campaignsService.pause(user.tenantId, id);
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'Cancel a campaign' })
    async cancel(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.campaignsService.cancel(user.tenantId, id);
    }

    @Get(':id/executions')
    @ApiOperation({ summary: 'Get campaign execution logs' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false })
    async getExecutions(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('status') status?: string,
    ) {
        return this.campaignsService.getExecutions(user.tenantId, id, {
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20,
            status,
        });
    }
}
