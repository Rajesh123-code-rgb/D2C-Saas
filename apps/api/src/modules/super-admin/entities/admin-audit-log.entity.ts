import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { SuperAdminUser } from './super-admin-user.entity';

export enum AdminAuditAction {
    // Auth
    LOGIN = 'login',
    LOGOUT = 'logout',
    PASSWORD_CHANGE = 'password_change',

    // CRUD
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete',

    // Special actions
    ACTIVATE = 'activate',
    DEACTIVATE = 'deactivate',
    SUSPEND = 'suspend',
    UNSUSPEND = 'unsuspend',
    APPROVE = 'approve',
    REJECT = 'reject',
    PAUSE = 'pause',
    RESUME = 'resume',

    // Billing
    CREDIT_ISSUE = 'credit_issue',
    REFUND = 'refund',
    PRICING_CHANGE = 'pricing_change',

    // System
    KILL_SWITCH = 'kill_switch',
    FEATURE_TOGGLE = 'feature_toggle',
    POLICY_CHANGE = 'policy_change',
    EXPORT = 'export',
    IMPORT = 'import',
}

export type AdminResourceType =
    | 'admin_user'
    | 'tenant'
    | 'user'
    | 'feature_flag'
    | 'automation_policy'
    | 'whatsapp_template_policy'
    | 'email_template_policy'
    | 'whatsapp_template'
    | 'email_template'
    | 'topup_package'
    | 'conversation_pricing'
    | 'message_wallet'
    | 'subscription'
    | 'system_settings';

@Entity('admin_audit_logs')
@Index(['adminId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['resourceType', 'createdAt'])
@Index(['resourceId'])
export class AdminAuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', nullable: true })
    adminId: string;

    @ManyToOne(() => SuperAdminUser)
    @JoinColumn({ name: 'adminId' })
    admin: SuperAdminUser;

    @Column({ type: 'varchar', length: 255, nullable: true })
    adminEmail: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    adminName: string;

    @Column({
        type: 'enum',
        enum: AdminAuditAction,
    })
    action: AdminAuditAction;

    @Column({ type: 'varchar', length: 50 })
    resourceType: AdminResourceType;

    @Column({ type: 'uuid', nullable: true })
    resourceId: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    resourceName: string;

    // For tenant-related actions
    @Column({ type: 'uuid', nullable: true })
    targetTenantId: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    targetTenantName: string;

    // Changes
    @Column({ type: 'jsonb', nullable: true })
    previousValues: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    newValues: Record<string, any>;

    // Request info
    @Column({ type: 'varchar', length: 45, nullable: true })
    ipAddress: string;

    @Column({ type: 'text', nullable: true })
    userAgent: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    httpMethod: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    requestPath: string;

    // Additional context
    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ type: 'boolean', default: true })
    success: boolean;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @CreateDateColumn()
    createdAt: Date;
}
