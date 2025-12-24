import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { WebhooksService, CreateWebhookDto, UpdateWebhookDto } from '../services/webhooks.service';

@Controller('api/v1/integrations/webhooks')
export class WebhooksController {
    constructor(private readonly webhooksService: WebhooksService) { }

    @Post()
    async create(@Body() dto: CreateWebhookDto) {
        return this.webhooksService.create(dto);
    }

    @Get()
    async findAll(@Query('tenantId') tenantId: string) {
        return this.webhooksService.findByTenant(tenantId);
    }

    @Get(':id')
    async findOne(
        @Query('tenantId') tenantId: string,
        @Param('id') id: string,
    ) {
        return this.webhooksService.findById(tenantId, id);
    }

    @Put(':id')
    async update(
        @Query('tenantId') tenantId: string,
        @Param('id') id: string,
        @Body() dto: UpdateWebhookDto,
    ) {
        return this.webhooksService.update(tenantId, id, dto);
    }

    @Delete(':id')
    async delete(
        @Query('tenantId') tenantId: string,
        @Param('id') id: string,
    ) {
        await this.webhooksService.delete(tenantId, id);
        return { success: true };
    }

    @Post(':id/regenerate-secret')
    async regenerateSecret(
        @Query('tenantId') tenantId: string,
        @Param('id') id: string,
    ) {
        return this.webhooksService.regenerateSecret(tenantId, id);
    }

    @Get(':id/logs')
    async getLogs(
        @Param('id') id: string,
        @Query('limit') limit?: string,
    ) {
        return this.webhooksService.getLogs(id, limit ? parseInt(limit, 10) : 50);
    }
}
