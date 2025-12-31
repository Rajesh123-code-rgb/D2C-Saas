import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { TriggerType, ActionType } from '../../automations/automation-rule.entity';

export interface PlanAutomationLimits {
    maxAutomations: number;          // -1 = unlimited
    maxStepsPerAutomation: number;
    maxExecutionsPerDay: number;     // -1 = unlimited
    maxExecutionsPerHour: number;    // -1 = unlimited
    maxDelayHours: number;           // Maximum delay step duration
}

export interface AutomationBlockSettings {
    conditionalBranching: {
        enabled: boolean;
        allowedPlans: string[];
    };
    delaySteps: {
        enabled: boolean;
        allowedPlans: string[];
        maxDelayHours: number;
    };
    webhookCalls: {
        enabled: boolean;
        allowedPlans: string[];
    };
    aiActions: {
        enabled: boolean;
        allowedPlans: string[];
    };
}

export interface SafetyControls {
    maxRetries: number;
    retryDelaySeconds: number;
    failSafeEnabled: boolean;
    abuseDetectionThreshold: number;  // Number of executions to trigger abuse alert
    autoThrottleOnAbuse: boolean;
    throttleDurationMinutes: number;
}

@Entity('automation_policies')
@Index(['name'], { unique: true })
export class AutomationPolicy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true, default: 'default' })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    // Global controls
    @Column({ type: 'boolean', default: true })
    globalEnabled: boolean;

    @Column({ type: 'boolean', default: false })
    globalKillSwitch: boolean;

    @Column({ type: 'timestamp', nullable: true })
    killSwitchActivatedAt: Date;

    @Column({ type: 'varchar', length: 255, nullable: true })
    killSwitchReason: string;

    @Column({ type: 'uuid', nullable: true })
    killSwitchActivatedBy: string;

    // Plan-based limits
    @Column({ type: 'jsonb' })
    planLimits: Record<string, PlanAutomationLimits>;

    // Allowed triggers per plan
    @Column({ type: 'jsonb' })
    allowedTriggers: Record<string, TriggerType[]>;

    // Allowed actions per plan
    @Column({ type: 'jsonb' })
    allowedActions: Record<string, ActionType[]>;

    // Block configurations
    @Column({ type: 'jsonb' })
    blockSettings: AutomationBlockSettings;

    // Safety controls
    @Column({ type: 'jsonb' })
    safetyControls: SafetyControls;

    // Audit
    @Column({ type: 'uuid', nullable: true })
    lastUpdatedBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// Default automation policy
export const DEFAULT_AUTOMATION_POLICY: Partial<AutomationPolicy> = {
    name: 'default',
    description: 'Default automation policy for all tenants',
    globalEnabled: true,
    globalKillSwitch: false,
    planLimits: {
        free: {
            maxAutomations: 2,
            maxStepsPerAutomation: 3,
            maxExecutionsPerDay: 50,
            maxExecutionsPerHour: 10,
            maxDelayHours: 1,
        },
        starter: {
            maxAutomations: 10,
            maxStepsPerAutomation: 5,
            maxExecutionsPerDay: 500,
            maxExecutionsPerHour: 50,
            maxDelayHours: 24,
        },
        pro: {
            maxAutomations: 50,
            maxStepsPerAutomation: 10,
            maxExecutionsPerDay: 5000,
            maxExecutionsPerHour: 500,
            maxDelayHours: 168, // 1 week
        },
        enterprise: {
            maxAutomations: -1, // Unlimited
            maxStepsPerAutomation: 25,
            maxExecutionsPerDay: -1,
            maxExecutionsPerHour: -1,
            maxDelayHours: 720, // 1 month
        },
    },
    allowedTriggers: {
        free: [
            TriggerType.ORDER_CREATED,
            TriggerType.ORDER_SHIPPED,
            TriggerType.ORDER_DELIVERED,
            TriggerType.MESSAGE_RECEIVED,
            TriggerType.CONTACT_CREATED,
        ],
        starter: [
            TriggerType.ORDER_CREATED,
            TriggerType.ORDER_CONFIRMED,
            TriggerType.ORDER_SHIPPED,
            TriggerType.ORDER_DELIVERED,
            TriggerType.ORDER_CANCELLED,
            TriggerType.MESSAGE_RECEIVED,
            TriggerType.KEYWORD_MATCH,
            TriggerType.CONTACT_CREATED,
            TriggerType.TAG_ADDED,
            TriggerType.TAG_REMOVED,
            TriggerType.CART_ABANDONED,
        ],
        pro: [
            // All triggers available
            ...Object.values(TriggerType),
        ],
        enterprise: [
            // All triggers available
            ...Object.values(TriggerType),
        ],
    },
    allowedActions: {
        free: [
            ActionType.SEND_WHATSAPP_MESSAGE,
            ActionType.SEND_WHATSAPP_TEMPLATE,
            ActionType.ADD_TAG,
            ActionType.REMOVE_TAG,
        ],
        starter: [
            ActionType.SEND_WHATSAPP_MESSAGE,
            ActionType.SEND_WHATSAPP_TEMPLATE,
            ActionType.SEND_EMAIL,
            ActionType.ADD_TAG,
            ActionType.REMOVE_TAG,
            ActionType.UPDATE_CONTACT,
            ActionType.UPDATE_LIFECYCLE,
            ActionType.WAIT,
        ],
        pro: [
            ActionType.SEND_WHATSAPP_MESSAGE,
            ActionType.SEND_WHATSAPP_TEMPLATE,
            ActionType.SEND_INSTAGRAM_DM,
            ActionType.SEND_EMAIL,
            ActionType.SEND_SMS,
            ActionType.ADD_TAG,
            ActionType.REMOVE_TAG,
            ActionType.UPDATE_CONTACT,
            ActionType.UPDATE_LIFECYCLE,
            ActionType.ASSIGN_TO_AGENT,
            ActionType.CREATE_TASK,
            ActionType.NOTIFY_TEAM,
            ActionType.WAIT,
            ActionType.CONDITION,
            ActionType.WEBHOOK,
        ],
        enterprise: [
            // All actions available
            ...Object.values(ActionType),
        ],
    },
    blockSettings: {
        conditionalBranching: {
            enabled: true,
            allowedPlans: ['pro', 'enterprise'],
        },
        delaySteps: {
            enabled: true,
            allowedPlans: ['starter', 'pro', 'enterprise'],
            maxDelayHours: 720,
        },
        webhookCalls: {
            enabled: true,
            allowedPlans: ['pro', 'enterprise'],
        },
        aiActions: {
            enabled: true,
            allowedPlans: ['pro', 'enterprise'],
        },
    },
    safetyControls: {
        maxRetries: 3,
        retryDelaySeconds: 60,
        failSafeEnabled: true,
        abuseDetectionThreshold: 1000,
        autoThrottleOnAbuse: true,
        throttleDurationMinutes: 60,
    },
};
