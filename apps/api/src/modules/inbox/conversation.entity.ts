import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Contact } from '../contacts/contact.entity';
import { User } from '../users/user.entity';
import { Message } from './message.entity';
import { ChannelType } from '../channels/channel.entity';
import { Chatbot } from '../chatbots/chatbot.entity';

export enum ConversationStatus {
    OPEN = 'open',
    PENDING = 'pending',
    RESOLVED = 'resolved',
    SNOOZED = 'snoozed',
}

@Entity('conversations')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'channelType'])
@Index(['tenantId', 'assignedToId'])
export class Conversation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    tenantId: string;

    @Column()
    @Index()
    contactId: string;

    @Column({
        type: 'enum',
        enum: ChannelType,
    })
    channelType: ChannelType;

    @Column()
    channelId: string; // Channel entity ID

    @Column({ nullable: true })
    externalConversationId: string; // Platform-specific ID (WhatsApp conversation ID, Instagram thread ID)

    @Column({
        type: 'enum',
        enum: ConversationStatus,
        default: ConversationStatus.OPEN,
    })
    status: ConversationStatus;

    @Column({ nullable: true })
    @Index()
    assignedToId: string;

    @Column({ nullable: true })
    activeChatbotId: string;

    @Column('simple-array', { nullable: true })
    tags: string[];

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'int', default: 0 })
    unreadCount: number;

    @Column({ type: 'timestamp', nullable: true })
    lastMessageAt: Date;

    @Column({ type: 'text', nullable: true })
    lastMessagePreview: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Tenant, (tenant) => tenant.conversations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @ManyToOne(() => Contact, (contact) => contact.conversations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'contactId' })
    contact: Contact;

    @ManyToOne(() => User, (user) => user.assignedConversations, { nullable: true })
    @JoinColumn({ name: 'assignedToId' })
    assignedTo: User;

    @ManyToOne(() => Chatbot, { nullable: true })
    @JoinColumn({ name: 'activeChatbotId' })
    activeChatbot: Chatbot;

    @OneToMany(() => Message, (message) => message.conversation)
    messages: Message[];
}

