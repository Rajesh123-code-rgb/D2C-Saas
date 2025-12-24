import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice, InvoiceStatus, InvoiceLineItem, generateInvoiceNumber } from '../entities/invoice.entity';

export interface CreateInvoiceDto {
    tenantId: string;
    subscriptionId?: string;
    lineItems: InvoiceLineItem[];
    currency?: string;
    taxRate?: number;
    discount?: number;
    dueDate?: Date;
    notes?: string;
    billingDetails?: Invoice['billingDetails'];
}

export interface InvoiceFilters {
    status?: InvoiceStatus;
    startDate?: Date;
    endDate?: Date;
}

@Injectable()
export class InvoicesService {
    private readonly logger = new Logger(InvoicesService.name);

    constructor(
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
    ) { }

    /**
     * Create a new invoice
     */
    async create(dto: CreateInvoiceDto): Promise<Invoice> {
        // Calculate totals
        const subtotal = dto.lineItems.reduce((sum, item) => sum + item.amount, 0);
        const taxRate = dto.taxRate || 0;
        const taxAmount = subtotal * (taxRate / 100);
        const discount = dto.discount || 0;
        const total = subtotal + taxAmount - discount;

        // Generate invoice number
        const lastInvoice = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .orderBy('invoice.createdAt', 'DESC')
            .getOne();

        const sequence = lastInvoice
            ? parseInt(lastInvoice.invoiceNumber.split('-')[2]) + 1
            : 1;

        const invoiceNumber = generateInvoiceNumber(sequence);

        const invoice = this.invoiceRepository.create({
            tenantId: dto.tenantId,
            subscriptionId: dto.subscriptionId,
            invoiceNumber,
            status: InvoiceStatus.DRAFT,
            currency: dto.currency || 'USD',
            lineItems: dto.lineItems,
            subtotal,
            taxRate,
            taxAmount,
            discount,
            total,
            amountDue: total,
            amountPaid: 0,
            dueDate: dto.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            notes: dto.notes,
            billingDetails: dto.billingDetails,
        });

        const saved = await this.invoiceRepository.save(invoice);
        this.logger.log(`Invoice created: ${invoiceNumber}`);

        return saved;
    }

