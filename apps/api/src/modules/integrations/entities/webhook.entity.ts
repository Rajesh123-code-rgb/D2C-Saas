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

export enum WebhookEvent {
    CONTACT_CREATED = 'contact.created',
    CONTACT_UPDATED = 'contact.updated',
    CONTACT_DELETED = 'contact.deleted',
    ORDER_CREATED = 'order.created',
    ORDER_UPDATED = 'order.updated',
    ORDER_SHIPPED = 'order.shipped',
    ORDER_DELIVERED = 'order.delivered',
    CART_ABANDONED = 'cart.abandoned',
    CART_RECOVERED = 'cart.recovered',
    MESSAGE_RECEIVED = 'message.received',
    MESSAGE_SENT = 'message.sent',
    CAMPAIGN_SENT = 'campaign.sent',
    AUTOMATION_TRIGGERED = 'automation.triggered',
}

@Entity('custom_webhooks')
@Index(['tenantId'])
@Index(['tenantId', 'isActive'])
export class CustomWebhook {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text' })
    targetUrl: string;

    @Column({ type: 'enum', enum: WebhookEvent, array: true })
    events: WebhookEvent[];

    @Column({ type: 'jsonb', nullable: true })
    headers: Record<string, string>;

    @Column({ type: 'varchar', length: 255 })
    secretKey: string;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'boolean', default: true })
    includePayload: boolean;

    @Column({ type: 'int', default: 3 })
    retryCount: number;

    @Column({ type: 'int', default: 0 })
    successCount: number;

    @Column({ type: 'int', default: 0 })
    failureCount: number;

    @Column({ type: 'timestamp', nullable: true })
    lastTriggeredAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    lastSuccessAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    lastFailureAt: Date;

    @Column({ type: 'text', nullable: true })
    lastError: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('webhook_logs')
@Index(['webhookId', 'createdAt'])
export class WebhookLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    webhookId: string;

    @ManyToOne(() => CustomWebhook)
    @JoinColumn({ name: 'webhookId' })
    webhook: CustomWebhook;

    @Column({ type: 'enum', enum: WebhookEvent })
    event: WebhookEvent;

    @Column({ type: 'jsonb', nullable: true })
    payload: Record<string, any>;

    @Column({ type: 'int' })
    statusCode: number;

    @Column({ type: 'text', nullable: true })
    responseBody: string;

    @Column({ type: 'int' })
    duration: number; // ms

    @Column({ type: 'boolean' })
    success: boolean;

    @Column({ type: 'text', nullable: true })
    error: string;

    @Column({ type: 'int', default: 0 })
    attemptNumber: number;

    @CreateDateColumn()
    createdAt: Date;
}
