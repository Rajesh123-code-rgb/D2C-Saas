import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';

export enum WalletStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    DEPLETED = 'depleted',
}

@Entity('message_wallets')
@Index(['tenantId'], { unique: true })
@Index(['status'])
export class MessageWallet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', unique: true })
    tenantId: string;

    @OneToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    // Current balance
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    creditBalance: number;  // Credits (1 credit = 1 unit of platform currency)

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    currencyBalance: number;  // Actual currency value

    @Column({ type: 'varchar', length: 3, default: 'INR' })
    currency: string;

    // Included in plan (free credits)
    @Column({ type: 'int', default: 0 })
    planCreditsMonthly: number;  // Free credits per month from subscription

    @Column({ type: 'int', default: 0 })
    planCreditsUsed: number;  // How many plan credits used this month

    @Column({ type: 'date', nullable: true })
    planCreditsResetDate: Date;  // When plan credits reset

    // Low balance settings
    @Column({ type: 'int', default: 100 })
    lowBalanceThreshold: number;  // Alert when balance falls below this

    @Column({ type: 'boolean', default: false })
    lowBalanceAlertSent: boolean;

    @Column({ type: 'timestamp', nullable: true })
    lowBalanceAlertSentAt: Date;

    // Auto-recharge settings
    @Column({ type: 'boolean', default: false })
    autoRechargeEnabled: boolean;

    @Column({ type: 'int', default: 100 })
    autoRechargeThreshold: number;  // Trigger auto-recharge when balance falls below

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    autoRechargeAmount: number;  // Amount to recharge

    @Column({ type: 'varchar', length: 255, nullable: true })
    autoRechargePaymentMethodId: string;  // Stripe/Razorpay payment method ID

    @Column({ type: 'uuid', nullable: true })
    autoRechargePackageId: string;  // Or use a specific package

    @Column({ type: 'timestamp', nullable: true })
    lastAutoRechargeAt: Date;

    @Column({ type: 'int', default: 0 })
    autoRechargeFailureCount: number;

    // Status
    @Column({
        type: 'enum',
        enum: WalletStatus,
        default: WalletStatus.ACTIVE,
    })
    status: WalletStatus;

    @Column({ type: 'timestamp', nullable: true })
    suspendedAt: Date;

    @Column({ type: 'text', nullable: true })
    suspendedReason: string;

    // Usage tracking
    @Column({ type: 'int', default: 0 })
    totalCreditsAdded: number;

    @Column({ type: 'int', default: 0 })
    totalCreditsUsed: number;

    @Column({ type: 'int', default: 0 })
    totalConversations: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Helper methods
    hasEnoughCredits(required: number): boolean {
        return this.creditBalance >= required && this.status === WalletStatus.ACTIVE;
    }

    needsAutoRecharge(): boolean {
        return (
            this.autoRechargeEnabled &&
            this.creditBalance < this.autoRechargeThreshold &&
            this.autoRechargePaymentMethodId !== null
        );
    }

    shouldSendLowBalanceAlert(): boolean {
        return (
            !this.lowBalanceAlertSent &&
            this.creditBalance < this.lowBalanceThreshold
        );
    }
}
