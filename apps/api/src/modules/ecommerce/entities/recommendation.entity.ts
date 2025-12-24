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

export enum RecommendationType {
    UPSELL = 'upsell',
    CROSS_SELL = 'cross_sell',
    REORDER = 'reorder',
    FREQUENTLY_BOUGHT_TOGETHER = 'frequently_bought_together',
    SIMILAR_PRODUCTS = 'similar_products',
    TRENDING = 'trending',
    PERSONALIZED = 'personalized',
}

@Entity('product_recommendations')
@Index(['tenantId', 'type'])
@Index(['sourceProductId'])
export class ProductRecommendation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column({
        type: 'enum',
        enum: RecommendationType,
    })
    type: RecommendationType;

    @Column({ name: 'source_product_id', nullable: true })
    sourceProductId: string;

    @Column({ name: 'source_category', nullable: true })
    sourceCategory: string;

    @Column({ name: 'recommended_product_id' })
    recommendedProductId: string;

    @Column({ name: 'recommended_product_name' })
    recommendedProductName: string;

    @Column({ name: 'recommended_product_image', nullable: true })
    recommendedProductImage: string;

    @Column({ name: 'recommended_product_price', type: 'decimal', precision: 10, scale: 2 })
    recommendedProductPrice: number;

    @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
    score: number; // Recommendation score 0-1

    @Column({ name: 'display_order', default: 0 })
    displayOrder: number;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    // Performance tracking
    @Column({ name: 'impressions', default: 0 })
    impressions: number;

    @Column({ name: 'clicks', default: 0 })
    clicks: number;

    @Column({ name: 'conversions', default: 0 })
    conversions: number;

    @Column({ name: 'revenue', type: 'decimal', precision: 10, scale: 2, default: 0 })
    revenue: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('reorder_reminders')
@Index(['tenantId', 'contactId'])
@Index(['status'])
export class ReorderReminder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'contact_id' })
    contactId: string;

    @Column({ name: 'product_id' })
    productId: string;

    @Column({ name: 'product_name' })
    productName: string;

    @Column({ name: 'product_image', nullable: true })
    productImage: string;

    @Column({ name: 'last_order_id' })
    lastOrderId: string;

    @Column({ name: 'last_order_date' })
    lastOrderDate: Date;

    @Column({ name: 'estimated_reorder_date' })
    estimatedReorderDate: Date;

    @Column({ name: 'reorder_cycle_days', default: 30 })
    reorderCycleDays: number;

    @Column({
        type: 'enum',
        enum: ['pending', 'sent', 'clicked', 'converted', 'dismissed', 'snoozed'],
        default: 'pending',
    })
    status: 'pending' | 'sent' | 'clicked' | 'converted' | 'dismissed' | 'snoozed';

    @Column({ name: 'reminder_count', default: 0 })
    reminderCount: number;

    @Column({ name: 'last_reminded_at', nullable: true })
    lastRemindedAt: Date;

    @Column({ name: 'converted_order_id', nullable: true })
    convertedOrderId: string;

    @Column({ name: 'snoozed_until', nullable: true })
    snoozedUntil: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
