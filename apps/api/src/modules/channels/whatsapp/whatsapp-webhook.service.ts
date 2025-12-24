import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Channel } from '../channel.entity';

@Injectable()
export class WhatsAppWebhookService {
    private readonly logger = new Logger(WhatsAppWebhookService.name);
    private readonly verifyToken: string;

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(Channel)
        private readonly channelRepository: Repository<Channel>,
    ) {
        this.verifyToken = this.configService.get<string>('META_VERIFY_TOKEN') || 'your_verify_token';
    }

    /**
     * Verify webhook subscription (GET request from Meta)
     * Meta sends: hub.mode, hub.verify_token, hub.challenge
     */
    verifyWebhook(mode: string, token: string, challenge: string): string | null {
        this.logger.log(`Webhook verification: mode=${mode}, token=${token}`);
        if (mode === 'subscribe' && token === this.verifyToken) {
            this.logger.log('Webhook verified successfully');
            return challenge;
        }

        this.logger.warn(`Webhook verification failed. Expected token: ${this.verifyToken}, got: ${token}`);
        return null;
    }

    /**
     * Verify webhook signature for incoming events
     * Ensures the request actually came from Meta
     */
    verifySignature(signature: string, payload: string): boolean {
        if (!signature) {
            this.logger.warn('No signature provided - allowing for development');
            // In development, allow requests without signature
            return this.configService.get<string>('NODE_ENV') !== 'production';
        }

        const appSecret = this.configService.get<string>('META_APP_SECRET');
        if (!appSecret) {
            this.logger.warn('META_APP_SECRET not configured - skipping signature verification');
            return true;
        }

        // Remove 'sha256=' prefix if present
        const signatureHash = signature.startsWith('sha256=')
            ? signature.substring(7)
            : signature;

        // Generate expected signature
        const expectedSignature = crypto
            .createHmac('sha256', appSecret)
            .update(payload)
            .digest('hex');

        // Compare signatures
        try {
            const isValid = crypto.timingSafeEqual(
                Buffer.from(signatureHash),
                Buffer.from(expectedSignature),
            );

            if (!isValid) {
                this.logger.warn('Webhook signature verification failed');
            }

            return isValid;
        } catch (error) {
            this.logger.error('Error comparing signatures');
            return false;
        }
    }

    /**
     * Parse and validate webhook payload, lookup tenant from phone number
     */
    async parseWebhookPayload(body: any): Promise<{
        isValid: boolean;
        tenantId?: string;
        channelId?: string;
        data?: any;
        error?: string;
    }> {
        try {
            // Validate basic structure
            if (!body.object || body.object !== 'whatsapp_business_account') {
                return {
                    isValid: false,
                    error: 'Invalid webhook object type',
                };
            }

            if (!body.entry || !Array.isArray(body.entry) || body.entry.length === 0) {
                return {
                    isValid: false,
                    error: 'No entries in webhook payload',
                };
            }

            const entry = body.entry[0];

            if (!entry.changes || !Array.isArray(entry.changes) || entry.changes.length === 0) {
                return {
                    isValid: false,
                    error: 'No changes in webhook entry',
                };
            }

            const change = entry.changes[0];
            const value = change.value;

            // Extract phone number ID to identify the channel/tenant
            const phoneNumberId = value.metadata?.phone_number_id;
            const displayPhoneNumber = value.metadata?.display_phone_number;

            this.logger.log(
                `Webhook received for phone number: ${displayPhoneNumber} (${phoneNumberId})`,
            );

            // Lookup channel by phone number ID to get tenant
            const channel = await this.findChannelByPhoneNumberId(phoneNumberId);

            if (!channel) {
                this.logger.warn(`No channel found for phone number ID: ${phoneNumberId}`);
                return {
                    isValid: false,
                    error: `No channel found for phone number ID: ${phoneNumberId}`,
                };
            }

            this.logger.log(`Found channel ${channel.id} for tenant ${channel.tenantId}`);

            return {
                isValid: true,
                tenantId: channel.tenantId,
                channelId: channel.id,
                data: body,
            };
        } catch (error: any) {
            this.logger.error(`Error parsing webhook payload: ${error.message}`, error.stack);
            return {
                isValid: false,
                error: error.message,
            };
        }
    }

    /**
     * Find channel by WhatsApp phone number ID
     */
    private async findChannelByPhoneNumberId(phoneNumberId: string): Promise<Channel | null> {
        // Query all WhatsApp channels and check credentials for matching phone number ID
        const channels = await this.channelRepository.find({
            where: { channelType: 'whatsapp' as any, status: 'connected' as any },
        });

        this.logger.log(`Found ${channels.length} connected WhatsApp channel(s)`);

        for (const channel of channels) {
            try {
                // Credentials are encrypted, need to check if they match
                const creds = this.decryptCredentials(channel.credentials);
                this.logger.log(`Checking channel ${channel.id}: phoneNumberId=${creds.phoneNumberId}`);
                if (creds.phoneNumberId === phoneNumberId) {
                    return channel;
                }
            } catch (error: any) {
                this.logger.warn(`Error decrypting credentials for channel ${channel.id}: ${error.message}`);
                continue;
            }
        }

        // Fallback: if only one WhatsApp channel exists, use it regardless of phone number ID
        if (channels.length === 1) {
            this.logger.log(`No exact phone number match, but only one WhatsApp channel exists - using it as fallback`);
            return channels[0];
        }

        return null;
    }

    private decryptCredentials(encryptedData: string): any {
        const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(encryptionKey, 'salt', 32);

        const parts = encryptedData.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }

    /**
     * Extract message type from webhook data
     */
    getMessageType(webhookData: any): string | null {
        try {
            const value = webhookData.entry?.[0]?.changes?.[0]?.value;

            if (value.messages && value.messages.length > 0) {
                return 'message';
            }

            if (value.statuses && value.statuses.length > 0) {
                return 'status';
            }

            return null;
        } catch {
            return null;
        }
    }

    /**
     * Log webhook event for debugging
     */
    logWebhookEvent(event: any): void {
        this.logger.log('=== WEBHOOK EVENT ===');
        this.logger.log(JSON.stringify(event, null, 2));
        this.logger.log('=====================');
    }
}
