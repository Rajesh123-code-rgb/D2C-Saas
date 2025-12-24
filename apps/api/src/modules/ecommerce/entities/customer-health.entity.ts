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
import { Contact } from '../../contacts/contact.entity';

export enum HealthStatus {
    EXCELLENT = 'excellent',
    GOOD = 'good',
    AT_RISK = 'at_risk',
    CHURNING = 'churning',
    CHURNED = 'churned',
}

@Entity('customer_health_scores')
@Index(['tenantId', 'contactId'])
@Index(['healthStatus'])
export class CustomerHealthScore {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'contact_id', unique: true })
    contactId: string;

    @ManyToOne(() => Contact)
    @JoinColumn({ name: 'contact_id' })
    contact: Contact;

    // Overall health
    @Column({ name: 'health_score', type: 'decimal', precision: 5, scale: 2, default: 50 })
    healthScore: number; // 0-100

    @Column({
        name: 'health_status',
        type: 'enum',
        enum: HealthStatus,
        default: HealthStatus.GOOD,
    })
    healthStatus: HealthStatus;

    // Score components
    @Column({ name: 'purchase_frequency_score', type: 'decimal', precision: 5, scale: 2, default: 50 })
    purchaseFrequencyScore: number;

    @Column({ name: 'monetary_value_score', type: 'decimal', precision: 5, scale: 2, default: 50 })
    monetaryValueScore: number;

    @Column({ name: 'recency_score', type: 'decimal', precision: 5, scale: 2, default: 50 })
    recencyScore: number;

    @Column({ name: 'engagement_score', type: 'decimal', precision: 5, scale: 2, default: 50 })
    engagementScore: number;

    // COD Risk Score
    @Column({ name: 'cod_risk_score', type: 'decimal', precision: 5, scale: 2, default: 50 })
    codRiskScore: number; // 0-100, higher = more reliable

    @Column({ name: 'cod_orders_total', default: 0 })
    codOrdersTotal: number;

    @Column({ name: 'cod_orders_delivered', default: 0 })
    codOrdersDelivered: number;

    @Column({ name: 'cod_orders_rto', default: 0 })
    codOrdersRTO: number;

    // Behavior metrics
    @Column({ name: 'days_since_last_order', default: 0 })
    daysSinceLastOrder: number;

    @Column({ name: 'average_order_gap_days', type: 'decimal', precision: 10, scale: 2, nullable: true })
    averageOrderGapDays: number;

    @Column({ name: 'total_orders', default: 0 })
    totalOrders: number;

    @Column({ name: 'total_spent', type: 'decimal', precision: 10, scale: 2, default: 0 })
    totalSpent: number;

    @Column({ name: 'average_order_value', type: 'decimal', precision: 10, scale: 2, default: 0 })
    averageOrderValue: number;

    // Engagement metrics
    @Column({ name: 'message_response_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
    messageResponseRate: number;

    @Column({ name: 'campaign_open_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
    campaignOpenRate: number;

    // Churn prediction
    @Column({ name: 'churn_probability', type: 'decimal', precision: 5, scale: 4, default: 0 })
    churnProbability: number; // 0-1

    @Column({ name: 'predicted_churn_date', nullable: true })
    predictedChurnDate: Date;

    @Column({ name: 'churn_risk_factors', type: 'jsonb', nullable: true })
    churnRiskFactors: string[];

    // Win-back tracking
    @Column({ name: 'win_back_eligible', default: false })
    winBackEligible: boolean;

    @Column({ name: 'win_back_tier', nullable: true })
    winBackTier: '30_day' | '60_day' | '90_day' | '120_day';

    @Column({ name: 'last_win_back_at', nullable: true })
    lastWinBackAt: Date;

    @Column({ name: 'win_back_attempts', default: 0 })
    winBackAttempts: number;

    @Column({ name: 'last_calculated_at' })
    lastCalculatedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
