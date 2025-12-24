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
import { Chatbot } from './chatbot.entity';
import { Contact } from '../contacts/contact.entity';
import { Conversation } from '../inbox/conversation.entity';

/**
 * Session status
 */
export enum ChatbotSessionStatus {
    ACTIVE = 'active',           // Bot is handling conversation
    PAUSED = 'paused',           // Waiting for user input
    COMPLETED = 'completed',     // Flow finished normally
    HANDED_OFF = 'handed_off',   // Transferred to human agent
    EXPIRED = 'expired',         // Session timed out
    FAILED = 'failed',           // Error occurred
}

/**
 * Tracks an active chatbot conversation with a user
 */
@Entity('chatbot_sessions')
@Index(['tenantId', 'status'])
@Index(['chatbotId', 'status'])
@Index(['contactId'])
export class ChatbotSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'chatbot_id' })
    chatbotId: string;

    @ManyToOne(() => Chatbot)
    @JoinColumn({ name: 'chatbot_id' })
    chatbot: Chatbot;

    @Column({ name: 'contact_id' })
    contactId: string;

    @ManyToOne(() => Contact)
    @JoinColumn({ name: 'contact_id' })
    contact: Contact;

    @Column({ name: 'conversation_id', nullable: true })
    conversationId: string;

    @ManyToOne(() => Conversation)
    @JoinColumn({ name: 'conversation_id' })
    conversation: Conversation;

    @Column({
        type: 'enum',
        enum: ChatbotSessionStatus,
        default: ChatbotSessionStatus.ACTIVE,
    })
    status: ChatbotSessionStatus;

    // Current position in flow
    @Column({ name: 'current_node_id', nullable: true })
    currentNodeId: string;

    // Variables collected during conversation
    @Column({ type: 'jsonb', default: {} })
    variables: Record<string, any>;

    // Message history for context
    @Column({ name: 'message_history', type: 'jsonb', default: [] })
    messageHistory: Array<{
        nodeId?: string;
        direction?: 'in' | 'out';
        role?: 'user' | 'bot';
        content: string;
        timestamp: string;
    }>;

    // What triggered this session
    @Column({ name: 'trigger_type', nullable: true })
    triggerType: string;

    @Column({ name: 'trigger_data', type: 'jsonb', nullable: true })
    triggerData: Record<string, any>; // e.g., comment ID, keyword matched

    // Retry tracking
    @Column({ name: 'retry_count', default: 0 })
    retryCount: number;

    @Column({ name: 'last_retry_at', nullable: true })
    lastRetryAt: Date;

    // Handoff information
    @Column({ name: 'handed_off_to', nullable: true })
    handedOffTo: string; // Agent ID

    @Column({ name: 'handed_off_at', nullable: true })
    handedOffAt: Date;

    @Column({ name: 'handoff_reason', nullable: true })
    handoffReason: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'completed_at', nullable: true })
    completedAt: Date;

    @Column({ name: 'expires_at', nullable: true })
    expiresAt: Date; // For session timeout
}
