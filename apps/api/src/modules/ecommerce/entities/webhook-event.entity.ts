import {
    Entity,
    Column,
    PrimaryColumn,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Entity to track processed webhook events for idempotency.
 * Prevents processing the same webhook event twice.
 */
@Entity('ecommerce_webhook_events')
@Index(['platform', 'processedAt'])
export class WebhookEvent {
    /**
     * Unique event ID from the platform (e.g., x-shopify-webhook-id)
     */
    @PrimaryColumn({ name: 'event_id' })
    eventId: string;

    /**
     * Platform that sent the webhook (shopify, woocommerce)
     */
    @Column()
    platform: string;

    /**
     * Webhook topic/type (e.g., orders/create, orders/updated)
     */
    @Column()
    topic: string;

    /**
     * Store ID associated with this event
     */
    @Column({ name: 'store_id', nullable: true })
    storeId: string;

    /**
     * Whether the event was processed successfully
     */
    @Column({ default: false })
    success: boolean;

    /**
     * Error message if processing failed
     */
    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    /**
     * Number of processing attempts
     */
    @Column({ name: 'attempt_count', default: 1 })
    attemptCount: number;

    /**
     * When the event was first received
     */
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    /**
     * When the event was last processed
     */
    @Column({ name: 'processed_at', type: 'timestamp' })
    processedAt: Date;
}
