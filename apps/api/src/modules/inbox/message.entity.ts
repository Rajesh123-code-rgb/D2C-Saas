import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum MessageDirection {
    INBOUND = 'inbound',
    OUTBOUND = 'outbound',
}

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio',
    DOCUMENT = 'document',
    LOCATION = 'location',
    CONTACT = 'contact',
    TEMPLATE = 'template',
    INTERACTIVE = 'interactive',
    STICKER = 'sticker',
    REACTION = 'reaction',
}

export enum MessageStatus {
    PENDING = 'pending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
    FAILED = 'failed',
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    conversationId: string;

    @Column({
        type: 'enum',
        enum: MessageDirection,
    })
    direction: MessageDirection;

    @Column({
        type: 'enum',
        enum: MessageType,
        default: MessageType.TEXT,
    })
    messageType: MessageType;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ type: 'jsonb', nullable: true })
    media: {
        url?: string;
        mimeType?: string;
        filename?: string;
        caption?: string;
    };

    @Column({ nullable: true })
    externalMessageId: string; // Platform-specific message ID (WhatsApp WAM ID, Instagram message ID)

    @Column({
        type: 'enum',
        enum: MessageStatus,
        default: MessageStatus.PENDING,
    })
    status: MessageStatus;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ nullable: true })
    sentBy: string; // User ID if outbound

    @Column({ type: 'timestamp', nullable: true })
    sentAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    deliveredAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    readAt: Date;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    // Email-specific tracking fields
    @Column({ nullable: true })
    emailMessageId: string; // SMTP message ID from send response

    @Column({ type: 'timestamp', nullable: true })
    openedAt: Date; // First time email was opened

    @Column({ type: 'int', default: 0 })
    openCount: number; // Number of times email was opened

    @CreateDateColumn()
    createdAt: Date;

    // Relations
    @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversationId' })
    conversation: Conversation;
}
