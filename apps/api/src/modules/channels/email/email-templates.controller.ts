import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Req,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EmailService } from './email.service';
import { EmailTemplate } from './entities/email-template.entity';

@ApiTags('Email Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('email-templates')
export class EmailTemplatesController {
    private readonly logger = new Logger(EmailTemplatesController.name);

    constructor(private readonly emailService: EmailService) { }

    @Post()
    @ApiOperation({ summary: 'Create email template' })
    async createTemplate(@Req() req: any, @Body() body: any): Promise<EmailTemplate> {
        return this.emailService.createTemplate(req.user.tenantId, body);
    }

    @Get()
    @ApiOperation({ summary: 'Get all email templates' })
    async getTemplates(@Req() req: any): Promise<EmailTemplate[]> {
        return this.emailService.getTemplates(req.user.tenantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get email template by ID' })
    async getTemplate(@Req() req: any, @Param('id') id: string): Promise<EmailTemplate> {
        return this.emailService.getTemplate(req.user.tenantId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update email template' })
    async updateTemplate(
        @Req() req: any,
        @Param('id') id: string,
        @Body() body: any,
    ): Promise<EmailTemplate> {
        return this.emailService.updateTemplate(req.user.tenantId, id, body);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete email template' })
    async deleteTemplate(@Req() req: any, @Param('id') id: string): Promise<void> {
        return this.emailService.deleteTemplate(req.user.tenantId, id);
    }
}
