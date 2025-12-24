import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { EcommerceStore } from './store.entity';
import { Contact } from '../../contacts/contact.entity';

export enum EcommerceEventType {
    // Order events
    ORDER_CREATED = 'order_created',
    ORDER_CONFIRMED = 'order_confirmed',
    ORDER_PROCESSING = 'order_processing',
    ORDER_SHIPPED = 'order_shipped',
    ORDER_OUT_FOR_DELIVERY = 'order_out_for_delivery',
    ORDER_DELIVERED = 'order_delivered',
    ORDER_CANCELLED = 'order_cancelled',
    ORDER_REFUNDED = 'order_refunded',
    ORDER_RETURNED = 'order_returned',

    // Payment events
    PAYMENT_SUCCESS = 'payment_success',
    PAYMENT_FAILED = 'payment_failed',
    PAYMENT_REFUNDED = 'payment_refunded',
    COD_CONFIRMED = 'cod_confirmed',
    COD_REJECTED = 'cod_rejected',

    // Cart events
    CART_CREATED = 'cart_created',
    CART_UPDATED = 'cart_updated',
    CART_ABANDONED = 'cart_abandoned',
    CART_RECOVERED = 'cart_recovered',

    // Customer events
    CUSTOMER_CREATED = 'customer_created',
    CUSTOMER_UPDATED = 'customer_updated',
    FIRST_ORDER = 'first_order',
    REPEAT_ORDER = 'repeat_order',
    HIGH_VALUE_ORDER = 'high_value_order',

    // Product events
    PRODUCT_VIEWED = 'product_viewed',
    PRODUCT_ADDED_TO_CART = 'product_added_to_cart',
    PRODUCT_BACK_IN_STOCK = 'product_back_in_stock',
}

@Entity('ecommerce_events')
@Index(['tenantId', 'eventType'])
@Index(['tenantId', 'processed'])
@Index(['contactId'])
@Index(['createdAt'])
export class EcommerceEvent {
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

    @Column({
        name: 'event_type',
        type: 'enum',
        enum: EcommerceEventType,
    })
    eventType: EcommerceEventType;

    @Column({ name: 'reference_id', nullable: true })
    referenceId: string; // order_id or cart_id

    @Column({ name: 'reference_type', nullable: true })
    referenceType: 'order' | 'cart' | 'product';

    @Column({ type: 'jsonb' })
    payload: Record<string, any>;

    @Column({ default: false })
    processed: boolean;

    @Column({ name: 'processed_at', nullable: true })
    processedAt: Date;

    @Column({ name: 'automation_triggered', default: false })
    automationTriggered: boolean;

    @Column({ name: 'automation_id', nullable: true })
    automationId: string;

    @Column({ type: 'text', nullable: true })
    error: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
