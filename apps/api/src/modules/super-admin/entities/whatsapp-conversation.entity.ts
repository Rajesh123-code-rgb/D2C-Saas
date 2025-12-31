import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { Contact } from '../../contacts/contact.entity';
import { ConversationCategory } from './conversation-pricing.entity';

export enum ConversationWindowStatus {
    OPEN = 'open',
    CLOSED = 'closed',
    EXPIRED = 'expired',
}

@Entity('whatsapp_conversations')
@Index(['tenantId', 'contactId', 'isWindowOpen'])
@Index(['tenantId', 'windowExpiresAt'])
@Index(['metaConversationId'])
@Index(['isBillable'])
export class WhatsAppConversation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column({ type: 'uuid' })
    contactId: string;

    @ManyToOne(() => Contact)
    @JoinColumn({ name: 'contactId' })
    contact: Contact;

    @Column({ type: 'varchar', length: 255 })
    phoneNumberId: string;  // WhatsApp Business phone number ID

    @Column({ type: 'varchar', length: 20 })
    contactPhone: string;  // Contact's phone number

    @Column({ type: 'varchar', length: 2, nullable: true })
    contactCountry: string;  // For pricing lookup

    // Meta conversation details
    @Column({ type: 'varchar', length: 255, nullable: true })
    metaConversationId: string;

    @Column({
        type: 'enum',
        enum: ConversationCategory,
    })
    category: ConversationCategory;

    // Window tracking
    @Column({ type: 'timestamp' })
    windowOpenedAt: Date;

    @Column({ type: 'timestamp' })
    windowExpiresAt: Date;  // 24 hours from open

    @Column({ type: 'boolean', default: true })
    isWindowOpen: boolean;

    @Column({
        type: 'enum',
        enum: ConversationWindowStatus,
        default: ConversationWindowStatus.OPEN,
    })
    windowStatus: ConversationWindowStatus;

    // Billing
    @Column({ type: 'boolean', default: true })
    isBillable: boolean;  // Service = false (free)

    @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
    creditsCost: number;

    @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
    currencyCost: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
    metaCost: number;  // What we pay Meta

    @Column({ type: 'timestamp', nullable: true })
    billedAt: Date;

    @Column({ type: 'uuid', nullable: true })
    transactionId: string;  // Link to message_transactions

    // Messages in this conversation
    @Column({ type: 'int', default: 0 })
    messageCount: number;

    @Column({ type: 'int', default: 0 })
    inboundMessageCount: number;

    @Column({ type: 'int', default: 0 })
    outboundMessageCount: number;

    // Initiated by
    @Column({ type: 'varchar', length: 20 })
    initiatedBy: 'business' | 'customer';

    @Column({ type: 'uuid', nullable: true })
    firstMessageId: string;

    @Column({ type: 'uuid', nullable: true })
    lastMessageId: string;

    @Column({ type: 'timestamp', nullable: true })
    lastMessageAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Helper methods
    isExpired(): boolean {
        return new Date() > this.windowExpiresAt;
    }

    canSendFreeFormMessage(): boolean {
        return this.isWindowOpen && !this.isExpired();
    }

    getRemainingWindowTime(): number {
        const now = new Date().getTime();
        const expires = this.windowExpiresAt.getTime();
        return Math.max(0, expires - now);
    }

    getRemainingWindowMinutes(): number {
        return Math.floor(this.getRemainingWindowTime() / (1000 * 60));
    }
}
