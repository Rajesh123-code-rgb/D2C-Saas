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
import { Tenant } from '../tenants/tenant.entity';

export enum AutomationStatus {
    ACTIVE = 'active',
    PAUSED = 'paused',
    DRAFT = 'draft',
}

export enum TriggerType {
    // Contact triggers
    CONTACT_CREATED = 'contact_created',
    TAG_ADDED = 'tag_added',
    TAG_REMOVED = 'tag_removed',
    LIFECYCLE_CHANGED = 'lifecycle_changed',
    CONTACT_BIRTHDAY = 'contact_birthday',

    // Message triggers
    MESSAGE_RECEIVED = 'message_received',
    KEYWORD_MATCH = 'keyword_match',
    CONVERSATION_CLOSED = 'conversation_closed',

    // E-commerce triggers
    ORDER_CREATED = 'order_created',
    ORDER_CONFIRMED = 'order_confirmed',
    ORDER_SHIPPED = 'order_shipped',
    ORDER_DELIVERED = 'order_delivered',
    ORDER_CANCELLED = 'order_cancelled',
    PAYMENT_SUCCESS = 'payment_success',
    PAYMENT_FAILED = 'payment_failed',
    REFUND_PROCESSED = 'refund_processed',
    COD_ORDER_CREATED = 'cod_order_created',
    CART_ABANDONED = 'cart_abandoned',
    CART_RECOVERED = 'cart_recovered',
    FIRST_ORDER = 'first_order',
    REPEAT_ORDER = 'repeat_order',
    HIGH_VALUE_ORDER = 'high_value_order',

    // Customer lifecycle triggers
    CUSTOMER_INACTIVE = 'customer_inactive',

    // Instagram triggers
    INSTAGRAM_COMMENT = 'instagram_comment',
    INSTAGRAM_DM = 'instagram_dm',
    INSTAGRAM_STORY_MENTION = 'instagram_story_mention',
    INSTAGRAM_STORY_REPLY = 'instagram_story_reply',

    // Review triggers
    POSITIVE_REVIEW = 'positive_review',
    NEGATIVE_REVIEW = 'negative_review',

    // Support triggers
    SLA_WARNING = 'sla_warning',

    // Time-based triggers
    SCHEDULE = 'schedule',
    INACTIVITY = 'inactivity',
    DATE_FIELD_MATCH = 'date_field_match',
}

export enum ActionType {
    SEND_WHATSAPP_MESSAGE = 'send_whatsapp_message',
    SEND_WHATSAPP_TEMPLATE = 'send_whatsapp_template',
    SEND_INSTAGRAM_DM = 'send_instagram_dm',
    SEND_EMAIL = 'send_email',
    SEND_SMS = 'send_sms',
    ADD_TAG = 'add_tag',
    REMOVE_TAG = 'remove_tag',
    UPDATE_CONTACT = 'update_contact',
    UPDATE_LIFECYCLE = 'update_lifecycle',
    ASSIGN_TO_AGENT = 'assign_to_agent',
    CREATE_TASK = 'create_task',
    NOTIFY_TEAM = 'notify_team',
    WAIT = 'wait',
    CONDITION = 'condition',
    WEBHOOK = 'webhook',
}

export enum ConditionOperator {
    EQUALS = 'equals',
    NOT_EQUALS = 'not_equals',
    CONTAINS = 'contains',
    NOT_CONTAINS = 'not_contains',
    GREATER_THAN = 'greater_than',
    LESS_THAN = 'less_than',
    IS_SET = 'is_set',
    IS_NOT_SET = 'is_not_set',
    IN_LIST = 'in_list',
}

export interface TriggerConfig {
    type: TriggerType;
    // For keyword match
    keywords?: string[];
    matchType?: 'exact' | 'contains' | 'starts_with';
    // For schedule
    cronExpression?: string;
    timezone?: string;
    // For inactivity
    inactivityDays?: number;
    // For high value order
    minOrderValue?: number;
    // For date field match
    dateField?: string;
    daysOffset?: number; // -7 = 7 days before, 0 = on the day, 7 = 7 days after
}

export interface ConditionConfig {
    field: string;
    operator: ConditionOperator;
    value: any;
}

export interface ActionConfig {
    type: ActionType;
    // For messages
    templateId?: string;
    message?: string;
    channel?: 'whatsapp' | 'email' | 'sms' | 'instagram';
    // For tags
    tagName?: string;
    // For contact updates
    fieldName?: string;
    fieldValue?: any;
    field?: string; // Field to update
    value?: any; // Value to set
    // For lifecycle
    newLifecycle?: string;
    // For assignment
    agentId?: string;
    teamId?: string;
    assignmentStrategy?: 'round_robin' | 'least_busy' | 'specific';
    // For wait
    waitDuration?: number; // in seconds
    waitUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
    // For condition (branching)
    conditions?: ConditionConfig[];
    thenActions?: ActionConfig[];
    elseActions?: ActionConfig[];
    // For webhook
    webhookUrl?: string;
    webhookMethod?: 'GET' | 'POST';
    webhookHeaders?: Record<string, string>;
}

export interface DelayConfig {
    type: 'immediate' | 'delay' | 'schedule';
    delaySeconds?: number;
    scheduleTime?: string; // HH:MM format
    scheduleTimezone?: string;
}

@Entity('automation_rules')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'triggerType'])
export class AutomationRule {
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
        enum: AutomationStatus,
        default: AutomationStatus.DRAFT,
    })
    status: AutomationStatus;

    @Column({
        name: 'trigger_type',
        type: 'enum',
        enum: TriggerType,
    })
    triggerType: TriggerType;

    @Column({ name: 'trigger_config', type: 'jsonb' })
    triggerConfig: TriggerConfig;

    @Column({ type: 'jsonb', default: [] })
    conditions: ConditionConfig[];

    @Column({ type: 'jsonb', default: [] })
    actions: ActionConfig[];

    @Column({ name: 'delay_config', type: 'jsonb', nullable: true })
    delayConfig: DelayConfig;

    @Column({ default: 0 })
    priority: number;

    @Column({ name: 'is_template', default: false })
    isTemplate: boolean;

    @Column({ name: 'template_id', nullable: true })
    templateId: string; // Reference to parent template

    // Stats
    @Column({ name: 'run_count', default: 0 })
    runCount: number;

    @Column({ name: 'success_count', default: 0 })
    successCount: number;

    @Column({ name: 'failure_count', default: 0 })
    failureCount: number;

    @Column({ name: 'last_run_at', nullable: true })
    lastRunAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
