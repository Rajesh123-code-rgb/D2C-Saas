import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './conversation.entity';
import { Message, MessageDirection, MessageType, MessageStatus } from './message.entity';
import { InboxGateway } from './inbox.gateway';
import { Channel, ChannelType } from '../channels/channel.entity';
import { User, UserStatus } from '../users/user.entity';
import { Chatbot, ChatbotStatus } from '../chatbots/chatbot.entity';

interface InboxFilters {
    status?: ConversationStatus;
    assignedToId?: string;
    channelType?: ChannelType;
    channelId?: string;
    limit?: number;
    offset?: number;
}

interface SendMessageDto {
    content?: string;
    messageType?: MessageType;
    media?: {
        url?: string;
        mimeType?: string;
        filename?: string;
        caption?: string;
    };
    templateId?: string;
    templateVariables?: Record<string, string>;
}

@Injectable()
export class InboxService {
    constructor(
        @InjectRepository(Conversation)
        private conversationRepository: Repository<Conversation>,
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
        @InjectRepository(Channel)
        private channelRepository: Repository<Channel>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Chatbot)
        private chatbotRepository: Repository<Chatbot>,
        private inboxGateway: InboxGateway,
    ) { }

    // Get conversations with enhanced filtering
    async getConversations(tenantId: string, filters?: InboxFilters) {
        const where: any = { tenantId };

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.assignedToId) {
            where.assignedToId = filters.assignedToId;
        }

        if (filters?.channelType) {
            where.channelType = filters.channelType;
        }

        if (filters?.channelId) {
            where.channelId = filters.channelId;
        }

        const conversations = await this.conversationRepository.find({
            where,
            relations: ['contact', 'assignedTo'],
            order: { lastMessageAt: 'DESC' },
            take: filters?.limit || 50,
            skip: filters?.offset || 0,
        });

        return conversations;
    }

    // Get conversation counts by channel and status
    async getConversationCounts(tenantId: string) {
        const counts = await this.conversationRepository
            .createQueryBuilder('conversation')
            .select('conversation.channelType', 'channelType')
            .addSelect('conversation.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('conversation.tenantId = :tenantId', { tenantId })
            .groupBy('conversation.channelType')
            .addGroupBy('conversation.status')
            .getRawMany();

        const result = {
            total: 0,
            byChannel: {} as Record<string, { total: number; open: number; pending: number; resolved: number }>,
            byStatus: { open: 0, pending: 0, resolved: 0, snoozed: 0 },
        };

        for (const row of counts) {
            const count = parseInt(row.count);
            result.total += count;

            // By channel
            if (!result.byChannel[row.channelType]) {
                result.byChannel[row.channelType] = { total: 0, open: 0, pending: 0, resolved: 0 };
            }
            result.byChannel[row.channelType].total += count;
            result.byChannel[row.channelType][row.status as keyof typeof result.byChannel[string]] = count;

            // By status
            result.byStatus[row.status as keyof typeof result.byStatus] += count;
        }

        return result;
    }

    // Get connected accounts per channel type
    async getChannelAccounts(tenantId: string, channelType?: ChannelType) {
        const where: any = { tenantId, status: 'connected' };
        if (channelType) {
            where.channelType = channelType;
        }

        const channels = await this.channelRepository.find({
            where,
            select: ['id', 'name', 'channelType', 'status', 'createdAt'],
            order: { createdAt: 'DESC' },
        });

        return channels;
    }

    async getConversation(id: string, tenantId: string) {
        const conversation = await this.conversationRepository.findOne({
            where: { id, tenantId },
            relations: ['contact', 'assignedTo'],
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        return conversation;
    }

    async getMessages(conversationId: string, tenantId: string, limit = 50, offset = 0) {
        console.log(`[InboxService] getMessages called: conversationId=${conversationId}, tenantId=${tenantId}, limit=${limit}, offset=${offset}`);

        // Convert limit and offset to numbers (they may come as strings from query params)
        const numLimit = Number(limit) || 50;
        const numOffset = Number(offset) || 0;

        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId, tenantId },
        });

        if (!conversation) {
            console.log(`[InboxService] Conversation not found for id=${conversationId}, tenantId=${tenantId}`);
            throw new NotFoundException('Conversation not found');
        }

        const messages = await this.messageRepository.find({
            where: { conversationId },
            order: { createdAt: 'ASC' },
            take: numLimit,
            skip: numOffset,
        });

        console.log(`[InboxService] Found ${messages.length} messages for conversation ${conversationId}`);
        return messages;
    }

    // Send a message (routes to appropriate channel API)
    async sendMessage(
        conversationId: string,
        tenantId: string,
        userId: string,
        data: SendMessageDto,
    ) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId, tenantId },
            relations: ['contact'],
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        // Get channel credentials
        const channel = await this.channelRepository.findOne({
            where: { id: conversation.channelId, tenantId },
        });

        if (!channel) {
            throw new NotFoundException('Channel not found');
        }

        // Create message record
        const message = this.messageRepository.create({
            conversationId,
            direction: MessageDirection.OUTBOUND,
            messageType: data.messageType || MessageType.TEXT,
            content: data.content,
            media: data.media,
            sentBy: userId,
            status: MessageStatus.PENDING,
        });

        await this.messageRepository.save(message);

        // Send via appropriate channel API
        try {
            let externalMessageId: string | null = null;

            switch (conversation.channelType) {
                case ChannelType.WHATSAPP:
                    externalMessageId = await this.sendWhatsAppMessage(channel, conversation, data);
                    break;
                case ChannelType.INSTAGRAM:
                    externalMessageId = await this.sendInstagramMessage(channel, conversation, data);
                    break;
                case ChannelType.EMAIL:
                    externalMessageId = await this.sendEmailMessage(channel, conversation, data);
                    break;
                default:
                    throw new BadRequestException('Unsupported channel type');
            }

            // Update message status
            message.externalMessageId = externalMessageId || undefined;
            message.status = MessageStatus.SENT;
            message.sentAt = new Date();
            await this.messageRepository.save(message);

            // Update conversation
            conversation.lastMessageAt = new Date();
            conversation.lastMessagePreview = data.content?.substring(0, 100) || '[Media]';
            await this.conversationRepository.save(conversation);

            // Emit real-time event
            this.inboxGateway.emitNewMessage(tenantId, conversationId, message);

            return message;
        } catch (error: any) {
            // Mark message as failed
            message.status = MessageStatus.FAILED;
            message.errorMessage = error.message;
            await this.messageRepository.save(message);
            throw error;
        }
    }

    // WhatsApp Cloud API message sending
    private async sendWhatsAppMessage(
        channel: Channel,
        conversation: Conversation,
        data: SendMessageDto,
    ): Promise<string | null> {
        const credentials = this.decryptCredentials(channel.credentials);
        const recipientPhone = conversation.contact?.phone?.replace(/\D/g, '');

        if (!recipientPhone) {
            throw new BadRequestException('Contact phone number not available');
        }

        const payload: any = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientPhone,
        };

        if (data.messageType === MessageType.TEXT || !data.messageType) {
            payload.type = 'text';
            payload.text = { body: data.content };
        } else if (data.messageType === MessageType.IMAGE && data.media?.url) {
            payload.type = 'image';
            payload.image = { link: data.media.url, caption: data.media.caption };
        } else if (data.messageType === MessageType.DOCUMENT && data.media?.url) {
            payload.type = 'document';
            payload.document = { link: data.media.url, filename: data.media.filename };
        } else if (data.messageType === MessageType.TEMPLATE && data.templateId) {
            payload.type = 'template';
            payload.template = {
                name: data.templateId,
                language: { code: 'en' },
                components: data.templateVariables ? [{
                    type: 'body',
                    parameters: Object.values(data.templateVariables).map(v => ({ type: 'text', text: v })),
                }] : undefined,
            };
        }

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${credentials.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
            throw new Error(errorData.error?.message || 'Failed to send WhatsApp message');
        }

        const result = await response.json() as { messages?: Array<{ id: string }> };
        return result.messages?.[0]?.id || null;
    }

    // Instagram DM sending
    private async sendInstagramMessage(
        channel: Channel,
        conversation: Conversation,
        data: SendMessageDto,
    ): Promise<string | null> {
        const credentials = this.decryptCredentials(channel.credentials);

        // Instagram uses IGSID (Instagram Scoped ID) for recipient
        const recipientId = conversation.externalConversationId;

        if (!recipientId) {
            throw new BadRequestException('Instagram recipient ID not available');
        }

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${credentials.instagramAccountId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${credentials.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipient: { id: recipientId },
                    message: { text: data.content },
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
            throw new Error(errorData.error?.message || 'Failed to send Instagram message');
        }

        const result = await response.json() as { message_id?: string };
        return result.message_id || null;
    }

    // Email sending via SMTP
    private async sendEmailMessage(
        channel: Channel,
        conversation: Conversation,
        data: SendMessageDto,
    ): Promise<string | null> {
        const credentials = this.decryptCredentials(channel.credentials);
        const recipientEmail = conversation.contact?.email;

        if (!recipientEmail) {
            throw new BadRequestException('Contact email not available');
        }

        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            host: credentials.smtpHost,
            port: credentials.smtpPort || 587,
            secure: credentials.smtpPort === 465,
            auth: {
                user: credentials.email,
                pass: credentials.password,
            },
        });

        const info = await transporter.sendMail({
            from: credentials.email,
            to: recipientEmail,
            subject: conversation.lastMessagePreview ? `Re: ${conversation.lastMessagePreview.substring(0, 50)}` : 'New Message',
            text: data.content,
            html: data.content?.replace(/\n/g, '<br>'),
        });

        return info.messageId || null;
    }

    // Internal notes management
    async getInternalNotes(conversationId: string, tenantId: string) {
        const conversation = await this.getConversation(conversationId, tenantId);
        return conversation.notes ? JSON.parse(conversation.notes) : [];
    }

    async addInternalNote(
        conversationId: string,
        tenantId: string,
        userId: string,
        note: string,
    ) {
        const conversation = await this.getConversation(conversationId, tenantId);
        const notes = conversation.notes ? JSON.parse(conversation.notes) : [];

        notes.push({
            id: Date.now().toString(),
            userId,
            note,
            createdAt: new Date().toISOString(),
        });

        await this.conversationRepository.update(
            { id: conversationId, tenantId },
            { notes: JSON.stringify(notes) },
        );

        return notes;
    }

    async createMessage(
        conversationId: string,
        tenantId: string,
        data: {
            direction: MessageDirection;
            messageType: MessageType;
            content?: string;
            media?: any;
            sentBy?: string;
            externalMessageId?: string;
        },
    ) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId, tenantId },
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const message = this.messageRepository.create({
            conversationId,
            ...data,
            status: data.direction === MessageDirection.INBOUND ? MessageStatus.DELIVERED : MessageStatus.PENDING,
        });

        await this.messageRepository.save(message);

        // Update conversation
        conversation.lastMessageAt = new Date();
        conversation.lastMessagePreview = data.content?.substring(0, 100) || '[Media]';
        if (data.direction === MessageDirection.INBOUND) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        }
        await this.conversationRepository.save(conversation);

        // Emit real-time event
        this.inboxGateway.emitNewMessage(tenantId, conversationId, message);

        return message;
    }

    async findOrCreateConversation(
        tenantId: string,
        contactId: string,
        channelType: ChannelType,
        channelId: string,
        externalConversationId?: string,
    ) {
        let conversation = await this.conversationRepository.findOne({
            where: {
                tenantId,
                contactId,
                channelType,
                channelId,
            },
        });

        if (!conversation) {
            conversation = this.conversationRepository.create({
                tenantId,
                contactId,
                channelType,
                channelId,
                externalConversationId,
                status: ConversationStatus.OPEN,
            });
            await this.conversationRepository.save(conversation);
        }

        return conversation;
    }

    async updateConversationStatus(id: string, tenantId: string, status: ConversationStatus) {
        await this.conversationRepository.update({ id, tenantId }, { status });
        return this.getConversation(id, tenantId);
    }

    async assignConversation(id: string, tenantId: string, assignedToId: string | null) {
        await this.conversationRepository.update({ id, tenantId }, { assignedToId });
        return this.getConversation(id, tenantId);
    }

    async markAsRead(conversationId: string, tenantId: string) {
        await this.conversationRepository.update(
            { id: conversationId, tenantId },
            { unreadCount: 0 },
        );
        return this.getConversation(conversationId, tenantId);
    }

    // Get available agents for assignment
    async getAvailableAgents(tenantId: string) {
        const users = await this.userRepository.find({
            where: {
                tenantId,
                status: UserStatus.ACTIVE,
            },
            select: ['id', 'firstName', 'lastName', 'email', 'role', 'avatarUrl'],
            order: { firstName: 'ASC' },
        });

        return users;
    }

    // Get active chatbots for assignment
    async getActiveChatbots(tenantId: string) {
        const chatbots = await this.chatbotRepository.find({
            where: {
                tenantId,
                status: ChatbotStatus.ACTIVE,
            },
            select: ['id', 'name', 'channel'],
            order: { name: 'ASC' },
        });

        return chatbots;
    }

    // Set or clear chatbot for a conversation
    async setChatbot(conversationId: string, tenantId: string, chatbotId: string | null) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId, tenantId },
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        // Validate chatbot belongs to tenant if provided
        if (chatbotId) {
            const chatbot = await this.chatbotRepository.findOne({
                where: { id: chatbotId, tenantId },
            });
            if (!chatbot) {
                throw new NotFoundException('Chatbot not found');
            }
        }

        await this.conversationRepository.update(
            { id: conversationId, tenantId },
            { activeChatbotId: chatbotId },
        );

        return this.getConversation(conversationId, tenantId);
    }

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
