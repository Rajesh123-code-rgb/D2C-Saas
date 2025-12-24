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

export enum CarrierType {
    DELHIVERY = 'delhivery',
    SHIPROCKET = 'shiprocket',
    BLUEDART = 'bluedart',
    DTDC = 'dtdc',
    ECOM_EXPRESS = 'ecom_express',
    XPRESSBEES = 'xpressbees',
    SHADOWFAX = 'shadowfax',
    CUSTOM = 'custom',
}

export enum ShipmentStatus {
    CREATED = 'created',
    PICKED_UP = 'picked_up',
    IN_TRANSIT = 'in_transit',
    OUT_FOR_DELIVERY = 'out_for_delivery',
    DELIVERED = 'delivered',
    FAILED_DELIVERY = 'failed_delivery',
    RTO_INITIATED = 'rto_initiated',
    RTO_DELIVERED = 'rto_delivered',
    CANCELLED = 'cancelled',
}

@Entity('carrier_connections')
@Index(['tenantId', 'carrier'])
export class CarrierConnection {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column({
        type: 'enum',
        enum: CarrierType,
    })
    carrier: CarrierType;

    @Column()
    name: string; // Display name e.g., "Delhivery - Primary"

    @Column({ name: 'api_key', type: 'text', nullable: true })
    apiKey: string;

    @Column({ name: 'api_secret', type: 'text', nullable: true })
    apiSecret: string;

    @Column({ name: 'account_id', nullable: true })
    accountId: string;

    @Column({ name: 'webhook_secret', nullable: true })
    webhookSecret: string;

    @Column({ name: 'base_url', nullable: true })
    baseUrl: string; // For custom carriers

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'is_default', default: false })
    isDefault: boolean;

    @Column({ type: 'jsonb', nullable: true })
    settings: {
        enableAutoTracking?: boolean;
        trackingUpdateInterval?: number; // in hours
        sendShippingUpdate?: boolean;
        sendDeliveryConfirmation?: boolean;
        sendRTOAlert?: boolean;
    };

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('shipments')
@Index(['tenantId', 'status'])
@Index(['trackingNumber'])
@Index(['orderId'])
export class Shipment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'order_id' })
    orderId: string;

    @Column({ name: 'carrier_id', nullable: true })
    carrierId: string;

    @Column({
        type: 'enum',
        enum: CarrierType,
    })
    carrier: CarrierType;

    @Column({ name: 'tracking_number' })
    trackingNumber: string;

    @Column({ name: 'awb_number', nullable: true })
    awbNumber: string;

    @Column({
        type: 'enum',
        enum: ShipmentStatus,
        default: ShipmentStatus.CREATED,
    })
    status: ShipmentStatus;

    @Column({ name: 'status_message', nullable: true })
    statusMessage: string;

    // Shipping details
    @Column({ name: 'weight', type: 'decimal', precision: 10, scale: 2, nullable: true })
    weight: number;

    @Column({ name: 'dimensions', type: 'jsonb', nullable: true })
    dimensions: { length: number; width: number; height: number };

    @Column({ name: 'shipping_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
    shippingCost: number;

    // Current location
    @Column({ name: 'current_location', nullable: true })
    currentLocation: string;

    @Column({ name: 'expected_delivery', nullable: true })
    expectedDelivery: Date;

    // Tracking history
    @Column({ name: 'tracking_history', type: 'jsonb', default: [] })
    trackingHistory: Array<{
        status: string;
        location: string;
        timestamp: Date;
        description: string;
    }>;

    // Delivery attempt tracking
    @Column({ name: 'delivery_attempts', default: 0 })
    deliveryAttempts: number;

    @Column({ name: 'last_attempt_at', nullable: true })
    lastAttemptAt: Date;

    @Column({ name: 'last_attempt_reason', nullable: true })
    lastAttemptReason: string;

    // RTO tracking
    @Column({ name: 'is_rto', default: false })
    isRTO: boolean;

    @Column({ name: 'rto_reason', nullable: true })
    rtoReason: string;

    @Column({ name: 'rto_initiated_at', nullable: true })
    rtoInitiatedAt: Date;

    // Timestamps
    @Column({ name: 'shipped_at', nullable: true })
    shippedAt: Date;

    @Column({ name: 'picked_up_at', nullable: true })
    pickedUpAt: Date;

    @Column({ name: 'delivered_at', nullable: true })
    deliveredAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