    /**
     * Find invoice by ID
     */
    async findById(id: string): Promise<Invoice> {
        const invoice = await this.invoiceRepository.findOne({
            where: { id },
            relations: ['subscription', 'subscription.plan'],
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        return invoice;
    }

    /**
     * Find invoices by tenant
     */
    async findByTenantId(
        tenantId: string,
        filters: InvoiceFilters = {},
    ): Promise<Invoice[]> {
        const query = this.invoiceRepository
            .createQueryBuilder('invoice')
            .where('invoice.tenantId = :tenantId', { tenantId })
            .leftJoinAndSelect('invoice.subscription', 'subscription')
            .orderBy('invoice.createdAt', 'DESC');

        if (filters.status) {
            query.andWhere('invoice.status = :status', { status: filters.status });
        }

        if (filters.startDate && filters.endDate) {
            query.andWhere('invoice.createdAt BETWEEN :startDate AND :endDate', {
                startDate: filters.startDate,
                endDate: filters.endDate,
            });
        }

        return query.getMany();
    }

    /**
     * Find invoice by Stripe invoice ID
     */
    async findByStripeInvoiceId(stripeInvoiceId: string): Promise<Invoice | null> {
        return this.invoiceRepository.findOne({
            where: { stripeInvoiceId },
        });
    }

    /**
     * Mark invoice as open (finalized)
     */
    async markAsOpen(id: string): Promise<Invoice> {
        const invoice = await this.findById(id);
        invoice.status = InvoiceStatus.OPEN;
        return this.invoiceRepository.save(invoice);
    }

    /**
     * Mark invoice as paid
     */
    async markAsPaid(
        id: string,
        paymentDetails?: {
            amountPaid?: number;
            stripePaymentIntentId?: string;
        },
    ): Promise<Invoice> {
        const invoice = await this.findById(id);

        invoice.status = InvoiceStatus.PAID;
        invoice.paidAt = new Date();
        invoice.amountPaid = paymentDetails?.amountPaid || invoice.total;
        invoice.amountDue = 0;

        if (paymentDetails?.stripePaymentIntentId) {
            invoice.stripePaymentIntentId = paymentDetails.stripePaymentIntentId;
        }

        const saved = await this.invoiceRepository.save(invoice);
        this.logger.log(`Invoice paid: ${invoice.invoiceNumber}`);

        return saved;
    }

    /**
     * Void an invoice
     */
    async voidInvoice(id: string): Promise<Invoice> {
        const invoice = await this.findById(id);

        if (invoice.status === InvoiceStatus.PAID) {
            throw new Error('Cannot void a paid invoice');
        }

        invoice.status = InvoiceStatus.VOID;
        return this.invoiceRepository.save(invoice);
    }

    /**
     * Update Stripe info from webhook
     */
    async updateStripeInfo(
        id: string,
        stripeData: {
            stripeInvoiceId?: string;
            stripeInvoiceUrl?: string;
            stripePdfUrl?: string;
            status?: InvoiceStatus;
        },
    ): Promise<Invoice> {
        const invoice = await this.findById(id);

        if (stripeData.stripeInvoiceId) invoice.stripeInvoiceId = stripeData.stripeInvoiceId;
        if (stripeData.stripeInvoiceUrl) invoice.stripeInvoiceUrl = stripeData.stripeInvoiceUrl;
        if (stripeData.stripePdfUrl) invoice.stripePdfUrl = stripeData.stripePdfUrl;
        if (stripeData.status) invoice.status = stripeData.status;

        return this.invoiceRepository.save(invoice);
    }

    /**
     * Create invoice from Stripe webhook data
     */
    async createFromStripeInvoice(
        tenantId: string,
        stripeInvoice: any,
    ): Promise<Invoice> {
        // Check if already exists
        const existing = await this.findByStripeInvoiceId(stripeInvoice.id);
        if (existing) {
            return existing;
        }

        // Map Stripe line items
        const lineItems: InvoiceLineItem[] = (stripeInvoice.lines?.data || []).map((line: any) => ({
            description: line.description || line.plan?.nickname || 'Subscription',
            quantity: line.quantity || 1,
            unitPrice: (line.unit_amount || line.amount) / 100,
            amount: line.amount / 100,
            period: line.period ? {
                start: new Date(line.period.start * 1000),
                end: new Date(line.period.end * 1000),
            } : undefined,
        }));

        // Generate invoice number
        const lastInvoice = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .orderBy('invoice.createdAt', 'DESC')
            .getOne();

        const sequence = lastInvoice
            ? parseInt(lastInvoice.invoiceNumber.split('-')[2]) + 1
            : 1;

        const invoiceNumber = generateInvoiceNumber(sequence);

        // Map Stripe status
        let status = InvoiceStatus.DRAFT;
        if (stripeInvoice.status === 'paid') status = InvoiceStatus.PAID;
        else if (stripeInvoice.status === 'open') status = InvoiceStatus.OPEN;
        else if (stripeInvoice.status === 'void') status = InvoiceStatus.VOID;
        else if (stripeInvoice.status === 'uncollectible') status = InvoiceStatus.UNCOLLECTIBLE;

        const invoice = this.invoiceRepository.create({
            tenantId,
            invoiceNumber,
            status,
            currency: stripeInvoice.currency?.toUpperCase() || 'USD',
            lineItems,
            subtotal: (stripeInvoice.subtotal || 0) / 100,
            taxAmount: (stripeInvoice.tax || 0) / 100,
            discount: (stripeInvoice.discount?.coupon?.amount_off || 0) / 100,
            total: (stripeInvoice.total || 0) / 100,
            amountPaid: (stripeInvoice.amount_paid || 0) / 100,
            amountDue: (stripeInvoice.amount_due || 0) / 100,
            dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null,
            paidAt: stripeInvoice.status === 'paid' ? new Date() : null,
            stripeInvoiceId: stripeInvoice.id,
            stripeInvoiceUrl: stripeInvoice.hosted_invoice_url,
            stripePdfUrl: stripeInvoice.invoice_pdf,
            stripePaymentIntentId: stripeInvoice.payment_intent,
        });

        return this.invoiceRepository.save(invoice);
    }

    /**
     * Get invoice statistics for a tenant
     */
    async getStats(tenantId: string): Promise<{
        totalInvoices: number;
        totalPaid: number;
        totalPending: number;
        totalRevenue: number;
        totalOutstanding: number;
    }> {
        const invoices = await this.findByTenantId(tenantId);

        const paidInvoices = invoices.filter(i => i.status === InvoiceStatus.PAID);
        const pendingInvoices = invoices.filter(i =>
            i.status === InvoiceStatus.OPEN || i.status === InvoiceStatus.DRAFT
        );

        return {
            totalInvoices: invoices.length,
            totalPaid: paidInvoices.length,
            totalPending: pendingInvoices.length,
            totalRevenue: paidInvoices.reduce((sum, i) => sum + Number(i.amountPaid), 0),
            totalOutstanding: pendingInvoices.reduce((sum, i) => sum + Number(i.amountDue), 0),
        };
    }
}
