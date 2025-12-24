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
import { Tenant } from '../../tenants/tenant.entity';
import { Subscription } from './subscription.entity';

export enum InvoiceStatus {
    DRAFT = 'draft',
    OPEN = 'open',
    PAID = 'paid',
    VOID = 'void',
    UNCOLLECTIBLE = 'uncollectible',
}

export interface InvoiceLineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    period?: {
        start: Date;
        end: Date;
    };
}

@Entity('invoices')
@Index(['tenantId'])
@Index(['subscriptionId'])
@Index(['invoiceNumber'], { unique: true })
@Index(['stripeInvoiceId'], { unique: true, where: '"stripeInvoiceId" IS NOT NULL' })
export class Invoice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column({ type: 'uuid', nullable: true })
    subscriptionId: string;

    @ManyToOne(() => Subscription)
    @JoinColumn({ name: 'subscriptionId' })
    subscription: Subscription;

    @Column({ type: 'varchar', length: 50 })
    invoiceNumber: string; // Format: INV-2024-0001

    @Column({
        type: 'enum',
        enum: InvoiceStatus,
        default: InvoiceStatus.DRAFT,
    })
    status: InvoiceStatus;

    @Column({ type: 'varchar', length: 3, default: 'USD' })
    currency: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    subtotal: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    taxRate: number; // Percentage

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    taxAmount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    discount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    total: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    amountPaid: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    amountDue: number;

    @Column({ type: 'jsonb', default: [] })
    lineItems: InvoiceLineItem[];

    @Column({ type: 'timestamp', nullable: true })
    dueDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    paidAt: Date;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripeInvoiceId: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripePaymentIntentId: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    stripeInvoiceUrl: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    stripePdfUrl: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'jsonb', nullable: true })
    billingDetails: {
        name?: string;
        email?: string;
        phone?: string;
        address?: {
            line1?: string;
            line2?: string;
            city?: string;
            state?: string;
            postalCode?: string;
            country?: string;
        };
    };

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// Helper to generate invoice number
export function generateInvoiceNumber(sequence: number): string {
    const year = new Date().getFullYear();
    const paddedSequence = String(sequence).padStart(6, '0');
    return `INV-${year}-${paddedSequence}`;
}
