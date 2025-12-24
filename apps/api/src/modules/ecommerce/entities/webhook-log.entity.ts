import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Entity to log all webhook requests for debugging and audit purposes.
 */
@Entity('ecommerce_webhook_logs')
@Index(['platform', 'createdAt'])
@Index(['status', 'createdAt'])
export class WebhookLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * Platform that sent the webhook (shopify, woocommerce)
     */
    @Column()
    platform: string;

    /**
     * Webhook topic/type
     */
    @Column()
    topic: string;

    /**
     * Store domain/identifier
     */
    @Column({ name: 'store_domain', nullable: true })
    storeDomain: string;

    /**
     * Webhook event ID (for deduplication tracking)
     */
    @Column({ name: 'event_id', nullable: true })
    eventId: string;

    /**
     * Request payload (stored as JSON)
     */
    @Column({ type: 'jsonb', nullable: true })
    payload: Record<string, any>;

    /**
     * Processing status
     */
    @Column({
        type: 'enum',
        enum: ['received', 'processing', 'success', 'failed', 'duplicate'],
        default: 'received'
    })
    status: 'received' | 'processing' | 'success' | 'failed' | 'duplicate';

    /**
     * Error message if processing failed
     */
    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    /**
     * Processing duration in milliseconds
     */
    @Column({ name: 'duration_ms', nullable: true })
    durationMs: number;

    /**
     * Number of retry attempts
     */
    @Column({ name: 'retry_count', default: 0 })
    retryCount: number;

    /**
     * When the webhook was received
     */
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    /**
     * When processing completed
     */
    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date;
}
