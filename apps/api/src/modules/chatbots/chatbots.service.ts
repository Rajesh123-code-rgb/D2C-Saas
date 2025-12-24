import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chatbot, ChatbotStatus, ChatbotChannel, ChatbotNodeType } from './chatbot.entity';
import { ChatbotSession, ChatbotSessionStatus } from './chatbot-session.entity';
import { CreateChatbotDto } from './dto/create-chatbot.dto';
import { UpdateChatbotDto } from './dto/update-chatbot.dto';

@Injectable()
export class ChatbotsService {
    private readonly logger = new Logger(ChatbotsService.name);

    constructor(
        @InjectRepository(Chatbot)
        private readonly chatbotRepository: Repository<Chatbot>,
        @InjectRepository(ChatbotSession)
        private readonly sessionRepository: Repository<ChatbotSession>,
    ) { }

    /**
     * Find all chatbots for a tenant
     */
    async findAll(tenantId: string, channel?: ChatbotChannel): Promise<Chatbot[]> {
        const query = this.chatbotRepository.createQueryBuilder('chatbot')
            .where('chatbot.tenantId = :tenantId', { tenantId })
            .orderBy('chatbot.createdAt', 'DESC');

        if (channel) {
            query.andWhere('chatbot.channel = :channel', { channel });
        }

        return query.getMany();
    }

    /**
     * Find a chatbot by ID
     */
    async findOne(id: string, tenantId: string): Promise<Chatbot> {
        const chatbot = await this.chatbotRepository.findOne({
            where: { id, tenantId },
        });

        if (!chatbot) {
            throw new NotFoundException(`Chatbot with ID ${id} not found`);
        }

        return chatbot;
    }

    /**
     * Create a new chatbot
     */
    async create(tenantId: string, dto: CreateChatbotDto): Promise<Chatbot> {
        // Create default flow with start and end nodes
        const defaultNodes = [
            {
                id: 'start-node',
                type: ChatbotNodeType.START,
                position: { x: 250, y: 50 },
                data: { label: 'Start' },
            },
            {
                id: 'welcome-node',
                type: ChatbotNodeType.MESSAGE,
                position: { x: 250, y: 150 },
                data: {
                    label: 'Welcome Message',
                    message: dto.welcomeMessage || 'Hello! How can I help you today?',
                },
            },
            {
                id: 'end-node',
                type: ChatbotNodeType.END,
                position: { x: 250, y: 350 },
                data: { label: 'End' },
            },
        ];

        const defaultConnections = [
            {
                id: 'conn-1',
                sourceNodeId: 'start-node',
                targetNodeId: 'welcome-node',
            },
            {
                id: 'conn-2',
                sourceNodeId: 'welcome-node',
                targetNodeId: 'end-node',
            },
        ];

        const chatbot = this.chatbotRepository.create({
            tenantId,
            name: dto.name,
            description: dto.description,
            channel: dto.channel,
            channelId: dto.channelId,
            triggerConfig: dto.triggerConfig || { type: 'any_message' as any },
            welcomeMessage: dto.welcomeMessage,
            fallbackMessage: dto.fallbackMessage || "I'm sorry, I didn't understand that. Let me connect you with a human agent.",
            offHoursMessage: dto.offHoursMessage || "We're currently outside business hours. We'll get back to you soon!",
            nodes: defaultNodes as any,
            connections: defaultConnections as any,
            status: ChatbotStatus.DRAFT,
        });

        const saved = await this.chatbotRepository.save(chatbot);
        this.logger.log(`Created chatbot ${saved.id} for tenant ${tenantId}`);
        return saved;
    }

    /**
     * Update a chatbot
     */
    async update(id: string, tenantId: string, dto: UpdateChatbotDto): Promise<Chatbot> {
        const chatbot = await this.findOne(id, tenantId);

        // Validate flow if nodes/connections are being updated
        if (dto.nodes || dto.connections) {
            this.validateFlow(dto.nodes || chatbot.nodes, dto.connections || chatbot.connections);
        }

        // Update fields
        Object.assign(chatbot, dto);
        chatbot.updatedAt = new Date();

        const saved = await this.chatbotRepository.save(chatbot);
        this.logger.log(`Updated chatbot ${id}`);
        return saved;
    }

