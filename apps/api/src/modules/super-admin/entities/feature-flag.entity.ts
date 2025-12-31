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
import { SuperAdminUser } from './super-admin-user.entity';

export enum FeatureFlagType {
    BOOLEAN = 'boolean',           // Simple on/off
    PLAN_GATED = 'plan_gated',     // Different values per plan
    PERCENTAGE = 'percentage',      // Gradual rollout
    TENANT_LIST = 'tenant_list',   // Specific tenants only
}

export interface PlanOverrides {
    free: boolean;
    starter: boolean;
    pro: boolean;
    enterprise: boolean;
}

@Entity('feature_flags')
@Index(['key'], { unique: true })
@Index(['category'])
@Index(['isActive'])
export class FeatureFlag {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    key: string;  // e.g., 'automation.enabled', 'whatsapp.templates', 'ai.chatbot'

    @Column({ type: 'varchar', length: 255 })
    name: string;  // Human-readable name

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    category: string;  // e.g., 'automation', 'whatsapp', 'billing', 'ui'

    @Column({
        type: 'enum',
        enum: FeatureFlagType,
        default: FeatureFlagType.BOOLEAN,
    })
    type: FeatureFlagType;

    @Column({ type: 'boolean', default: false })
    defaultValue: boolean;

    @Column({ type: 'jsonb', nullable: true })
    planOverrides: PlanOverrides;

    @Column({ type: 'int', default: 0 })
    rolloutPercentage: number;  // For percentage-based rollout (0-100)

    @Column({ type: 'jsonb', nullable: true })
    tenantWhitelist: string[];  // Specific tenant IDs for tenant_list type

    @Column({ type: 'jsonb', nullable: true })
    tenantBlacklist: string[];  // Tenants excluded from feature

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;  // Additional configuration

    @Column({ type: 'uuid', nullable: true })
    createdById: string;

    @ManyToOne(() => SuperAdminUser)
    @JoinColumn({ name: 'createdById' })
    createdBy: SuperAdminUser;

    @Column({ type: 'uuid', nullable: true })
    updatedById: string;

    @ManyToOne(() => SuperAdminUser)
    @JoinColumn({ name: 'updatedById' })
    updatedBy: SuperAdminUser;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    /**
     * Check if feature is enabled for a specific tenant
     */
    isEnabledForTenant(tenantId: string, tenantPlan: string): boolean {
        if (!this.isActive) {
            return false;
        }

        // Check blacklist first
        if (this.tenantBlacklist?.includes(tenantId)) {
            return false;
        }

        // Check whitelist (if using tenant_list type)
        if (this.type === FeatureFlagType.TENANT_LIST) {
            return this.tenantWhitelist?.includes(tenantId) ?? false;
        }

        // Check plan-based gating
        if (this.type === FeatureFlagType.PLAN_GATED && this.planOverrides) {
            const planKey = tenantPlan.toLowerCase() as keyof PlanOverrides;
            return this.planOverrides[planKey] ?? this.defaultValue;
        }

        // Check percentage rollout
        if (this.type === FeatureFlagType.PERCENTAGE) {
            // Use tenant ID to create consistent hash for rollout
            const hash = this.hashTenantId(tenantId);
            return hash < this.rolloutPercentage;
        }

        // Default boolean check
        return this.defaultValue;
    }

    /**
     * Generate consistent hash for percentage rollout
     */
    private hashTenantId(tenantId: string): number {
        let hash = 0;
        for (let i = 0; i < tenantId.length; i++) {
            const char = tenantId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) % 100;
    }
}

// Default feature flags to seed
export const DEFAULT_FEATURE_FLAGS: Partial<FeatureFlag>[] = [
    {
        key: 'automation.enabled',
        name: 'Automation Engine',
        description: 'Enable/disable automation creation and execution',
        category: 'automation',
        type: FeatureFlagType.PLAN_GATED,
        defaultValue: true,
        planOverrides: { free: true, starter: true, pro: true, enterprise: true },
    },
    {
        key: 'automation.conditional_branching',
        name: 'Conditional Branching',
        description: 'Allow if/else conditions in automations',
        category: 'automation',
        type: FeatureFlagType.PLAN_GATED,
        defaultValue: false,
        planOverrides: { free: false, starter: false, pro: true, enterprise: true },
    },
    {
        key: 'automation.webhooks',
        name: 'Webhook Actions',
        description: 'Allow webhook calls in automation actions',
        category: 'automation',
        type: FeatureFlagType.PLAN_GATED,
        defaultValue: false,
        planOverrides: { free: false, starter: false, pro: true, enterprise: true },
    },
    {
        key: 'whatsapp.templates',
        name: 'WhatsApp Templates',
        description: 'Allow creating and sending WhatsApp templates',
        category: 'whatsapp',
        type: FeatureFlagType.PLAN_GATED,
        defaultValue: true,
        planOverrides: { free: true, starter: true, pro: true, enterprise: true },
    },
    {
        key: 'whatsapp.marketing_templates',
        name: 'Marketing Templates',
        description: 'Allow creating marketing category templates',
        category: 'whatsapp',
        type: FeatureFlagType.PLAN_GATED,
        defaultValue: false,
        planOverrides: { free: false, starter: true, pro: true, enterprise: true },
    },
    {
        key: 'campaigns.enabled',
        name: 'Campaign Management',
        description: 'Enable campaign creation and scheduling',
        category: 'campaigns',
        type: FeatureFlagType.PLAN_GATED,
        defaultValue: true,
        planOverrides: { free: true, starter: true, pro: true, enterprise: true },
    },
    {
        key: 'ai.chatbot',
        name: 'AI Chatbot',
        description: 'Enable AI-powered chatbot features',
        category: 'ai',
        type: FeatureFlagType.PLAN_GATED,
        defaultValue: false,
        planOverrides: { free: false, starter: false, pro: true, enterprise: true },
    },
    {
        key: 'ai.smart_replies',
        name: 'AI Smart Replies',
        description: 'AI-suggested message replies',
        category: 'ai',
        type: FeatureFlagType.PLAN_GATED,
        defaultValue: false,
        planOverrides: { free: false, starter: false, pro: true, enterprise: true },
    },
    {
        key: 'analytics.advanced',
        name: 'Advanced Analytics',
        description: 'Advanced reporting and analytics dashboard',
        category: 'analytics',
        type: FeatureFlagType.PLAN_GATED,
        defaultValue: false,
        planOverrides: { free: false, starter: false, pro: true, enterprise: true },
    },
    {
        key: 'api.access',
        name: 'API Access',
        description: 'Allow API key generation and external API access',
        category: 'integrations',
        type: FeatureFlagType.PLAN_GATED,
        defaultValue: false,
        planOverrides: { free: false, starter: true, pro: true, enterprise: true },
    },
    {
        key: 'integrations.custom_webhooks',
        name: 'Custom Webhooks',
        description: 'Allow custom webhook endpoints',
        category: 'integrations',
        type: FeatureFlagType.PLAN_GATED,
        defaultValue: false,
        planOverrides: { free: false, starter: false, pro: true, enterprise: true },
    },
    {
        key: 'billing.auto_recharge',
        name: 'Auto Recharge',
        description: 'Enable automatic credit recharge',
        category: 'billing',
        type: FeatureFlagType.BOOLEAN,
        defaultValue: true,
    },
];
