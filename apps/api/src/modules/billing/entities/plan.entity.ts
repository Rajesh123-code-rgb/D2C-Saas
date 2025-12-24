import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum PlanTier {
    FREE = 'free',
    STARTER = 'starter',
    PRO = 'pro',
    ENTERPRISE = 'enterprise',
}

export interface PlanFeatures {
    maxContacts: number;
    maxAgents: number;
    maxAutomations: number;
    maxCampaignsPerMonth: number;
    maxMessagesPerMonth: number;
    aiFeatures: boolean;
    customIntegrations: boolean;
    prioritySupport: boolean;
    dedicatedAccount: boolean;
    whiteLabeling: boolean;
    apiAccess: boolean;
    customWebhooks: boolean;
    advancedAnalytics: boolean;
}

@Entity('subscription_plans')
export class SubscriptionPlan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: PlanTier,
        unique: true,
    })
    tier: PlanTier;

    @Column({ type: 'varchar', length: 100 })
    displayName: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    monthlyPrice: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    yearlyPrice: number;

    @Column({ type: 'varchar', length: 3, default: 'USD' })
    currency: string;

    @Column({ type: 'jsonb' })
    features: PlanFeatures;

    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'boolean', default: false })
    isPopular: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// Default plan configurations
export const DEFAULT_PLANS: Partial<SubscriptionPlan>[] = [
    {
        tier: PlanTier.FREE,
        displayName: 'Free',
        description: 'Perfect for getting started',
        monthlyPrice: 0,
        yearlyPrice: 0,
        sortOrder: 1,
        features: {
            maxContacts: 100,
            maxAgents: 1,
            maxAutomations: 2,
            maxCampaignsPerMonth: 1,
            maxMessagesPerMonth: 100,
            aiFeatures: false,
            customIntegrations: false,
            prioritySupport: false,
            dedicatedAccount: false,
            whiteLabeling: false,
            apiAccess: false,
            customWebhooks: false,
            advancedAnalytics: false,
        },
    },
    {
        tier: PlanTier.STARTER,
        displayName: 'Starter',
        description: 'For small businesses',
        monthlyPrice: 49,
        yearlyPrice: 470,
        sortOrder: 2,
        features: {
            maxContacts: 1000,
            maxAgents: 3,
            maxAutomations: 10,
            maxCampaignsPerMonth: 10,
            maxMessagesPerMonth: 5000,
            aiFeatures: false,
            customIntegrations: false,
            prioritySupport: false,
            dedicatedAccount: false,
            whiteLabeling: false,
            apiAccess: true,
            customWebhooks: false,
            advancedAnalytics: false,
        },
    },
    {
        tier: PlanTier.PRO,
        displayName: 'Pro',
        description: 'For growing teams',
        monthlyPrice: 149,
        yearlyPrice: 1430,
        sortOrder: 3,
        isPopular: true,
        features: {
            maxContacts: 10000,
            maxAgents: 10,
            maxAutomations: 50,
            maxCampaignsPerMonth: 50,
            maxMessagesPerMonth: 25000,
            aiFeatures: true,
            customIntegrations: true,
            prioritySupport: true,
            dedicatedAccount: false,
            whiteLabeling: false,
            apiAccess: true,
            customWebhooks: true,
            advancedAnalytics: true,
        },
    },
    {
        tier: PlanTier.ENTERPRISE,
        displayName: 'Enterprise',
        description: 'For large organizations',
        monthlyPrice: 499,
        yearlyPrice: 4790,
        sortOrder: 4,
        features: {
            maxContacts: -1, // Unlimited
            maxAgents: -1,
            maxAutomations: -1,
            maxCampaignsPerMonth: -1,
            maxMessagesPerMonth: -1,
            aiFeatures: true,
            customIntegrations: true,
            prioritySupport: true,
            dedicatedAccount: true,
            whiteLabeling: true,
            apiAccess: true,
            customWebhooks: true,
            advancedAnalytics: true,
        },
    },
];
