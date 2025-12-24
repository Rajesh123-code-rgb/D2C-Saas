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

export enum AIAgentType {
    MESSAGE_GENERATOR = 'message_generator',
    SEND_TIME_OPTIMIZER = 'send_time_optimizer',
    LEAD_SCORER = 'lead_scorer',
    CHURN_PREDICTOR = 'churn_predictor',
    INTENT_DETECTOR = 'intent_detector',
    NEXT_BEST_ACTION = 'next_best_action',
    AB_VARIANT_GENERATOR = 'ab_variant_generator',
}

export enum AITaskStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REQUIRES_APPROVAL = 'requires_approval',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Entity('ai_agents')
@Index(['tenantId', 'type'])
export class AIAgent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column({
        type: 'enum',
        enum: AIAgentType,
    })
    type: AIAgentType;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    // Configuration
    @Column({ type: 'jsonb', nullable: true })
    config: {
        // Message generator
        tone?: 'professional' | 'friendly' | 'casual' | 'urgent';
        language?: string;
        maxLength?: number;
        includeEmojis?: boolean;

        // Send time optimizer
        timezone?: string;
        businessHours?: { start: number; end: number };
        preferredDays?: number[];

        // Lead scorer
        scoringWeights?: Record<string, number>;
        minScore?: number;

        // Churn predictor
        churnThreshold?: number;
        lookbackDays?: number;

        // General
        requiresApproval?: boolean;
        confidenceThreshold?: number;
    };

    // Usage stats
    @Column({ name: 'total_runs', default: 0 })
    totalRuns: number;

    @Column({ name: 'successful_runs', default: 0 })
    successfulRuns: number;

    @Column({ name: 'approved_count', default: 0 })
    approvedCount: number;

    @Column({ name: 'rejected_count', default: 0 })
    rejectedCount: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('ai_tasks')
@Index(['tenantId', 'status'])
@Index(['agentId'])
export class AITask {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'agent_id' })
    agentId: string;

    @ManyToOne(() => AIAgent)
    @JoinColumn({ name: 'agent_id' })
    agent: AIAgent;

    @Column({ name: 'contact_id', nullable: true })
    contactId: string;

    @Column({
        type: 'enum',
        enum: AITaskStatus,
        default: AITaskStatus.PENDING,
    })
    status: AITaskStatus;

    // Input
    @Column({ type: 'jsonb' })
    input: Record<string, any>;

    // Output
    @Column({ type: 'jsonb', nullable: true })
    output: {
        result?: any;
        confidence?: number;
        reasoning?: string;
        alternatives?: any[];
    };

    // Approval workflow
    @Column({ name: 'requires_approval', default: false })
    requiresApproval: boolean;

    @Column({ name: 'approved_by', nullable: true })
    approvedBy: string;

    @Column({ name: 'approved_at', nullable: true })
    approvedAt: Date;

    @Column({ name: 'rejection_reason', nullable: true })
    rejectionReason: string;

    // Metrics
    @Column({ name: 'processing_time_ms', nullable: true })
    processingTimeMs: number;

    @Column({ name: 'tokens_used', nullable: true })
    tokensUsed: number;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('ai_predictions')
@Index(['tenantId', 'contactId'])
@Index(['predictionType'])
export class AIPrediction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'contact_id' })
    contactId: string;

    @ManyToOne(() => Contact)
    @JoinColumn({ name: 'contact_id' })
    contact: Contact;

    @Column({ name: 'prediction_type' })
    predictionType: 'lead_score' | 'churn_risk' | 'purchase_intent' | 'next_order_date' | 'lifetime_value';

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    score: number; // 0-100 for scores, actual value for predictions

    @Column({ type: 'decimal', precision: 5, scale: 4 })
    confidence: number; // 0-1

    @Column({ type: 'jsonb', nullable: true })
    factors: Array<{
        factor: string;
        impact: 'positive' | 'negative';
        weight: number;
        value: any;
    }>;

    @Column({ type: 'jsonb', nullable: true })
    recommendations: Array<{
        action: string;
        priority: 'high' | 'medium' | 'low';
        expectedImpact: string;
    }>;

    @Column({ name: 'valid_until', nullable: true })
    validUntil: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

@Entity('send_time_insights')
@Index(['tenantId', 'contactId'])
export class SendTimeInsight {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ name: 'contact_id' })
    contactId: string;

    @Column({ name: 'optimal_hour', nullable: true })
    optimalHour: number; // 0-23

    @Column({ name: 'optimal_day', nullable: true })
    optimalDay: number; // 0-6 (Sunday-Saturday)

    @Column({ type: 'jsonb', nullable: true })
    hourlyEngagement: Record<number, number>; // hour -> engagement score

    @Column({ type: 'jsonb', nullable: true })
    dailyEngagement: Record<number, number>; // day -> engagement score

    @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
    confidence: number;

    @Column({ name: 'data_points', default: 0 })
    dataPoints: number;

    @Column({ name: 'last_calculated_at' })
    lastCalculatedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
