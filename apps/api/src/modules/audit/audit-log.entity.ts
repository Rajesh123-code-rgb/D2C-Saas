import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export enum AuditAction {
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete',
    EXPORT = 'export',
    LOGIN = 'login',
    LOGOUT = 'logout',
    BULK_DELETE = 'bulk_delete',
    BULK_UPDATE = 'bulk_update',
}

export type ResourceType =
    | 'contact'
    | 'campaign'
    | 'automation'
    | 'user'
    | 'template'
    | 'segment'
    | 'order'
    | 'store'
    | 'channel'
    | 'conversation'
    | 'message'
    | 'tenant'
    | 'subscription'
    | 'webhook';

@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'resourceType'])
@Index(['tenantId', 'action'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column({ type: 'uuid', nullable: true })
    userId: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    userEmail: string;

    @Column({
        type: 'enum',
        enum: AuditAction,
    })
    action: AuditAction;

    @Column({ type: 'varchar', length: 50 })
    resourceType: ResourceType;

    @Column({ type: 'uuid', nullable: true })
    resourceId: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    resourceName: string;

    @Column({ type: 'jsonb', nullable: true })
    previousValues: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    newValues: Record<string, any>;

    @Column({ type: 'varchar', length: 45, nullable: true })
    ipAddress: string;

    @Column({ type: 'text', nullable: true })
    userAgent: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ type: 'varchar', length: 500, nullable: true })
    description: string;

    @CreateDateColumn()
    createdAt: Date;
}
