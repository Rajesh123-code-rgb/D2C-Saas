import {
    Controller,
    Get,
    Post,
    Query,
    Body,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    RawBodyRequest,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
    private readonly logger = new Logger(WhatsAppController.name);

    constructor(
        private readonly whatsappService: WhatsAppService,
        private readonly webhookService: WhatsAppWebhookService,
    ) { }

    /**
     * Webhook verification endpoint (GET)
     * Meta sends a GET request to verify the webhook URL
     */
    @Get('webhook')
    @ApiOperation({ summary: 'Verify WhatsApp webhook' })
    @ApiQuery({ name: 'hub.mode', required: true })
    @ApiQuery({ name: 'hub.verify_token', required: true })
    @ApiQuery({ name: 'hub.challenge', required: true })
    @ApiResponse({ status: 200, description: 'Webhook verified' })
    @ApiResponse({ status: 403, description: 'Webhook verification failed' })
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
    ): string {
        const result = this.webhookService.verifyWebhook(mode, token, challenge);

        if (!result) {
            this.logger.error('Webhook verification failed');
            return 'Verification failed';
        }

        return result;
    }

    /**
     * Webhook events endpoint (POST)
     * Receives incoming messages and status updates from Meta
     */
    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Receive WhatsApp webhook events' })
    @ApiResponse({ status: 200, description: 'Event processed successfully' })
    async handleWebhook(
        @Headers('x-hub-signature-256') signature: string,
        @Body() body: any,
        @Req() req: RawBodyRequest<Request>,
    ): Promise<{ status: string }> {
        try {
            this.logger.log('=== INCOMING WEBHOOK ===');

            // Verify signature
            const rawBody = req.rawBody?.toString() || JSON.stringify(body);
            const isValidSignature = this.webhookService.verifySignature(signature, rawBody);

            if (!isValidSignature) {
                this.logger.warn('Invalid webhook signature');
                // Still return 200 to prevent Meta from retrying
                return { status: 'error' };
            }

            // Parse and validate payload (async - looks up tenant)
            const parsed = await this.webhookService.parseWebhookPayload(body);

            if (!parsed.isValid) {
                this.logger.warn(`Invalid webhook payload: ${parsed.error}`);
                return { status: 'error' };
            }

            this.logger.log(`Processing webhook for tenant: ${parsed.tenantId}`);

            // Log event for debugging
            this.webhookService.logWebhookEvent(body);

            // Process the webhook
            const messageType = this.webhookService.getMessageType(body);

            if (messageType === 'message' || messageType === 'status') {
                // Process in background (don't block the response)
                setImmediate(() => {
                    this.whatsappService
                        .processIncomingMessage(body, parsed.tenantId)
                        .catch((error) => {
                            this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
                        });
                });
            }

            // Always return 200 OK to Meta to acknowledge receipt
            return { status: 'received' };
        } catch (error: any) {
            this.logger.error(`Webhook error: ${error.message}`, error.stack);
            // Still return 200 to prevent Meta from retrying
            return { status: 'error' };
        }
    }

    /**
     * Send a text message
     */
    @Post('send-message')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Send a WhatsApp text message' })
    async sendMessage(
        @Body()
        body: {
            channelId: string;
            to: string;
            message: string;
        },
    ): Promise<any> {
        this.logger.log(`=== SEND TEST MESSAGE ===>`);
        this.logger.log(`Channel ID: ${body.channelId}`);
        this.logger.log(`To: ${body.to}`);
        this.logger.log(`Message: ${body.message}`);

        try {
            const result = await this.whatsappService.sendTextMessage(body.channelId, body.to, body.message);
            this.logger.log(`Message sent successfully: ${JSON.stringify(result)}`);
            return result;
        } catch (error: any) {
            this.logger.error(`Failed to send message: ${error.message}`);
            this.logger.error(`Error details: ${JSON.stringify(error.response?.data || error)}`);
            throw error;
        }
    }

    /**
     * Send a template message
     */
    @Post('send-template')
    @ApiOperation({ summary: 'Send a WhatsApp template message' })
    async sendTemplate(
        @Body()
        body: {
            channelId: string;
            to: string;
            templateName: string;
            languageCode?: string;
            components?: any[];
        },
    ): Promise<any> {
        return this.whatsappService.sendTemplateMessage(
            body.channelId,
            body.to,
            body.templateName,
            body.languageCode,
            body.components,
        );
    }

    /**
     * Send a media message
     */
    @Post('send-media')
    @ApiOperation({ summary: 'Send a WhatsApp media message' })
    async sendMedia(
        @Body()
        body: {
            channelId: string;
            to: string;
            mediaType: 'image' | 'video' | 'document' | 'audio';
            mediaUrl: string;
            caption?: string;
        },
    ): Promise<any> {
        return this.whatsappService.sendMediaMessage(
            body.channelId,
            body.to,
            body.mediaType,
            body.mediaUrl,
            body.caption,
        );
    }

    /**
     * Get message templates
     */
    @Get('templates/:channelId')
    @ApiOperation({ summary: 'Get WhatsApp message templates' })
    async getTemplates(@Query('channelId') channelId: string): Promise<any> {
        return this.whatsappService.getTemplates(channelId);
    }

    /**
     * Create a message template
     */
    @Post('templates')
    @ApiOperation({ summary: 'Create a WhatsApp message template' })
    async createTemplate(
        @Body()
        body: {
            channelId: string;
            name: string;
            category: string;
            language: string;
            components: any[];
        },
    ): Promise<any> {
        return this.whatsappService.createTemplate(body.channelId, {
            name: body.name,
            category: body.category,
            language: body.language,
            components: body.components,
        });
    }
}
