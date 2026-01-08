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
    Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import {
    TemplateBuildersService,
    CreateAutomationTemplateDto,
    UpdateAutomationTemplateDto,
    CreateWhatsAppTemplateDto,
    UpdateWhatsAppTemplateDto,
    CreateEmailTemplateDto,
    UpdateEmailTemplateDto,
} from '../services/template-builders.service';

@Controller('super-admin/builders')
@UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
export class TemplateBuildersController {
    constructor(private readonly service: TemplateBuildersService) { }

    // ==================== STATS ====================

    @Get('stats')
    async getStats() {
        return this.service.getBuilderStats();
    }

    // ==================== AUTOMATION TEMPLATES ====================

    @Get('automation')
    async getAllAutomationTemplates(
        @Query('category') category?: string,
        @Query('isActive') isActive?: string,
    ) {
        const filters: any = {};
        if (category) filters.category = category;
        if (isActive !== undefined) filters.isActive = isActive === 'true';
        return this.service.getAllAutomationTemplates(filters);
    }

    @Get('automation/:id')
    async getAutomationTemplate(@Param('id') id: string) {
        return this.service.getAutomationTemplateById(id);
    }

    @Post('automation')
    async createAutomationTemplate(
        @Body() dto: CreateAutomationTemplateDto,
        @Req() req: any,
    ) {
        const createdBy = req.user?.id || req.user?.email;
        return this.service.createAutomationTemplate(dto, createdBy);
    }

    @Put('automation/:id')
    async updateAutomationTemplate(
        @Param('id') id: string,
        @Body() dto: UpdateAutomationTemplateDto,
    ) {
        return this.service.updateAutomationTemplate(id, dto);
    }

    @Delete('automation/:id')
    async deleteAutomationTemplate(@Param('id') id: string) {
        await this.service.deleteAutomationTemplate(id);
        return { success: true, message: 'Template deleted successfully' };
    }

    // ==================== WHATSAPP TEMPLATES ====================

    @Get('whatsapp')
    async getAllWhatsAppTemplates(
        @Query('category') category?: string,
        @Query('status') status?: string,
    ) {
        const filters: any = {};
        if (category) filters.category = category;
        if (status) filters.status = status;
        return this.service.getAllWhatsAppTemplates(filters);
    }

    @Get('whatsapp/:id')
    async getWhatsAppTemplate(@Param('id') id: string) {
        return this.service.getWhatsAppTemplateById(id);
    }

    @Post('whatsapp')
    async createWhatsAppTemplate(
        @Body() dto: CreateWhatsAppTemplateDto,
        @Req() req: any,
    ) {
        const createdBy = req.user?.id || req.user?.email;
        return this.service.createWhatsAppTemplate(dto, createdBy);
    }

    @Put('whatsapp/:id')
    async updateWhatsAppTemplate(
        @Param('id') id: string,
        @Body() dto: UpdateWhatsAppTemplateDto,
    ) {
        return this.service.updateWhatsAppTemplate(id, dto);
    }

    @Delete('whatsapp/:id')
    async deleteWhatsAppTemplate(@Param('id') id: string) {
        try {
            await this.service.deleteWhatsAppTemplate(id);
            return { success: true, message: 'Template deleted successfully' };
        } catch (error) {
            console.error('Error deleting WhatsApp template:', error);
            throw error;
        }
    }

    // ==================== EMAIL TEMPLATES ====================

    @Get('email')
    async getAllEmailTemplates(
        @Query('category') category?: string,
        @Query('status') status?: string,
    ) {
        const filters: any = {};
        if (category) filters.category = category;
        if (status) filters.status = status;
        return this.service.getAllEmailTemplates(filters);
    }

    @Get('email/:id')
    async getEmailTemplate(@Param('id') id: string) {
        return this.service.getEmailTemplateById(id);
    }

    @Post('email')
    async createEmailTemplate(
        @Body() dto: CreateEmailTemplateDto,
        @Req() req: any,
    ) {
        const createdBy = req.user?.id || req.user?.email;
        return this.service.createEmailTemplate(dto, createdBy);
    }

    @Put('email/:id')
    async updateEmailTemplate(
        @Param('id') id: string,
        @Body() dto: UpdateEmailTemplateDto,
    ) {
        return this.service.updateEmailTemplate(id, dto);
    }

    @Delete('email/:id')
    async deleteEmailTemplate(@Param('id') id: string) {
        await this.service.deleteEmailTemplate(id);
        return { success: true, message: 'Template deleted successfully' };
    }
}

// Controller for users to access active templates (read-only)
@Controller('templates/library')
export class TemplateLibraryController {
    constructor(private readonly service: TemplateBuildersService) { }

    @Get('automation')
    async getAutomationTemplates(@Query('category') category?: string) {
        return this.service.getAllAutomationTemplates({ category, isActive: true });
    }

    @Get('automation/:id')
    async getAutomationTemplate(@Param('id') id: string) {
        const template = await this.service.getAutomationTemplateById(id);
        if (!template.isActive) {
            throw new Error('Template not available');
        }
        await this.service.incrementAutomationUsage(id);
        return template;
    }

    @Get('whatsapp')
    async getWhatsAppTemplates(@Query('category') category?: string) {
        return this.service.getAllWhatsAppTemplates({ category, status: 'active' });
    }

    @Get('whatsapp/:id')
    async getWhatsAppTemplate(@Param('id') id: string) {
        const template = await this.service.getWhatsAppTemplateById(id);
        if (template.status !== 'active') {
            throw new Error('Template not available');
        }
        await this.service.incrementWhatsAppUsage(id);
        return template;
    }

    @Get('email')
    async getEmailTemplates(@Query('category') category?: string) {
        return this.service.getAllEmailTemplates({ category, status: 'active' });
    }

    @Get('email/:id')
    async getEmailTemplate(@Param('id') id: string) {
        const template = await this.service.getEmailTemplateById(id);
        if (template.status !== 'active') {
            throw new Error('Template not available');
        }
        await this.service.incrementEmailUsage(id);
        return template;
    }
}
