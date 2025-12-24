import {
    Controller,
    Post,
    Body,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EmailService } from './email.service';

@ApiTags('Email')
@Controller('email')
export class EmailController {
    private readonly logger = new Logger(EmailController.name);

    constructor(private readonly emailService: EmailService) { }

    /**
     * Send an email
     */
    @Post('send')
    @ApiOperation({ summary: 'Send an email' })
    async sendEmail(
        @Body()
        body: {
            channelId: string;
            to: string;
            subject: string;
            text?: string;
            html?: string;
            cc?: string[];
            bcc?: string[];
        },
    ): Promise<any> {
        return this.emailService.sendEmail(body.channelId, {
            to: body.to,
            subject: body.subject,
            text: body.text,
            html: body.html,
            cc: body.cc,
            bcc: body.bcc,
        });
    }

    /**
     * Send a template email
     */
    @Post('send-template')
    @ApiOperation({ summary: 'Send a template email' })
    async sendTemplateEmail(
        @Body()
        body: {
            channelId: string;
            to: string;
            templateId: string;
            variables: Record<string, string>;
        },
    ): Promise<any> {
        return this.emailService.sendTemplateEmail(
            body.channelId,
            body.to,
            body.templateId,
            body.variables,
        );
    }

    /**
     * Process incoming email webhook
     */
    @Post('webhook')
    @ApiOperation({ summary: 'Process incoming email webhook' })
    async handleWebhook(
        @Body() body: any,
    ): Promise<{ status: string }> {
        try {
            // Extract recipient email from webhook data
            // Different email services use different field names
            const recipientEmail = body.to ||
                body.recipient ||
                body.envelope?.to?.[0] ||
                body.headers?.to;

            if (!recipientEmail) {
                this.logger.warn('No recipient email found in webhook payload');
                return { status: 'error' };
            }

            // Parse email address if it contains display name
            const emailMatch = recipientEmail.match(/<([^>]+)>/) || [null, recipientEmail];
            const cleanEmail = emailMatch[1] || recipientEmail;

            // Find channel by email in credentials
            const tenantId = await this.emailService.getTenantIdFromEmail(cleanEmail);

            if (!tenantId) {
                this.logger.warn(`No tenant found for recipient email: ${cleanEmail}`);
                return { status: 'error' };
            }

            await this.emailService.processIncomingEmail(body, tenantId);

            return { status: 'received' };
        } catch (error: any) {
            this.logger.error(`Webhook error: ${error.message}`, error.stack);
            return { status: 'error' };
        }
    }

    /**
     * Verify email configuration
     */
    @Post('verify')
    @ApiOperation({ summary: 'Verify email configuration' })
    async verifyConnection(): Promise<{ success: boolean }> {
        const success = await this.emailService.verifyConnection();
        return { success };
    }
}