    /**
     * Delete a chatbot
     */
    async delete(id: string, tenantId: string): Promise<void> {
        const chatbot = await this.findOne(id, tenantId);

        // Check for active sessions
        const activeSessions = await this.sessionRepository.count({
            where: { chatbotId: id, status: ChatbotSessionStatus.ACTIVE },
        });

        if (activeSessions > 0) {
            throw new BadRequestException(
                `Cannot delete chatbot with ${activeSessions} active sessions. Deactivate first.`
            );
        }

        await this.chatbotRepository.remove(chatbot);
        this.logger.log(`Deleted chatbot ${id}`);
    }

    /**
     * Activate a chatbot
     */
    async activate(id: string, tenantId: string): Promise<Chatbot> {
        const chatbot = await this.findOne(id, tenantId);

        // Validate flow before activation
        this.validateFlow(chatbot.nodes, chatbot.connections);

        chatbot.status = ChatbotStatus.ACTIVE;
        chatbot.updatedAt = new Date();

        const saved = await this.chatbotRepository.save(chatbot);
        this.logger.log(`Activated chatbot ${id}`);
        return saved;
    }

    /**
     * Deactivate a chatbot
     */
    async deactivate(id: string, tenantId: string): Promise<Chatbot> {
        const chatbot = await this.findOne(id, tenantId);

        chatbot.status = ChatbotStatus.PAUSED;
        chatbot.updatedAt = new Date();

        // Optionally end all active sessions
        await this.sessionRepository.update(
            { chatbotId: id, status: ChatbotSessionStatus.ACTIVE },
            { status: ChatbotSessionStatus.EXPIRED }
        );

        const saved = await this.chatbotRepository.save(chatbot);
        this.logger.log(`Deactivated chatbot ${id}`);
        return saved;
    }

    /**
     * Duplicate a chatbot
     */
    async duplicate(id: string, tenantId: string): Promise<Chatbot> {
        const original = await this.findOne(id, tenantId);

        const duplicate = this.chatbotRepository.create({
            ...original,
            id: undefined,
            name: `${original.name} (Copy)`,
            status: ChatbotStatus.DRAFT,
            conversationsCount: 0,
            messagesCount: 0,
            completedCount: 0,
            handoffCount: 0,
            createdAt: undefined,
            updatedAt: undefined,
            lastActiveAt: undefined,
        });

        const saved = await this.chatbotRepository.save(duplicate);
        this.logger.log(`Duplicated chatbot ${id} as ${saved.id}`);
        return saved;
    }

    /**
     * Get chatbot statistics
     */
    async getStats(tenantId: string): Promise<{
        total: number;
        active: number;
        paused: number;
        draft: number;
        byChannel: Record<string, number>;
        totalConversations: number;
        totalMessages: number;
    }> {
        const chatbots = await this.findAll(tenantId);

        const stats = {
            total: chatbots.length,
            active: chatbots.filter(c => c.status === ChatbotStatus.ACTIVE).length,
            paused: chatbots.filter(c => c.status === ChatbotStatus.PAUSED).length,
            draft: chatbots.filter(c => c.status === ChatbotStatus.DRAFT).length,
            byChannel: {} as Record<string, number>,
            totalConversations: 0,
            totalMessages: 0,
        };

        for (const chatbot of chatbots) {
            stats.byChannel[chatbot.channel] = (stats.byChannel[chatbot.channel] || 0) + 1;
            stats.totalConversations += chatbot.conversationsCount;
            stats.totalMessages += chatbot.messagesCount;
        }

        return stats;
    }

    /**
     * Validate flow structure
     */
    private validateFlow(nodes: any[], connections: any[]): void {
        if (!nodes || nodes.length === 0) {
            throw new BadRequestException('Flow must have at least one node');
        }

        // Check for start node
        const hasStart = nodes.some(n => n.type === ChatbotNodeType.START);
        if (!hasStart) {
            throw new BadRequestException('Flow must have a START node');
        }

        // Check for end node
        const hasEnd = nodes.some(n => n.type === ChatbotNodeType.END);
        if (!hasEnd) {
            throw new BadRequestException('Flow must have an END node');
        }

        // Validate connections reference existing nodes
        const nodeIds = new Set(nodes.map(n => n.id));
        for (const conn of connections || []) {
            if (!nodeIds.has(conn.sourceNodeId)) {
                throw new BadRequestException(`Invalid connection: source node ${conn.sourceNodeId} not found`);
            }
            if (!nodeIds.has(conn.targetNodeId)) {
                throw new BadRequestException(`Invalid connection: target node ${conn.targetNodeId} not found`);
            }
        }
    }
}
