import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

/**
 * Channel types supported by chatbots
 */
export type ChatbotChannel = 'whatsapp' | 'instagram' | 'email';

/**
 * Chatbot status
 */
export enum ChatbotStatus {
    ACTIVE = 'active',
    PAUSED = 'paused',
    DRAFT = 'draft',
}

/**
 * Node types in the chatbot flow
 */
export enum ChatbotNodeType {
    // Entry point
    START = 'start',

    // Message nodes
    MESSAGE = 'message',           // Send text/media
    BUTTONS = 'buttons',           // Message with buttons
    LIST = 'list',                 // WhatsApp list message

    // Input nodes
    QUESTION = 'question',         // Ask and wait for response

    // Logic nodes
    CONDITION = 'condition',       // If/else branching
    DELAY = 'delay',               // Wait before continuing

    // Action nodes
    ACTION = 'action',             // Add tag, update contact, etc.
    WEBHOOK = 'webhook',           // Call external API

    // Handoff nodes
    ASSIGN_AGENT = 'assign_agent', // Hand off to human

    // End node
    END = 'end',
}

/**
 * Trigger types for starting the chatbot (chat/DM flows only)
 * Note: Automation triggers (comment auto-reply, story mentions) are in Automations module
 */
export enum ChatbotTriggerType {
    // Message triggers for chat conversations
    ANY_MESSAGE = 'any_message',       // Any incoming DM/chat message
    KEYWORD = 'keyword',               // Specific keyword in message
    NEW_CONVERSATION = 'new_conversation', // First message in a conversation

    // WhatsApp specific
    TEMPLATE_REPLY = 'template_reply', // Reply to a template message
}

/**
 * Flow node structure
 */
export interface ChatbotFlowNode {
    id: string;
    type: ChatbotNodeType;
    position: { x: number; y: number };
    data: {
        label?: string;
        // Message content
        message?: string;
        mediaUrl?: string;
        mediaType?: 'image' | 'video' | 'document' | 'audio';

        // Buttons (for BUTTONS node)
        buttons?: Array<{
            id: string;
            text: string;
            type: 'reply' | 'url' | 'phone';
            value?: string; // URL or phone number
        }>;

        // List items (for LIST node - WhatsApp only)
        listHeader?: string;
        listButtonText?: string;
        sections?: Array<{
            title: string;
            items: Array<{
                id: string;
                title: string;
                description?: string;
            }>;
        }>;

        // Question settings
        variableName?: string;     // Store answer in this variable
        validationType?: 'text' | 'email' | 'phone' | 'number';
        validationMessage?: string;

        // Condition settings (single condition - legacy)
        conditionField?: string;   // Field to check
        conditionOperator?: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'gt' | 'lt' | 'exists';
        conditionValue?: string;

        // Multiple conditions (for complex branching)
        conditions?: Array<{
            id: string;
            variable: string;
            operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
            value: string;
        }>;

        // Delay settings
        delayType?: 'seconds' | 'minutes' | 'hours';
        delayValue?: number;

        // Action settings
        actionType?: 'add_tag' | 'remove_tag' | 'update_field' | 'subscribe' | 'unsubscribe';
        actionData?: Record<string, any>;

        // Webhook settings
        webhookUrl?: string;
        webhookMethod?: 'GET' | 'POST';
        webhookHeaders?: Record<string, string>;

        // Agent assignment
        assignmentType?: 'round_robin' | 'least_busy' | 'specific';
        agentId?: string;
        teamId?: string;
        handoffMessage?: string; // Message shown when handing off to agent
    };
}

/**
 * Connection between nodes
 */
export interface ChatbotFlowConnection {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string; // For condition nodes: 'true' | 'false'
    label?: string;
}

/**
 * Trigger configuration
 */
export interface ChatbotTriggerConfig {
    type: ChatbotTriggerType;
    keywords?: string[];                // For KEYWORD trigger
    keywordMatchType?: 'exact' | 'contains' | 'starts_with';
    postIds?: string[];                 // For COMMENT trigger (specific posts)
    includeAllPosts?: boolean;          // For COMMENT trigger
}

@Entity('chatbots')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'channel'])
export class Chatbot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'varchar',
        length: 20,
    })
    channel: ChatbotChannel;

    @Column({
        type: 'enum',
        enum: ChatbotStatus,
        default: ChatbotStatus.DRAFT,
    })
    status: ChatbotStatus;

    @Column({ name: 'channel_id', nullable: true })
    channelId: string; // Optional: tie to specific channel

    // Trigger configuration
    @Column({ name: 'trigger_config', type: 'jsonb', default: {} })
    triggerConfig: ChatbotTriggerConfig;

    // Flow configuration
    @Column({ type: 'jsonb', default: [] })
    nodes: ChatbotFlowNode[];

    @Column({ type: 'jsonb', default: [] })
    connections: ChatbotFlowConnection[];

    // Default messages
    @Column({ name: 'welcome_message', type: 'text', nullable: true })
    welcomeMessage: string;

    @Column({ name: 'fallback_message', type: 'text', nullable: true })
    fallbackMessage: string;

    @Column({ name: 'off_hours_message', type: 'text', nullable: true })
    offHoursMessage: string;

    // Business hours (optional)
    @Column({ name: 'business_hours', type: 'jsonb', nullable: true })
    businessHours: {
        enabled: boolean;
        timezone: string;
        schedule: Array<{
            day: number; // 0-6
            start: string; // HH:MM
            end: string;   // HH:MM
        }>;
    };

    // Variables used in the flow
    @Column({ type: 'jsonb', default: [] })
    variables: Array<{
        name: string;
        type: 'text' | 'number' | 'email' | 'phone' | 'date';
        defaultValue?: string;
    }>;

    // Stats
    @Column({ name: 'conversations_count', default: 0 })
    conversationsCount: number;

    @Column({ name: 'messages_count', default: 0 })
    messagesCount: number;

    @Column({ name: 'completed_count', default: 0 })
    completedCount: number;

    @Column({ name: 'handoff_count', default: 0 })
    handoffCount: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'last_active_at', nullable: true })
    lastActiveAt: Date;
}
