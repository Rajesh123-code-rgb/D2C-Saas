import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';

export enum CampaignStatus {
    DRAFT = 'draft',
    SCHEDULED = 'scheduled',
    RUNNING = 'running',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum CampaignType {
    WHATSAPP_TEMPLATE = 'whatsapp_template',
    EMAIL = 'email',
    SMS = 'sms',
    MULTI_CHANNEL = 'multi_channel',
}

export enum CampaignChannel {
    WHATSAPP = 'whatsapp',
    EMAIL = 'email',
    SMS = 'sms',
}

export interface CampaignSchedule {
    type: 'immediate' | 'scheduled' | 'recurring';
    scheduledAt?: Date;
    timezone?: string;
    // For recurring
    repeatType?: 'daily' | 'weekly' | 'monthly';
    repeatDays?: number[];
    repeatTime?: string; // HH:MM format
    endDate?: Date;
}

export interface CampaignThrottle {
    enabled: boolean;
    messagesPerMinute?: number;
    messagesPerHour?: number;
    sendingWindow?: {
        startHour: number;
        endHour: number;
        timezone: string;
    };
}

export interface CampaignTargeting {
    segmentIds?: string[];
    contactIds?: string[];
    excludeSegmentIds?: string[];
    excludeContactIds?: string[];
    filters?: CampaignFilter[];
}

export interface CampaignFilter {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: any;
}

export interface CampaignContent {
    channel: CampaignChannel;
    // WhatsApp
    templateId?: string;
    templateName?: string;
    templateVariables?: Record<string, string>;
    // Email
    emailSubject?: string;
    emailBody?: string;
    emailFromName?: string;
    // SMS
    smsBody?: string;
}

export interface CampaignStats {
    totalTargeted: number;
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalOpened: number;
    totalClicked: number;
    totalReplied: number;
    totalConverted: number;
    conversionValue: number;
}

@Entity('campaigns')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'scheduledAt'])
export class Campaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: CampaignStatus,
        default: CampaignStatus.DRAFT,
    })
    status: CampaignStatus;

    @Column({
        type: 'enum',
        enum: CampaignType,
    })
    type: CampaignType;

    @Column({
        type: 'enum',
        enum: CampaignChannel,
    })
    primaryChannel: CampaignChannel;

    @Column({ type: 'jsonb', nullable: true })
    content: CampaignContent;

    @Column({ type: 'jsonb', nullable: true })
    targeting: CampaignTargeting;

    @Column({ type: 'jsonb', nullable: true })
    schedule: CampaignSchedule;

    @Column({ type: 'jsonb', nullable: true })
    throttle: CampaignThrottle;

    @Column({ type: 'jsonb', default: {} })
    stats: CampaignStats;

    // A/B Testing
    @Column({ name: 'is_ab_test', default: false })
    isAbTest: boolean;

    @Column({ name: 'ab_test_winner_metric', nullable: true })
    abTestWinnerMetric: 'open_rate' | 'click_rate' | 'reply_rate' | 'conversion_rate';

    @Column({ name: 'ab_test_sample_size', default: 20 })
    abTestSampleSize: number; // Percentage of audience for testing

    @Column({ name: 'ab_test_duration_hours', default: 4 })
    abTestDurationHours: number;

    // Timing
    @Column({ name: 'scheduled_at', nullable: true })
    scheduledAt: Date;

    @Column({ name: 'started_at', nullable: true })
    startedAt: Date;

    @Column({ name: 'completed_at', nullable: true })
    completedAt: Date;

    @Column({ name: 'created_by', nullable: true })
    createdBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => CampaignVariant, (variant) => variant.campaign)
    variants: CampaignVariant[];
}

@Entity('campaign_variants')
export class CampaignVariant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'campaign_id' })
    campaignId: string;

    @ManyToOne(() => Campaign, (campaign) => campaign.variants)
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @Column()
    name: string; // "Variant A", "Variant B"

    @Column({ type: 'jsonb' })
    content: CampaignContent;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 50 })
    percentage: number; // Traffic split percentage

    @Column({ type: 'jsonb', default: {} })
    stats: CampaignStats;

    @Column({ name: 'is_winner', default: false })
    isWinner: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

@Entity('campaign_executions')
@Index(['campaignId'])
@Index(['contactId'])
@Index(['status'])
export class CampaignExecution {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'campaign_id' })
    campaignId: string;

    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @Column({ name: 'variant_id', nullable: true })
    variantId: string;

    @Column({ name: 'contact_id' })
    contactId: string;

    @Column({
        type: 'enum',
        enum: CampaignChannel,
    })
    channel: CampaignChannel;

    @Column({
        type: 'enum',
        enum: ['pending', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'failed', 'bounced'],
        default: 'pending',
    })
    status: 'pending' | 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'failed' | 'bounced';

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @Column({ name: 'external_message_id', nullable: true })
    externalMessageId: string;

    @Column({ name: 'queued_at', nullable: true })
    queuedAt: Date;

    @Column({ name: 'sent_at', nullable: true })
    sentAt: Date;

    @Column({ name: 'delivered_at', nullable: true })
    deliveredAt: Date;

    @Column({ name: 'opened_at', nullable: true })
    openedAt: Date;

    @Column({ name: 'clicked_at', nullable: true })
    clickedAt: Date;

    @Column({ name: 'replied_at', nullable: true })
    repliedAt: Date;

    // Conversion tracking
    @Column({ name: 'converted', default: false })
    converted: boolean;

    @Column({ name: 'conversion_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
    conversionValue: number;

    @Column({ name: 'conversion_order_id', nullable: true })
    conversionOrderId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
