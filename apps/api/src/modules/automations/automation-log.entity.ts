import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { AutomationRule } from './automation-rule.entity';
import { Contact } from '../contacts/contact.entity';

export enum ExecutionStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    WAITING = 'waiting', // For delayed actions
    COMPLETED = 'completed',
    FAILED = 'failed',
    SKIPPED = 'skipped', // Conditions not met
    CANCELLED = 'cancelled',
}

export interface ExecutedAction {
    actionIndex: number;
    actionType: string;
    status: 'success' | 'failed' | 'skipped';
    result?: any;
    error?: string;
    executedAt: Date;
}

@Entity('automation_logs')
@Index(['tenantId', 'status'])
@Index(['automationId'])
@Index(['contactId'])
@Index(['createdAt'])
export class AutomationLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column({ name: 'automation_id' })
    automationId: string;

    @ManyToOne(() => AutomationRule)
    @JoinColumn({ name: 'automation_id' })
    automation: AutomationRule;

    @Column({ name: 'contact_id', nullable: true })
    contactId: string;

    @ManyToOne(() => Contact)
    @JoinColumn({ name: 'contact_id' })
    contact: Contact;

    @Column({ name: 'trigger_event', type: 'jsonb' })
    triggerEvent: {
        type: string;
        source: string;
        data: Record<string, any>;
    };

    @Column({
        type: 'enum',
        enum: ExecutionStatus,
        default: ExecutionStatus.PENDING,
    })
    status: ExecutionStatus;

    @Column({ name: 'actions_executed', type: 'jsonb', default: [] })
    actionsExecuted: ExecutedAction[];

    @Column({ name: 'current_action_index', default: 0 })
    currentActionIndex: number;

    @Column({ name: 'next_execution_at', nullable: true })
    nextExecutionAt: Date; // For delayed actions

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @Column({ name: 'retry_count', default: 0 })
    retryCount: number;

    @Column({ name: 'max_retries', default: 3 })
    maxRetries: number;

    @Column({ name: 'started_at', nullable: true })
    startedAt: Date;

    @Column({ name: 'completed_at', nullable: true })
    completedAt: Date;

    @Column({ name: 'execution_time_ms', nullable: true })
    executionTimeMs: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
