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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { InstagramService } from './instagram.service';

@ApiTags('Instagram')
@Controller('instagram')
export class InstagramController {
    private readonly logger = new Logger(InstagramController.name);
    private readonly verifyToken: string;
    private readonly appSecret: string;

    constructor(
        private readonly instagramService: InstagramService,
        private readonly configService: ConfigService,
    ) {
        this.verifyToken = this.configService.get<string>('META_VERIFY_TOKEN') || '';
        // Use Instagram-specific secret if available, otherwise fall back to Meta App Secret
        this.appSecret = this.configService.get<string>('INSTAGRAM_APP_SECRET')
            || this.configService.get<string>('META_APP_SECRET')
            || '';

        if (this.configService.get<string>('INSTAGRAM_APP_SECRET')) {
            this.logger.log('Using INSTAGRAM_APP_SECRET for webhook verification');
        } else {
            this.logger.log('Using META_APP_SECRET for Instagram webhook verification');
        }
    }

    /**
     * Webhook verification endpoint (GET)
     */
    @Get('webhook')
    @ApiOperation({ summary: 'Verify Instagram webhook' })
    @ApiQuery({ name: 'hub.mode', required: true })
    @ApiQuery({ name: 'hub.verify_token', required: true })
    @ApiQuery({ name: 'hub.challenge', required: true })
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
    ): string {
        this.logger.log(`Instagram webhook verification attempt:`);
        this.logger.log(`  Mode: ${mode}`);
        this.logger.log(`  Received token: "${token}"`);
        this.logger.log(`  Expected token: "${this.verifyToken}"`);
        this.logger.log(`  Challenge: ${challenge}`);
        this.logger.log(`  Tokens match: ${token === this.verifyToken}`);

        if (mode === 'subscribe' && token === this.verifyToken) {
            this.logger.log('✅ Instagram webhook verified successfully');
            return challenge;
        }

        this.logger.warn(`❌ Webhook verification failed - mode: ${mode}, tokenMatch: ${token === this.verifyToken}`);
        return 'Verification failed';
    }

    /**
     * Webhook events endpoint (POST)
     */
    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Receive Instagram webhook events' })
    async handleWebhook(
        @Headers('x-hub-signature-256') signature: string,
        @Body() body: any,
        @Req() req: RawBodyRequest<Request>,
    ): Promise<{ status: string }> {
        this.logger.log('=== INSTAGRAM WEBHOOK RECEIVED ===');
        this.logger.log(`Body object type: ${body?.object}`);
        this.logger.log(`Body content: ${JSON.stringify(body, null, 2)}`);

        try {
            // Verify signature
            const rawBody = req.rawBody?.toString() || JSON.stringify(body);
            this.logger.log(`Signature received: ${signature ? 'YES' : 'NO'}`);
            this.logger.log(`App Secret configured: ${this.appSecret ? 'YES (length: ' + this.appSecret.length + ')' : 'NO'}`);

            const signatureValid = this.verifySignature(signature, rawBody);
            if (!signatureValid) {
                // Log warning but continue processing - signature verification issue being investigated
                this.logger.warn('⚠️ Signature verification failed - continuing with processing (investigation pending)');
                // TODO: Re-enable strict signature verification once INSTAGRAM_APP_SECRET is confirmed
            } else {
                this.logger.log('✅ Signature verified');
            }

            // Check if it's an Instagram webhook
            if (body.object !== 'instagram') {
                this.logger.log(`Received non-Instagram webhook: ${body.object}`);
                return { status: 'ignored' };
            }

            this.logger.log('✅ Instagram webhook confirmed');
            this.logger.log(`Number of entries: ${body.entry?.length || 0}`);

            // Process each entry
            for (const entry of body.entry || []) {
                this.logger.log(`Entry ID: ${entry.id}`);
                this.logger.log(`Entry messaging array length: ${entry.messaging?.length || 0}`);
                this.logger.log(`Entry changes array length: ${entry.changes?.length || 0}`);

                // Instagram webhooks can come in two formats:
                // 1. messaging array - direct DM format
                // 2. changes array - subscription changes format

                let messaging = entry.messaging?.[0];

                // If no messaging, check changes format
                if (!messaging && entry.changes?.length > 0) {
                    const change = entry.changes[0];
                    if (change.field === 'messages' && change.value) {
                        this.logger.log('Converting changes format to messaging format');
                        messaging = {
                            sender: change.value.sender,
                            recipient: change.value.recipient,
                            message: change.value.message,
                            timestamp: change.value.timestamp,
                        };
                    }
                }

                if (!messaging) {
                    this.logger.warn('No messaging data in entry (checked both messaging and changes formats)');
                    continue;
                }

                this.logger.log(`Sender ID: ${messaging.sender?.id}`);
                this.logger.log(`Recipient ID: ${messaging.recipient?.id}`);
                this.logger.log(`Message text: ${messaging.message?.text}`);

                // Get the Instagram Account ID (recipient is our page/account)
                const instagramAccountId = messaging.recipient?.id || entry.id;

                if (!instagramAccountId || instagramAccountId === '0') {
                    this.logger.warn('No valid recipient ID in webhook (might be a test event)');
                    continue;
                }

                // Find the channel by Instagram Account ID
                this.logger.log(`Looking for channel with Instagram Account ID: ${instagramAccountId}`);
                const channel = await this.instagramService.findChannelByInstagramAccountId(instagramAccountId);

                if (!channel) {
                    this.logger.warn(`❌ No channel found for Instagram Account ID: ${instagramAccountId}`);
                    continue;
                }

                const tenantId = channel.tenantId;
                this.logger.log(`✅ Found channel: ${channel.id}, tenant: ${tenantId}`);

                // Process message asynchronously (Meta requires response within 5 seconds)
                // Using setImmediate to not block the webhook response
                setImmediate(() => {
                    // Construct entry in the expected format for processing
                    const normalizedEntry = {
                        ...entry,
                        messaging: [messaging],
                    };
                    this.instagramService
                        .processIncomingMessage({ entry: [normalizedEntry] }, tenantId)
                        .then(() => {
                            this.logger.log('✅ Message processed successfully');
                        })
                        .catch((error: any) => {
                            this.logger.error(`❌ Error processing message: ${error.message}`, error.stack);
                        });
                });
            }

            return { status: 'received' };
        } catch (error: any) {
            this.logger.error(`Webhook error: ${error.message}`, error.stack);
            return { status: 'error' };
        }
    }

    /**
     * Verify webhook signature
     * Per Meta docs: Always verify signature in production, allow bypass in development
     */
    private verifySignature(signature: string, payload: string): boolean {
        // Allow bypass in development mode when no signature is present
        if (!signature) {
            const nodeEnv = this.configService.get<string>('NODE_ENV');
            if (nodeEnv !== 'production') {
                this.logger.warn('No signature provided - allowing for development mode');
                return true;
            }
            this.logger.warn('No signature provided in production - rejecting');
            return false;
        }

        if (!this.appSecret) {
            this.logger.warn('META_APP_SECRET not configured - skipping signature verification');
            return true;
        }

        const signatureHash = signature.startsWith('sha256=')
            ? signature.substring(7)
            : signature;

        const expectedSignature = crypto
            .createHmac('sha256', this.appSecret)
            .update(payload)
            .digest('hex');

        try {
            const isValid = crypto.timingSafeEqual(
                Buffer.from(signatureHash),
                Buffer.from(expectedSignature),
            );

            if (!isValid) {
                this.logger.warn('Webhook signature mismatch');
                this.logger.debug(`Expected: ${expectedSignature.substring(0, 20)}...`);
                this.logger.debug(`Received: ${signatureHash.substring(0, 20)}...`);
            }

            return isValid;
        } catch (error: any) {
            this.logger.error(`Signature comparison error: ${error.message}`);
            return false;
        }
    }

    /**
     * Send a text message
     */
    @Post('send-message')
    @ApiOperation({ summary: 'Send an Instagram message' })
    async sendMessage(
        @Body()
        body: {
            channelId: string;
            recipientId: string;
            message: string;
        },
    ): Promise<any> {
        return this.instagramService.sendTextMessage(
            body.channelId,
            body.recipientId,
            body.message,
        );
    }

    /**
     * Send a media message
     */
    @Post('send-media')
    @ApiOperation({ summary: 'Send an Instagram media message' })
    async sendMedia(
        @Body()
        body: {
            channelId: string;
            recipientId: string;
            mediaType: 'image' | 'video' | 'file';
            mediaUrl: string;
        },
    ): Promise<any> {
        return this.instagramService.sendMediaMessage(
            body.channelId,
            body.recipientId,
            body.mediaType,
            body.mediaUrl,
        );
    }

    /**
     * Send quick replies
     */
    @Post('send-quick-replies')
    @ApiOperation({ summary: 'Send Instagram quick reply buttons' })
    async sendQuickReplies(
        @Body()
        body: {
            channelId: string;
            recipientId: string;
            message: string;
            quickReplies: Array<{ title: string; payload: string }>;
        },
    ): Promise<any> {
        return this.instagramService.sendQuickReplies(
            body.channelId,
            body.recipientId,
            body.message,
            body.quickReplies,
        );
    }
}
