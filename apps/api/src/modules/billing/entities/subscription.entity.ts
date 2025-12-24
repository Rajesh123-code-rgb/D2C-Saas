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
import { SubscriptionPlan } from './plan.entity';

export enum SubscriptionStatus {
    ACTIVE = 'active',
    TRIALING = 'trialing',
    PAST_DUE = 'past_due',
    CANCELLED = 'cancelled',
    PAUSED = 'paused',
}

export enum BillingCycle {
    MONTHLY = 'monthly',
    YEARLY = 'yearly',
}

@Entity('subscriptions')
@Index(['tenantId'])
@Index(['stripeSubscriptionId'], { unique: true, where: '"stripeSubscriptionId" IS NOT NULL' })
export class Subscription {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column({ type: 'uuid' })
    planId: string;

    @ManyToOne(() => SubscriptionPlan)
    @JoinColumn({ name: 'planId' })
    plan: SubscriptionPlan;

    @Column({
        type: 'enum',
        enum: SubscriptionStatus,
        default: SubscriptionStatus.TRIALING,
    })
    status: SubscriptionStatus;

    @Column({
        type: 'enum',
        enum: BillingCycle,
        default: BillingCycle.MONTHLY,
    })
    billingCycle: BillingCycle;

    @Column({ type: 'timestamp', nullable: true })
    currentPeriodStart: Date;

    @Column({ type: 'timestamp', nullable: true })
    currentPeriodEnd: Date;

    @Column({ type: 'timestamp', nullable: true })
    trialEndsAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    cancelledAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    cancelAtPeriodEnd: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripeCustomerId: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripeSubscriptionId: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripePaymentMethodId: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
