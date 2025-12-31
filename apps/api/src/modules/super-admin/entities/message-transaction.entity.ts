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
import { MessageWallet } from './message-wallet.entity';

export enum TransactionType {
    CREDIT = 'credit',              // Top-up or credit added
    DEBIT = 'debit',                // Message sent, credits deducted
    REFUND = 'refund',              // Refund issued
    PLAN_ALLOCATION = 'plan_allocation',  // Monthly plan credits
    EXPIRY = 'expiry',              // Credits expired
    ADJUSTMENT = 'adjustment',       // Admin manual adjustment
    BONUS = 'bonus',                // Bonus credits
}

export enum TransactionStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded',
    CANCELLED = 'cancelled',
}

export enum PaymentMethod {
    STRIPE = 'stripe',
    RAZORPAY = 'razorpay',
    PAYPAL = 'paypal',
    BANK_TRANSFER = 'bank_transfer',
    ADMIN_CREDIT = 'admin_credit',
    PLAN_CREDIT = 'plan_credit',
}

export enum ConversationType {
    MARKETING = 'marketing',
    UTILITY = 'utility',
    AUTHENTICATION = 'authentication',
    SERVICE = 'service',
}

@Entity('message_transactions')
@Index(['tenantId', 'createdAt'])
@Index(['walletId'])
@Index(['type'])
@Index(['status'])
@Index(['paymentId'])
@Index(['conversationId'])
export class MessageTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column({ type: 'uuid' })
    walletId: string;

    @ManyToOne(() => MessageWallet)
    @JoinColumn({ name: 'walletId' })
    wallet: MessageWallet;

    // Transaction type
    @Column({
        type: 'enum',
        enum: TransactionType,
    })
    type: TransactionType;

    // For credits (top-ups)
    @Column({ type: 'uuid', nullable: true })
    topUpPackageId: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    paymentId: string;  // External payment ID (Stripe, Razorpay)

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        nullable: true,
    })
    paymentMethod: PaymentMethod;

    @Column({ type: 'varchar', length: 255, nullable: true })
    paymentGatewayResponse: string;

    // For debits (message sends)
    @Column({
        type: 'enum',
        enum: ConversationType,
        nullable: true,
    })
    conversationType: ConversationType;

    @Column({ type: 'uuid', nullable: true })
    messageId: string;

    @Column({ type: 'uuid', nullable: true })
    conversationId: string;

    @Column({ type: 'uuid', nullable: true })
    contactId: string;

    @Column({ type: 'varchar', length: 2, nullable: true })
    contactCountry: string;  // For country-based pricing

    // Amounts
    @Column({ type: 'decimal', precision: 12, scale: 2 })
    creditsAmount: number;  // Credits added/deducted

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    currencyAmount: number;  // Actual currency value (for payments)

    @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
    metaCost: number;  // What we pay Meta (for debits)

    @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
    platformMarkup: number;  // Our margin

    // Balance tracking
    @Column({ type: 'decimal', precision: 12, scale: 2 })
    balanceBefore: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    balanceAfter: number;

    // Status
    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING,
    })
    status: TransactionStatus;

    @Column({ type: 'text', nullable: true })
    failureReason: string;

    // Linked transactions (for refunds)
    @Column({ type: 'uuid', nullable: true })
    relatedTransactionId: string;

    // Metadata
    @Column({ type: 'varchar', length: 255, nullable: true })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    // Admin who made the adjustment (if applicable)
    @Column({ type: 'uuid', nullable: true })
    adjustedByAdminId: string;

    @CreateDateColumn()
    createdAt: Date;
}
