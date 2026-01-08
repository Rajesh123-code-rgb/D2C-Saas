import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum SuperAdminRole {
    PLATFORM_ADMIN = 'platform_admin',
    SUPPORT = 'support',
    VIEWER = 'viewer',
}

export enum SuperAdminStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
}

export interface SuperAdminPermissions {
    // Organization management
    canManageOrganizations: boolean;
    canSuspendOrganizations: boolean;
    canDeleteOrganizations: boolean;
    canImpersonate: boolean;

    // User management
    canManageAdminUsers: boolean;
    canManageTenantUsers: boolean;

    // Feature flags
    canManageFeatureFlags: boolean;

    // Automation governance
    canManageAutomationPolicy: boolean;
    canUseKillSwitch: boolean;

    // Template governance
    canManageWhatsAppTemplates: boolean;
    canManageEmailTemplates: boolean;
    canPauseTemplates: boolean;

    // Billing
    canManagePricing: boolean;
    canManageTopUpPackages: boolean;
    canIssueCredits: boolean;
    canProcessRefunds: boolean;

    // Compliance & Security
    canViewAuditLogs: boolean;
    canExportData: boolean;
    canManageCompliance: boolean;

    // System settings
    canManageSystemSettings: boolean;
}

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<SuperAdminRole, SuperAdminPermissions> = {
    [SuperAdminRole.PLATFORM_ADMIN]: {
        canManageOrganizations: true,
        canSuspendOrganizations: true,
        canDeleteOrganizations: true,
        canImpersonate: true,
        canManageAdminUsers: true,
        canManageTenantUsers: true,
        canManageFeatureFlags: true,
        canManageAutomationPolicy: true,
        canUseKillSwitch: true,
        canManageWhatsAppTemplates: true,
        canManageEmailTemplates: true,
        canPauseTemplates: true,
        canManagePricing: true,
        canManageTopUpPackages: true,
        canIssueCredits: true,
        canProcessRefunds: true,
        canViewAuditLogs: true,
        canExportData: true,
        canManageCompliance: true,
        canManageSystemSettings: true,
    },
    [SuperAdminRole.SUPPORT]: {
        canManageOrganizations: true,
        canSuspendOrganizations: false,
        canDeleteOrganizations: false,
        canImpersonate: true,
        canManageAdminUsers: false,
        canManageTenantUsers: true,
        canManageFeatureFlags: false,
        canManageAutomationPolicy: false,
        canUseKillSwitch: false,
        canManageWhatsAppTemplates: true,
        canManageEmailTemplates: true,
        canPauseTemplates: true,
        canManagePricing: false,
        canManageTopUpPackages: false,
        canIssueCredits: true,
        canProcessRefunds: true,
        canViewAuditLogs: true,
        canExportData: false,
        canManageCompliance: false,
        canManageSystemSettings: false,
    },
    [SuperAdminRole.VIEWER]: {
        canManageOrganizations: false,
        canSuspendOrganizations: false,
        canDeleteOrganizations: false,
        canImpersonate: false,
        canManageAdminUsers: false,
        canManageTenantUsers: false,
        canManageFeatureFlags: false,
        canManageAutomationPolicy: false,
        canUseKillSwitch: false,
        canManageWhatsAppTemplates: false,
        canManageEmailTemplates: false,
        canPauseTemplates: false,
        canManagePricing: false,
        canManageTopUpPackages: false,
        canIssueCredits: false,
        canProcessRefunds: false,
        canViewAuditLogs: true,
        canExportData: false,
        canManageCompliance: false,
        canManageSystemSettings: false,
    },
};

@Entity('admin_users')
@Index(['email'], { unique: true })
export class SuperAdminUser {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 255 })
    @Exclude()
    passwordHash: string;

    @Column({ type: 'varchar', length: 100 })
    firstName: string;

    @Column({ type: 'varchar', length: 100 })
    lastName: string;

    @Column({
        type: 'enum',
        enum: SuperAdminRole,
        default: SuperAdminRole.SUPPORT,
    })
    role: SuperAdminRole;

    @Column({
        type: 'enum',
        enum: SuperAdminStatus,
        default: SuperAdminStatus.ACTIVE,
    })
    status: SuperAdminStatus;

    @Column({ type: 'jsonb', nullable: true })
    permissions: SuperAdminPermissions;

    @Column({ type: 'varchar', length: 255, nullable: true })
    avatarUrl: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phoneNumber: string;

    @Column({ type: 'timestamp', nullable: true })
    lastLoginAt: Date;

    @Column({ type: 'varchar', length: 45, nullable: true })
    lastLoginIp: string;

    @Column({ type: 'int', default: 0 })
    loginCount: number;

    @Column({ type: 'boolean', default: false })
    twoFactorEnabled: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    @Exclude()
    twoFactorSecret: string;

    @Column({ type: 'timestamp', nullable: true })
    passwordChangedAt: Date;

    @Column({ type: 'boolean', default: false })
    mustChangePassword: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Virtual getter for full name
    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    // Get effective permissions (merge role defaults with custom overrides)
    getEffectivePermissions(): SuperAdminPermissions {
        const defaultPerms = DEFAULT_PERMISSIONS[this.role];
        if (!this.permissions) {
            return defaultPerms;
        }
        // Custom permissions override defaults
        return { ...defaultPerms, ...this.permissions };
    }

    // Check if user has a specific permission
    hasPermission(permission: keyof SuperAdminPermissions): boolean {
        const effectivePerms = this.getEffectivePermissions();
        return effectivePerms[permission] === true;
    }
}
