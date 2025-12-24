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

export enum SegmentType {
    STATIC = 'static',
    DYNAMIC = 'dynamic',
}

export enum SegmentRuleOperator {
    // Basic
    EQUALS = 'equals',
    NOT_EQUALS = 'not_equals',
    CONTAINS = 'contains',
    NOT_CONTAINS = 'not_contains',
    STARTS_WITH = 'starts_with',
    ENDS_WITH = 'ends_with',
    IS_EMPTY = 'is_empty',
    IS_NOT_EMPTY = 'is_not_empty',

    // Numeric
    GREATER_THAN = 'greater_than',
    LESS_THAN = 'less_than',
    GREATER_THAN_OR_EQUALS = 'gte',
    LESS_THAN_OR_EQUALS = 'lte',
    BETWEEN = 'between',

    // List
    IN = 'in',
    NOT_IN = 'not_in',

    // Date
    BEFORE = 'before',
    AFTER = 'after',
    WITHIN_LAST = 'within_last', // within_last 7 days
    NOT_WITHIN_LAST = 'not_within_last',
    ON = 'on',
}

export enum SegmentRuleField {
    // Contact fields
    NAME = 'name',
    EMAIL = 'email',
    PHONE = 'phone',
    SOURCE = 'source',
    TAGS = 'tags',
    LIFECYCLE = 'lifecycle',
    CREATED_AT = 'createdAt',

    // E-commerce fields
    TOTAL_ORDERS = 'ecommerceData.totalOrders',
    TOTAL_SPENT = 'ecommerceData.totalSpent',
    AVERAGE_ORDER_VALUE = 'ecommerceData.averageOrderValue',
    LAST_ORDER_DATE = 'ecommerceData.lastOrderDate',
    PREFERRED_PAYMENT = 'ecommerceData.preferredPaymentMethod',
    COD_RISK_SCORE = 'ecommerceData.codRiskScore',

    // Engagement fields
    LAST_MESSAGE_AT = 'lastMessageAt',
    LAST_SEEN_AT = 'lastSeenAt',
    MESSAGE_COUNT = 'messageCount',

    // Custom attributes
    CUSTOM_ATTRIBUTE = 'customAttribute',
}

export interface SegmentRule {
    id: string;
    field: string;
    operator: SegmentRuleOperator;
    value: any;
    valueUnit?: 'days' | 'hours' | 'minutes'; // For time-based operators
}

export interface SegmentRuleGroup {
    id: string;
    combinator: 'and' | 'or';
    rules: (SegmentRule | SegmentRuleGroup)[];
}

@Entity('segments')
@Index(['tenantId', 'type'])
export class Segment {
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
        enum: SegmentType,
        default: SegmentType.DYNAMIC,
    })
    type: SegmentType;

    @Column({ type: 'jsonb' })
    rules: SegmentRuleGroup;

    // For static segments - cached contact IDs
    @Column({ name: 'contact_ids', type: 'jsonb', default: [] })
    contactIds: string[];

    // Cached count for quick display
    @Column({ name: 'contact_count', default: 0 })
    contactCount: number;

    @Column({ name: 'last_calculated_at', nullable: true })
    lastCalculatedAt: Date;

    @Column({ name: 'is_system', default: false })
    isSystem: boolean;

    @Column({ name: 'created_by', nullable: true })
    createdBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
