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
import { Tenant } from '../../tenants/tenant.entity';
import { EcommerceStore } from './store.entity';
import { Contact } from '../../contacts/contact.entity';

export enum CartRecoveryStatus {
    PENDING = 'pending',
    REMINDER_SENT = 'reminder_sent',
    RECOVERED = 'recovered',
    LOST = 'lost',
    EXPIRED = 'expired',
}

export interface CartItem {
    productId: string;
    platformProductId: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    originalPrice?: number;
    variantId?: string;
    variantName?: string;
    imageUrl?: string;
}

@Entity('abandoned_carts')
@Index(['tenantId', 'recoveryStatus'])
@Index(['tenantId', 'abandonedAt'])
export class AbandonedCart {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column({ name: 'store_id' })
    storeId: string;

    @ManyToOne(() => EcommerceStore)
    @JoinColumn({ name: 'store_id' })
    store: EcommerceStore;

    @Column({ name: 'contact_id', nullable: true })
    contactId: string;

    @ManyToOne(() => Contact)
    @JoinColumn({ name: 'contact_id' })
    contact: Contact;

    @Column({ name: 'platform_cart_id', nullable: true })
    platformCartId: string;

    @Column({ name: 'checkout_url', nullable: true })
    checkoutUrl: string;

    @Column({ type: 'jsonb', default: [] })
    items: CartItem[];

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    subtotal: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    total: number;

    @Column({ default: 'INR' })
    currency: string;

    @Column({
        name: 'recovery_status',
        type: 'enum',
        enum: CartRecoveryStatus,
        default: CartRecoveryStatus.PENDING,
    })
    recoveryStatus: CartRecoveryStatus;

    @Column({ name: 'reminder_count', default: 0 })
    reminderCount: number;

    @Column({ name: 'max_reminders', default: 3 })
    maxReminders: number;

    @Column({ name: 'last_reminded_at', nullable: true })
    lastRemindedAt: Date;

    @Column({ name: 'next_reminder_at', nullable: true })
    nextReminderAt: Date;

    @Column({ name: 'abandoned_at' })
    abandonedAt: Date;

    @Column({ name: 'recovered_at', nullable: true })
    recoveredAt: Date;

    @Column({ name: 'recovered_order_id', nullable: true })
    recoveredOrderId: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
