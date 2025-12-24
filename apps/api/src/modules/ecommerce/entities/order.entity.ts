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

export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    OUT_FOR_DELIVERY = 'out_for_delivery',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded',
    RETURNED = 'returned',
}

export enum PaymentStatus {
    PENDING = 'pending',
    PAID = 'paid',
    FAILED = 'failed',
    REFUNDED = 'refunded',
    COD_PENDING = 'cod_pending',
    COD_COLLECTED = 'cod_collected',
}

export enum PaymentMethod {
    PREPAID = 'prepaid',
    COD = 'cod',
    UPI = 'upi',
    CARD = 'card',
    NET_BANKING = 'net_banking',
    WALLET = 'wallet',
    OTHER = 'other',
}

export interface OrderItem {
    productId: string;
    platformProductId: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    originalPrice?: number;
    discount?: number;
    variantId?: string;
    variantName?: string;
    imageUrl?: string;
    weight?: number;
}

export interface OrderAddress {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    company?: string;
}

@Entity('ecommerce_orders')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'orderDate'])
@Index(['contactId'])
export class EcommerceOrder {
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

    @Column({ name: 'platform_order_id' })
    platformOrderId: string;

    @Column({ name: 'order_number' })
    orderNumber: string;

    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.PENDING,
    })
    status: OrderStatus;

    @Column({
        name: 'payment_status',
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    paymentStatus: PaymentStatus;

    @Column({
        name: 'payment_method',
        type: 'enum',
        enum: PaymentMethod,
        default: PaymentMethod.OTHER,
    })
    paymentMethod: PaymentMethod;

    @Column({ default: 'INR' })
    currency: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    subtotal: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    discount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    shipping: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    tax: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    total: number;

    @Column({ type: 'jsonb', default: [] })
    items: OrderItem[];

    @Column({ name: 'shipping_address', type: 'jsonb', nullable: true })
    shippingAddress: OrderAddress;

    @Column({ name: 'billing_address', type: 'jsonb', nullable: true })
    billingAddress: OrderAddress;

    @Column({ name: 'tracking_number', nullable: true })
    trackingNumber: string;

    @Column({ nullable: true })
    carrier: string;

    @Column({ name: 'tracking_url', nullable: true })
    trackingUrl: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ name: 'customer_note', type: 'text', nullable: true })
    customerNote: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    // Automation tracking
    @Column({ name: 'confirmation_sent', default: false })
    confirmationSent: boolean;

    @Column({ name: 'shipping_notification_sent', default: false })
    shippingNotificationSent: boolean;

    @Column({ name: 'delivery_notification_sent', default: false })
    deliveryNotificationSent: boolean;

    @Column({ name: 'cod_confirmation_sent', default: false })
    codConfirmationSent: boolean;

    @Column({ name: 'cod_confirmed', nullable: true })
    codConfirmed: boolean;

    @Column({ name: 'order_date' })
    orderDate: Date;

    @Column({ name: 'confirmed_at', nullable: true })
    confirmedAt: Date;

    @Column({ name: 'shipped_at', nullable: true })
    shippedAt: Date;

    @Column({ name: 'delivered_at', nullable: true })
    deliveredAt: Date;

    @Column({ name: 'cancelled_at', nullable: true })
    cancelledAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
