import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';

export enum UsageResourceType {
    CONTACTS = 'contacts',
    MESSAGES = 'messages',
    CAMPAIGNS = 'campaigns',
    AUTOMATIONS = 'automations',
    AI_REQUESTS = 'ai_requests',
    AGENTS = 'agents',
}

@Entity('usage_records')
@Index(['tenantId', 'billingPeriod'])
@Index(['tenantId', 'resourceType', 'billingPeriod'])
export class UsageRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column({
        type: 'enum',
        enum: UsageResourceType,
    })
    resourceType: UsageResourceType;

    @Column({ type: 'int', default: 0 })
    quantity: number;

    @Column({ type: 'varchar', length: 7 })
    billingPeriod: string; // Format: 'YYYY-MM'

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;
}

@Entity('usage_snapshots')
@Index(['tenantId', 'snapshotDate'])
export class UsageSnapshot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column({ type: 'date' })
    snapshotDate: Date;

    @Column({ type: 'int', default: 0 })
    totalContacts: number;

    @Column({ type: 'int', default: 0 })
    totalMessages: number;

    @Column({ type: 'int', default: 0 })
    totalCampaigns: number;

    @Column({ type: 'int', default: 0 })
    totalAutomations: number;

    @Column({ type: 'int', default: 0 })
    totalAgents: number;

    @Column({ type: 'int', default: 0 })
    aiRequestsCount: number;

    @CreateDateColumn()
    createdAt: Date;
}
