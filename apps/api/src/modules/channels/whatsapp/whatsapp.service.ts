import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Channel, ChannelStatus } from '../channel.entity';
import { InboxService } from '../../inbox/inbox.service';
import { ContactsService } from '../../contacts/contacts.service';
import { Message, MessageStatus } from '../../inbox/message.entity';

import { TemplateGovernanceService } from '../../super-admin/services/template-governance.service';

import { WhatsAppTemplate } from './entities/whatsapp-template.entity';

@Injectable()
export class WhatsAppService {
    private readonly logger = new Logger(WhatsAppService.name);
    private readonly apiUrl = 'https://graph.facebook.com/v18.0';

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
        private readonly inboxService: InboxService,
        private readonly contactsService: ContactsService,
        private readonly templateGovernanceService: TemplateGovernanceService,
        @InjectRepository(Channel)
        private readonly channelRepository: Repository<Channel>,
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
        @InjectRepository(WhatsAppTemplate)
        private readonly templateRepository: Repository<WhatsAppTemplate>,
    ) { }

    // ... (methods)

    /**
     * Send a text message via WhatsApp
     */
    async sendTextMessage(
        channelId: string,
        to: string,
        message: string,
    ): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'whatsapp') {
            throw new HttpException('Invalid WhatsApp channel', HttpStatus.BAD_REQUEST);
        }

        if (channel.status !== ChannelStatus.CONNECTED) {
            throw new HttpException('Channel is not active', HttpStatus.BAD_REQUEST);
        }

        const creds = this.decryptCredentials(channel.credentials);
        const phoneNumberId = creds['phoneNumberId'];
        const accessToken = creds['accessToken'];

        if (!phoneNumberId || !accessToken) {
            throw new HttpException('Invalid channel configuration', HttpStatus.BAD_REQUEST);
        }

        const url = `${this.apiUrl}/${phoneNumberId}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'text',
            text: {
                preview_url: false,
                body: message,
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

            this.logger.log(`Message sent to ${to}: ${response.data.messages[0].id}`);
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
     * Send a template message
     */
    async sendTemplateMessage(
        channelId: string,
        to: string,
        templateName: string,
        languageCode: string = 'en',
        components: any[] = [],
    ): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'whatsapp') {
            throw new HttpException('Invalid WhatsApp channel', HttpStatus.BAD_REQUEST);
        }

        const creds = this.decryptCredentials(channel.credentials);
        const phoneNumberId = creds['phoneNumberId'];
        const accessToken = creds['accessToken'];

        const url = `${this.apiUrl}/${phoneNumberId}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'template',
            template: {
                name: templateName,
                language: {
                    code: languageCode,
                },
                components: components,
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

            this.logger.log(`Template message sent to ${to}: ${response.data.messages[0].id}`);
            return response.data;
        } catch (error: any) {
            this.logger.error(`Error sending template: ${error.message}`, error.stack);
            throw new HttpException(
                error.response?.data || 'Failed to send template',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Send media message (image, video, document, audio)
     */
    async sendMediaMessage(
        channelId: string,
        to: string,
        mediaType: 'image' | 'video' | 'document' | 'audio',
        mediaUrl: string,
        caption?: string,
    ): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'whatsapp') {
            throw new HttpException('Invalid WhatsApp channel', HttpStatus.BAD_REQUEST);
        }

        const creds = this.decryptCredentials(channel.credentials);
        const phoneNumberId = creds['phoneNumberId'];
        const accessToken = creds['accessToken'];

        const url = `${this.apiUrl}/${phoneNumberId}/messages`;

        const payload: any = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: mediaType,
            [mediaType]: {
                link: mediaUrl,
            },
        };

        if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
            payload[mediaType].caption = caption;
        }

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, payload, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }),
            );

            this.logger.log(`Media message sent to ${to}: ${response.data.messages[0].id}`);
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
     * Mark message as read
     */
    async markAsRead(channelId: string, messageId: string): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'whatsapp') {
            throw new HttpException('Invalid WhatsApp channel', HttpStatus.BAD_REQUEST);
        }

        const creds = this.decryptCredentials(channel.credentials);
        const phoneNumberId = creds['phoneNumberId'];
        const accessToken = creds['accessToken'];

        const url = `${this.apiUrl}/${phoneNumberId}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
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
            this.logger.error(`Error marking as read: ${error.message}`, error.stack);
            return null; // Non-critical failure
        }
    }

    /**
     * Get message templates
     */
    async getTemplates(channelId: string): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'whatsapp') {
            throw new HttpException('Invalid WhatsApp channel', HttpStatus.BAD_REQUEST);
        }

        const creds = this.decryptCredentials(channel.credentials);
        const wabaId = creds['wabaId'];
        const accessToken = creds['accessToken'];

        const url = `${this.apiUrl}/${wabaId}/message_templates`;

        try {
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }),
            );

            const templates = response.data.data || [];
            return templates.filter((t: any) => t.status === 'APPROVED');
        } catch (error: any) {
            this.logger.error(`Error fetching templates: ${error.message}`, error.stack);
            throw new HttpException(
                error.response?.data || 'Failed to fetch templates',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Sync templates from Meta to local DB
     */
    async syncTemplates(channelId: string): Promise<any[]> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'whatsapp') {
            throw new HttpException('Invalid WhatsApp channel', HttpStatus.BAD_REQUEST);
        }

        const creds = this.decryptCredentials(channel.credentials);
        const wabaId = creds['wabaId'];
        const accessToken = creds['accessToken'];

        if (!wabaId || !accessToken) {
            throw new HttpException('Missing WABA ID or Access Token', HttpStatus.BAD_REQUEST);
        }

        const url = `${this.apiUrl}/${wabaId}/message_templates?limit=100`;

        try {
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }),
            );

            const templates = response.data.data;
            const savedTemplates = [];

            for (const t of templates) {
                let template = await this.templateRepository.findOne({
                    where: { metaTemplateId: t.id, channelId: channel.id },
                });

                if (!template) {
                    template = this.templateRepository.create({
                        tenantId: channel.tenantId,
                        channelId: channel.id,
                        metaTemplateId: t.id,
                    });
                }

                template.name = t.name;
                template.language = t.language;
                template.category = t.category;
                template.status = t.status;
                template.components = t.components;
                template.qualityScore = t.quality_score?.score || 'UNKNOWN';
                template.syncedAt = new Date(); // Only update this on sync

                // Map rejection reason if exists
                if (t.rejected_reason) {
                    template.rejectionReason = t.rejected_reason;
                }

                savedTemplates.push(await this.templateRepository.save(template));
            }

            return savedTemplates;
        } catch (error: any) {
            this.logger.error(`Error syncing templates: ${error.message}`, error.stack);
            throw new HttpException(
                error.response?.data || 'Failed to sync templates',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Create a message template
     */
    async createTemplate(
        channelId: string,
        templateData: {
            name: string;
            category: string;
            language: string;
            components: any[];
        },
    ): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        if (!channel || channel.channelType !== 'whatsapp') {
            throw new HttpException('Invalid WhatsApp channel', HttpStatus.BAD_REQUEST);
        }

        // Validate template against governance policy
        await this.templateGovernanceService.validateTemplate(channel.tenantId, templateData);

        const creds = this.decryptCredentials(channel.credentials);
        const wabaId = creds['wabaId'];
        const accessToken = creds['accessToken'];

        const url = `${this.apiUrl}/${wabaId}/message_templates`;

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, templateData, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }),
            );

            return response.data;
        } catch (error: any) {
            this.logger.error(`Error creating template: ${error.message}`, error.stack);
            throw new HttpException(
                error.response?.data || 'Failed to create template',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Process incoming webhook message
     */
    async processIncomingMessage(webhookData: any, tenantId: string): Promise<void> {
        try {
            const entry = webhookData.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;

            if (!value) {
                this.logger.warn('Invalid webhook data structure');
                return;
            }

            // Handle messages
            if (value.messages && value.messages.length > 0) {
                for (const message of value.messages) {
                    await this.handleIncomingMessage(message, value, tenantId);
                }
            }

            // Handle status updates
            if (value.statuses && value.statuses.length > 0) {
                for (const status of value.statuses) {
                    await this.handleStatusUpdate(status, tenantId);
                }
            }

            // Handle template status updates
            if (value.event && value.message_template_id) {
                await this.handleTemplateUpdate(value, tenantId);
            } else if (changes?.field === 'message_template_status_update') {
                await this.handleTemplateUpdate(value, tenantId);
            }
        } catch (error: any) {
            this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
        }
    }

    /**
     * Handle incoming message
     */
    private async handleIncomingMessage(
        message: any,
        value: any,
        tenantId: string,
    ): Promise<void> {
        const from = message.from;
        const messageId = message.id;
        const timestamp = new Date(parseInt(message.timestamp) * 1000);

        // Find or create contact
        const contact = await this.contactsService.findOrCreate(
            tenantId,
            {
                phone: from,
            },
            {
                name: value.contacts?.[0]?.profile?.name || from,
                source: 'whatsapp',
            },
        );

        // Find or create conversation
        const channel = await this.channelRepository.findOne({
            where: { tenantId, channelType: 'whatsapp' } as any,
        });

        if (!channel) {
            this.logger.error(`No WhatsApp channel found for tenant ${tenantId}`);
            return;
        }

        const conversation = await this.inboxService.findOrCreateConversation(
            tenantId,
            contact.id,
            'whatsapp' as any,
            channel.id,
        );

        // Extract message content and media
        let content = '';
        let messageType = 'text';
        let media: any = undefined;

        if (message.type === 'text') {
            content = message.text.body;
        } else if (message.type === 'image') {
            content = message.image.caption || '[Image]';
            messageType = 'image';
            const mediaUrl = await this.getMediaUrl(channel.id, message.image.id);
            media = {
                url: mediaUrl,
                mimeType: message.image.mime_type,
                caption: message.image.caption
            };
        } else if (message.type === 'video') {
            content = message.video.caption || '[Video]';
            messageType = 'video';
            const mediaUrl = await this.getMediaUrl(channel.id, message.video.id);
            media = {
                url: mediaUrl,
                mimeType: message.video.mime_type,
                caption: message.video.caption
            };
        } else if (message.type === 'document') {
            content = message.document.filename || '[Document]';
            messageType = 'document';
            const mediaUrl = await this.getMediaUrl(channel.id, message.document.id);
            media = {
                url: mediaUrl,
                mimeType: message.document.mime_type,
                filename: message.document.filename
            };
        } else if (message.type === 'audio') {
            content = '[Audio message]';
            messageType = 'audio';
            const mediaUrl = await this.getMediaUrl(channel.id, message.audio.id);
            media = {
                url: mediaUrl,
                mimeType: message.audio.mime_type
            };
        } else if (message.type === 'location') {
            content = `Location: ${message.location.latitude}, ${message.location.longitude}`;
            messageType = 'location';
            media = message.location;
        }

        // Create message with media data
        await this.inboxService.createMessage(
            conversation.id,
            tenantId,
            {
                direction: 'inbound' as any,
                messageType: messageType as any,
                content,
                media,
                externalMessageId: messageId,
            },
        );

        // Mark as read (optional)
        await this.markAsRead(channel.id, messageId);

        this.logger.log(`Processed incoming message ${messageId} from ${from}`);
    }

    /**
     * Get media URL from Meta API
     */
    private async getMediaUrl(channelId: string, mediaId: string): Promise<string | undefined> {
        try {
            const channel = await this.channelRepository.findOne({
                where: { id: channelId },
            });

            if (!channel) {
                this.logger.warn(`Channel ${channelId} not found for media URL fetch`);
                return undefined;
            }

            const creds = this.decryptCredentials(channel.credentials);
            const accessToken = creds['accessToken'];

            // First, get the media URL from Meta
            const response = await firstValueFrom(
                this.httpService.get(`${this.apiUrl}/${mediaId}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }),
            );

            return response.data.url;
        } catch (error: any) {
            this.logger.error(`Error fetching media URL: ${error.message}`);
            return undefined;
        }
    }

    /**
     * Handle status update (sent, delivered, read, failed)
     */
    private async handleStatusUpdate(status: any, tenantId: string): Promise<void> {
        const messageId = status.id; // WhatsApp message ID
        const statusValue = status.status; // sent, delivered, read, failed
        const timestamp = new Date(parseInt(status.timestamp) * 1000);

        try {
            // Find message by external ID
            const message = await this.messageRepository.findOne({
                where: { externalMessageId: messageId },
                relations: ['conversation'],
            });

            if (!message) {
                this.logger.warn(`Message ${messageId} not found for status update`);
                return;
            }

            // Verify tenant matches
            if (message.conversation && (message.conversation as any).tenantId !== tenantId) {
                this.logger.warn(`Tenant mismatch for message ${messageId}`);
                return;
            }

            // Update status based on WhatsApp status
            const statusMap: Record<string, MessageStatus> = {
                'sent': MessageStatus.SENT,
                'delivered': MessageStatus.DELIVERED,
                'read': MessageStatus.READ,
                'failed': MessageStatus.FAILED,
            };

            message.status = statusMap[statusValue] || message.status;

            // Update timestamps
            if (statusValue === 'sent' && !message.sentAt) {
                message.sentAt = timestamp;
            } else if (statusValue === 'delivered' && !message.deliveredAt) {
                message.deliveredAt = timestamp;
            } else if (statusValue === 'read' && !message.readAt) {
                message.readAt = timestamp;
            } else if (statusValue === 'failed') {
                message.errorMessage = status.errors?.[0]?.message || 'Message delivery failed';
            }

            await this.messageRepository.save(message);
            this.logger.log(`Message ${messageId} status updated to ${statusValue}`);
        } catch (error: any) {
            this.logger.error(`Error updating message status: ${error.message}`, error.stack);
        }
    }

    /**
     * Handle template status update
     */
    private async handleTemplateUpdate(value: any, tenantId: string): Promise<void> {
        const templateId = value.message_template_id;
        const event = value.event; // APPROVED, REJECTED, PAUSED
        const reason = value.reason;

        try {
            const template = await this.templateRepository.findOne({
                where: { metaTemplateId: templateId.toString() },
            });

            if (!template) {
                this.logger.warn(`Template ${templateId} not found for status update`);
                return;
            }

            // Verify tenant matches (optional safely check)
            if (template.tenantId !== tenantId) {
                this.logger.warn(`Tenant mismatch for template ${templateId}: Expected ${template.tenantId}, got ${tenantId}`);
                // We might proceed anyway if we trust the webhook, or return.
                // Meta webhooks usually come for a specific WABA which belongs to a tenant.
            }

            template.status = event;
            if (reason) {
                template.rejectionReason = reason;
            }
            template.syncedAt = new Date();

            await this.templateRepository.save(template);
            this.logger.log(`Template ${templateId} status updated to ${event}`);
        } catch (error: any) {
            this.logger.error(`Error updating template status: ${error.message}`, error.stack);
        }
    }

    /**
     * Decrypt channel credentials
     */
    private decryptCredentials(encryptedData: string): any {
        const crypto = require('crypto');
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
}
