import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Channel } from '../channel.entity';
import { InboxService } from '../../inbox/inbox.service';
import { ContactsService } from '../../contacts/contacts.service';
import * as crypto from 'crypto';

@Injectable()
export class InstagramService {
    private readonly logger = new Logger(InstagramService.name);
    private readonly apiUrl = 'https://graph.facebook.com/v18.0';
    private readonly encryptionKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
        private readonly inboxService: InboxService,
        private readonly contactsService: ContactsService,
        @InjectRepository(Channel)
        private readonly channelRepository: Repository<Channel>,
    ) {
        this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || 'default-encryption-key-change-in-production';
    }

    /**
     * Subscribe app to Facebook Page for receiving Instagram DM webhooks
     * Per Meta docs: Required to receive messaging webhooks
     * @see https://developers.facebook.com/docs/messenger-platform/webhooks
     */
    async subscribeToPage(pageId: string, pageAccessToken: string): Promise<boolean> {
        const url = `${this.apiUrl}/${pageId}/subscribed_apps`;

        try {
            this.logger.log(`Subscribing to page ${pageId} for messages webhook...`);

            const response = await firstValueFrom(
                this.httpService.post(url, null, {
                    params: {
                        subscribed_fields: 'messages,messaging_postbacks,messaging_optins',
                        access_token: pageAccessToken,
                    },
                }),
            );

            if (response.data?.success) {
                this.logger.log(`✅ Successfully subscribed to page ${pageId}`);
                return true;
            } else {
                this.logger.warn(`Page subscription response: ${JSON.stringify(response.data)}`);
                return false;
            }
        } catch (error: any) {
            this.logger.error(`Failed to subscribe to page ${pageId}: ${error.message}`);
            if (error.response?.data) {
                this.logger.error(`Error details: ${JSON.stringify(error.response.data)}`);
            }
            return false;
        }
    }

    /**
     * Unsubscribe app from Facebook Page webhooks
     */
    async unsubscribeFromPage(pageId: string, pageAccessToken: string): Promise<boolean> {
        const url = `${this.apiUrl}/${pageId}/subscribed_apps`;

        try {
            const response = await firstValueFrom(
                this.httpService.delete(url, {
                    params: { access_token: pageAccessToken },
                }),
            );

            this.logger.log(`Unsubscribed from page ${pageId}`);
            return response.data?.success || false;
        } catch (error: any) {
            this.logger.error(`Failed to unsubscribe from page: ${error.message}`);
            return false;
        }
    }

    /**
     * Send a text message via Instagram Messenger
     */
    async sendTextMessage(
        channelId: string,
        recipientId: string,
        message: string,
    ): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'instagram') {
            throw new HttpException('Invalid Instagram channel', HttpStatus.BAD_REQUEST);
        }

        const creds = channel.credentials ? JSON.parse(channel.credentials) : {};
        const pageId = creds['pageId'];
        const accessToken = creds['accessToken'];

        const url = `${this.apiUrl}/${pageId}/messages`;

        const payload = {
            recipient: { id: recipientId },
            message: { text: message },
        };

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, payload, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }),
            );

            this.logger.log(`Message sent to ${recipientId}: ${response.data.message_id}`);
            return response.data;
        } catch (error: any) {
            this.logger.error(`Error sending message: ${error.message}`, error.stack);
            throw new HttpException(
                error.response?.data || 'Failed to send message',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Send media message (image, video)
     */
    async sendMediaMessage(
        channelId: string,
        recipientId: string,
        mediaType: 'image' | 'video' | 'file',
        mediaUrl: string,
    ): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'instagram') {
            throw new HttpException('Invalid Instagram channel', HttpStatus.BAD_REQUEST);
        }

        const creds = channel.credentials ? JSON.parse(channel.credentials) : {};
        const pageId = creds['pageId'];
        const accessToken = creds['accessToken'];

        const url = `${this.apiUrl}/${pageId}/messages`;

        const payload = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: mediaType,
                    payload: { url: mediaUrl, is_reusable: true },
                },
            },
        };

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, payload, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }),
            );

            this.logger.log(`Media sent to ${recipientId}: ${response.data.message_id}`);
            return response.data;
        } catch (error: any) {
            this.logger.error(`Error sending media: ${error.message}`, error.stack);
            throw new HttpException(
                error.response?.data || 'Failed to send media',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Send quick reply buttons
     */
    async sendQuickReplies(
        channelId: string,
        recipientId: string,
        message: string,
        quickReplies: Array<{ title: string; payload: string }>,
    ): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'instagram') {
            throw new HttpException('Invalid Instagram channel', HttpStatus.BAD_REQUEST);
        }

        const creds = channel.credentials ? JSON.parse(channel.credentials) : {};
        const pageId = creds['pageId'];
        const accessToken = creds['accessToken'];

        const url = `${this.apiUrl}/${pageId}/messages`;

        const payload = {
            recipient: { id: recipientId },
            message: {
                text: message,
                quick_replies: quickReplies.map((qr) => ({
                    content_type: 'text',
                    title: qr.title,
                    payload: qr.payload,
                })),
            },
        };

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, payload, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }),
            );

            return response.data;
        } catch (error: any) {
            this.logger.error(`Error sending quick replies: ${error.message}`, error.stack);
            throw new HttpException(
                error.response?.data || 'Failed to send quick replies',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get Instagram user profile
     */
    async getUserProfile(channelId: string, userId: string): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'instagram') {
            throw new HttpException('Invalid Instagram channel', HttpStatus.BAD_REQUEST);
        }

        const creds = channel.credentials ? JSON.parse(channel.credentials) : {};
        const accessToken = creds['accessToken'];

        const url = `${this.apiUrl}/${userId}?fields=name,profile_pic&access_token=${accessToken}`;

        try {
            const response = await firstValueFrom(this.httpService.get(url));
            return response.data;
        } catch (error: any) {
            this.logger.error(`Error getting user profile: ${error.message}`, error.stack);
            return null;
        }
    }

    /**
     * Mark message as seen
     */
    async markAsSeen(channelId: string, senderId: string): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'instagram') {
            return null;
        }

        const creds = channel.credentials ? JSON.parse(channel.credentials) : {};
        const pageId = creds['pageId'];
        const accessToken = creds['accessToken'];

        const url = `${this.apiUrl}/${pageId}/messages`;

        const payload = {
            recipient: { id: senderId },
            sender_action: 'mark_seen',
        };

        try {
            await firstValueFrom(
                this.httpService.post(url, payload, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }),
            );
            return { success: true };
        } catch (error: any) {
            this.logger.error(`Error marking as seen: ${error.message}`);
            return null;
        }
    }

    /**
     * Send typing indicator
     */
    async sendTypingIndicator(
        channelId: string,
        recipientId: string,
        typing: boolean,
    ): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'instagram') {
            return null;
        }

        const creds = channel.credentials ? JSON.parse(channel.credentials) : {};
        const pageId = creds['pageId'];
        const accessToken = creds['accessToken'];

        const url = `${this.apiUrl}/${pageId}/messages`;

        const payload = {
            recipient: { id: recipientId },
            sender_action: typing ? 'typing_on' : 'typing_off',
        };

        try {
            await firstValueFrom(
                this.httpService.post(url, payload, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }),
            );
            return { success: true };
        } catch (error: any) {
            this.logger.error(`Error sending typing indicator: ${error.message}`);
            return null;
        }
    }

    /**
     * Process incoming webhook message
     */
    async processIncomingMessage(webhookData: any, tenantId: string): Promise<void> {
        try {
            const entry = webhookData.entry?.[0];
            const messaging = entry?.messaging?.[0];

            if (!messaging) {
                this.logger.warn('Invalid webhook data structure');
                return;
            }

            const senderId = messaging.sender?.id;
            const recipientId = messaging.recipient?.id;
            const timestamp = new Date(messaging.timestamp);

            // Handle message event
            if (messaging.message) {
                await this.handleIncomingMessage(messaging, tenantId);
            }

            // Handle postback (button click)
            if (messaging.postback) {
                await this.handlePostback(messaging, tenantId);
            }

            // Handle read receipt
            if (messaging.read) {
                this.logger.log(`Message read by ${senderId}`);
            }

            // Handle delivery confirmation
            if (messaging.delivery) {
                this.logger.log(`Message delivered to ${senderId}`);
            }
        } catch (error: any) {
            this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
        }
    }

    /**
     * Handle incoming message
     */
    private async handleIncomingMessage(
        messaging: any,
        tenantId: string,
    ): Promise<void> {
        const senderId = messaging.sender.id;
        const messageId = messaging.message.mid;
        const timestamp = new Date(messaging.timestamp);

        // Get user profile
        const channel = await this.channelRepository.findOne({
            where: { tenantId, channelType: 'instagram' } as any,
        });

        if (!channel) {
            this.logger.error(`No Instagram channel found for tenant ${tenantId}`);
            return;
        }

        const userProfile = await this.getUserProfile(channel.id, senderId);

        // Find or create contact
        const contact = await this.contactsService.findOrCreate(
            tenantId,
            { phone: senderId },
            {
                name: userProfile?.name || `Instagram User ${senderId}`,
                source: 'instagram',
            },
        );

        // Find or create conversation
        const conversation = await this.inboxService.findOrCreateConversation(
            tenantId,
            contact.id,
            'instagram' as any,
            channel.id,
        );

        // Extract message content
        let content = '';
        let messageType = 'text';
        let mediaData = null;

        if (messaging.message.text) {
            content = messaging.message.text;
        } else if (messaging.message.attachments) {
            const attachment = messaging.message.attachments[0];
            messageType = attachment.type;
            content = attachment.type === 'image' ? 'Image' :
                attachment.type === 'video' ? 'Video' :
                    attachment.type === 'audio' ? 'Audio' : 'Attachment';
            mediaData = { url: attachment.payload?.url, type: attachment.type };
        } else if (messaging.message.sticker_id) {
            content = 'Sticker';
            messageType = 'sticker';
        }

        // Quick reply payload
        if (messaging.message.quick_reply) {
            content = `[Quick Reply: ${messaging.message.quick_reply.payload}] ${content}`;
        }

        // Create message
        await this.inboxService.createMessage(
            conversation.id,
            tenantId,
            {
                direction: 'inbound' as any,
                messageType: messageType as any,
                content,
            },
        );

        // Mark as seen
        await this.markAsSeen(channel.id, senderId);

        this.logger.log(`Processed incoming message ${messageId} from ${senderId}`);
    }

    /**
     * Handle postback (button clicks)
     */
    private async handlePostback(messaging: any, tenantId: string): Promise<void> {
        const senderId = messaging.sender.id;
        const payload = messaging.postback.payload;
        const title = messaging.postback.title;

        this.logger.log(`Postback received from ${senderId}: ${payload}`);

        // TODO: Process postback based on payload
        // This could trigger automations, update contact properties, etc.
    }

    /**
     * Find a channel by its Instagram Account ID
     * Used by webhook to map incoming messages to the correct tenant
     */
    async findChannelByInstagramAccountId(instagramAccountId: string): Promise<Channel | null> {
        try {
            this.logger.log(`Looking for channel with Instagram Account ID: ${instagramAccountId}`);

            // Get all Instagram channels and check their credentials
            const channels = await this.channelRepository.find({
                where: { channelType: 'instagram' } as any,
            });

            this.logger.log(`Found ${channels.length} Instagram channels to check`);

            for (const channel of channels) {
                try {
                    // Credentials are encrypted, need to decrypt
                    const creds = this.decryptCredentials(channel.credentials);
                    this.logger.log(`Channel ${channel.id} has instagramAccountId: ${creds?.instagramAccountId}`);

                    // Check if this channel's Instagram Account ID matches
                    if (creds?.instagramAccountId === instagramAccountId) {
                        this.logger.log(`✅ Found matching channel ${channel.id} for Instagram Account ${instagramAccountId}`);
                        return channel;
                    }
                } catch (e: any) {
                    this.logger.warn(`Could not parse credentials for channel ${channel.id}: ${e.message}`);
                }
            }

            this.logger.warn(`❌ No channel found for Instagram Account ${instagramAccountId}`);
            return null;
        } catch (error: any) {
            this.logger.error(`Error finding channel by Instagram Account ID: ${error.message}`);
            return null;
        }
    }

    /**
     * Decrypt channel credentials
     */
    private decryptCredentials(encryptedData: string): any {
        if (!encryptedData) return null;

        try {
            const algorithm = 'aes-256-cbc';
            const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

            const parts = encryptedData.split(':');
            if (parts.length !== 2) {
                // Not encrypted, try to parse as JSON
                return JSON.parse(encryptedData);
            }

            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];

            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return JSON.parse(decrypted);
        } catch (error: any) {
            this.logger.warn(`Decryption failed: ${error.message}`);
            // Try to parse as plain JSON as fallback
            try {
                return JSON.parse(encryptedData);
            } catch {
                return null;
            }
        }
    }
}
