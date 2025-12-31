import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TopUpPackage } from '../entities/topup-package.entity';
import { ConversationPricing, ConversationCategory } from '../entities/conversation-pricing.entity';
import { AdminAuditLog, AdminAuditAction } from '../entities/admin-audit-log.entity';
import { SuperAdminUser } from '../entities/super-admin-user.entity';
import { WalletService } from './wallet.service';
import {
    CreateTopUpPackageDto,
    UpdateTopUpPackageDto,
    TopUpPackageResponseDto,
    CreatePricingDto,
    UpdatePricingDto,
    PricingResponseDto,
    PurchaseCreditsDto,
    TransactionResponseDto,
    RevenueStatsDto,
} from '../dto/billing.dto';
import { PaymentMethod, TransactionType, MessageTransaction } from '../entities/message-transaction.entity';

@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);

    constructor(
        @InjectRepository(TopUpPackage)
        private packageRepository: Repository<TopUpPackage>,
        @InjectRepository(ConversationPricing)
        private pricingRepository: Repository<ConversationPricing>,
        @InjectRepository(AdminAuditLog)
        private auditLogRepository: Repository<AdminAuditLog>,
        @InjectRepository(MessageTransaction)
        private transactionRepository: Repository<MessageTransaction>,
        private walletService: WalletService,
    ) { }

    // ==================== TOP-UP PACKAGES ====================

    /**
     * Get all active top-up packages (for users)
     */
    async getActivePackages(): Promise<TopUpPackageResponseDto[]> {
        const packages = await this.packageRepository.find({
            where: { isActive: true, isHidden: false },
            order: { sortOrder: 'ASC' },
        });
        return packages.map(pkg => this.toPackageResponse(pkg));
    }

    /**
     * Get all packages (for admin)
     */
    async getAllPackages(): Promise<TopUpPackageResponseDto[]> {
        const packages = await this.packageRepository.find({
            order: { sortOrder: 'ASC' },
        });
        return packages.map(pkg => this.toPackageResponse(pkg));
    }

    /**
     * Get single package
     */
    async getPackage(id: string): Promise<TopUpPackageResponseDto> {
        const pkg = await this.packageRepository.findOne({ where: { id } });
        if (!pkg) {
            throw new NotFoundException('Package not found');
        }
        return this.toPackageResponse(pkg);
    }

    /**
     * Create top-up package (admin)
     */
    async createPackage(
        createDto: CreateTopUpPackageDto,
        admin: SuperAdminUser,
    ): Promise<TopUpPackageResponseDto> {
        const pkg = this.packageRepository.create({
            ...createDto,
            isActive: true,
        });

        await this.packageRepository.save(pkg);

        await this.createAuditLog({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.fullName,
            action: AdminAuditAction.CREATE,
            resourceType: 'topup_package',
            resourceId: pkg.id,
            resourceName: pkg.name,
            newValues: createDto,
            description: `Created top-up package: ${pkg.name}`,
            success: true,
        });

        this.logger.log(`Created top-up package: ${pkg.name}`);
        return this.toPackageResponse(pkg);
    }

    /**
     * Update top-up package (admin)
     */
    async updatePackage(
        id: string,
        updateDto: UpdateTopUpPackageDto,
        admin: SuperAdminUser,
    ): Promise<TopUpPackageResponseDto> {
        const pkg = await this.packageRepository.findOne({ where: { id } });
        if (!pkg) {
            throw new NotFoundException('Package not found');
        }

        const previousValues = {
            name: pkg.name,
            credits: pkg.credits,
            price: pkg.price,
            isActive: pkg.isActive,
        };

        Object.assign(pkg, updateDto);
        await this.packageRepository.save(pkg);

        await this.createAuditLog({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.fullName,
            action: AdminAuditAction.UPDATE,
            resourceType: 'topup_package',
            resourceId: pkg.id,
            resourceName: pkg.name,
            previousValues,
            newValues: updateDto,
            description: `Updated top-up package: ${pkg.name}`,
            success: true,
        });

        return this.toPackageResponse(pkg);
    }

    /**
     * Delete top-up package (admin)
     */
    async deletePackage(id: string, admin: SuperAdminUser): Promise<void> {
        const pkg = await this.packageRepository.findOne({ where: { id } });
        if (!pkg) {
            throw new NotFoundException('Package not found');
        }

        await this.packageRepository.delete(id);

        await this.createAuditLog({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.fullName,
            action: AdminAuditAction.DELETE,
            resourceType: 'topup_package',
            resourceId: id,
            resourceName: pkg.name,
            description: `Deleted top-up package: ${pkg.name}`,
            success: true,
        });

        this.logger.log(`Deleted top-up package: ${pkg.name}`);
    }

    // ==================== PURCHASE CREDITS ====================

    /**
     * Purchase credits (user action)
     */
    async purchaseCredits(
        purchaseDto: PurchaseCreditsDto,
    ): Promise<TransactionResponseDto> {
        let credits: number;
        let price: number;
        let packageId: string | null = null;

        if (purchaseDto.packageId) {
            // Purchase from package
            const pkg = await this.packageRepository.findOne({
                where: { id: purchaseDto.packageId, isActive: true },
            });

            if (!pkg) {
                throw new NotFoundException('Package not found or inactive');
            }

            credits = pkg.totalCredits;
            price = Number(pkg.price);
            packageId = pkg.id;
        } else if (purchaseDto.customCredits) {
            // Custom credits purchase
            credits = purchaseDto.customCredits;
            price = credits; // 1:1 for custom (no discounts)
        } else {
            throw new BadRequestException('Either packageId or customCredits is required');
        }

        // TODO: Process payment through Stripe/Razorpay
        // For now, we'll simulate a successful payment
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Add credits to wallet
        const transaction = await this.walletService.addCredits(
            {
                tenantId: purchaseDto.tenantId,
                credits,
                reason: 'Credits purchase',
                description: packageId ? `Package purchase` : `Custom credits purchase`,
            },
            undefined, // No admin, this is user action
            {
                paymentId,
                paymentMethod: purchaseDto.paymentGateway === 'razorpay'
                    ? PaymentMethod.RAZORPAY
                    : PaymentMethod.STRIPE,
                packageId,
                currencyAmount: price,
            },
        );

        this.logger.log(`Credits purchased: ${credits} for tenant ${purchaseDto.tenantId}`);
        return transaction;
    }

    // ==================== CONVERSATION PRICING ====================

    /**
     * Get all pricing configurations
     */
    async getAllPricing(): Promise<PricingResponseDto[]> {
        const pricing = await this.pricingRepository.find({
            order: { countryCode: 'ASC', category: 'ASC' },
        });
        return pricing.map(p => this.toPricingResponse(p));
    }

    /**
     * Get pricing grouped by country
     */
    async getPricingByCountry(): Promise<Record<string, PricingResponseDto[]>> {
        const pricing = await this.getAllPricing();
        const grouped: Record<string, PricingResponseDto[]> = {};

        for (const p of pricing) {
            if (!grouped[p.countryCode]) {
                grouped[p.countryCode] = [];
            }
            grouped[p.countryCode].push(p);
        }

        return grouped;
    }

    /**
     * Create pricing configuration (admin)
     */
    async createPricing(
        createDto: CreatePricingDto,
        admin: SuperAdminUser,
    ): Promise<PricingResponseDto> {
        // Check if pricing already exists
        const existing = await this.pricingRepository.findOne({
            where: { countryCode: createDto.countryCode, category: createDto.category },
        });

        if (existing) {
            throw new BadRequestException('Pricing for this country and category already exists');
        }

        const pricing = this.pricingRepository.create({
            ...createDto,
            isActive: true,
        });

        await this.pricingRepository.save(pricing);

        await this.createAuditLog({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.fullName,
            action: AdminAuditAction.PRICING_CHANGE,
            resourceType: 'conversation_pricing',
            resourceId: pricing.id,
            newValues: createDto,
            description: `Created pricing for ${createDto.countryCode} - ${createDto.category}`,
            success: true,
        });

        return this.toPricingResponse(pricing);
    }

    /**
     * Update pricing configuration (admin)
     */
    async updatePricing(
        id: string,
        updateDto: UpdatePricingDto,
        admin: SuperAdminUser,
    ): Promise<PricingResponseDto> {
        const pricing = await this.pricingRepository.findOne({ where: { id } });
        if (!pricing) {
            throw new NotFoundException('Pricing not found');
        }

        const previousValues = {
            metaCostUsd: pricing.metaCostUsd,
            platformCredits: pricing.platformCredits,
            markupPercentage: pricing.markupPercentage,
        };

        Object.assign(pricing, updateDto);
        await this.pricingRepository.save(pricing);

        await this.createAuditLog({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.fullName,
            action: AdminAuditAction.PRICING_CHANGE,
            resourceType: 'conversation_pricing',
            resourceId: pricing.id,
            previousValues,
            newValues: updateDto,
            description: `Updated pricing for ${pricing.countryCode} - ${pricing.category}`,
            success: true,
        });

        return this.toPricingResponse(pricing);
    }

    // ==================== REVENUE ANALYTICS ====================

    /**
     * Get revenue stats (admin)
     */
    async getRevenueStats(period: string): Promise<RevenueStatsDto> {
        const startDate = this.getPeriodStartDate(period);

        // Get total revenue and costs
        const stats = await this.transactionRepository
            .createQueryBuilder('t')
            .select([
                'SUM(CASE WHEN t.type = :credit THEN t.currencyAmount ELSE 0 END) as totalRevenue',
                'SUM(CASE WHEN t.type = :debit THEN ABS(t.metaCost) ELSE 0 END) as totalMetaCost',
                'COUNT(CASE WHEN t.type = :debit THEN 1 END) as totalConversations',
            ])
            .where('t.createdAt >= :startDate', { startDate })
            .setParameters({
                credit: TransactionType.CREDIT,
                debit: TransactionType.DEBIT,
            })
            .getRawOne();

        // Get top tenants
        const topTenants = await this.transactionRepository
            .createQueryBuilder('t')
            .select([
                't.tenantId as tenantId',
                'COUNT(*) as conversations',
                'SUM(ABS(t.currencyAmount)) as revenue',
            ])
            .where('t.createdAt >= :startDate', { startDate })
            .andWhere('t.type = :debit', { debit: TransactionType.DEBIT })
            .groupBy('t.tenantId')
            .orderBy('revenue', 'DESC')
            .limit(10)
            .getRawMany();

        const totalRevenue = parseFloat(stats.totalRevenue) || 0;
        const totalMetaCost = parseFloat(stats.totalMetaCost) || 0;
        const grossMargin = totalRevenue - totalMetaCost;
        const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

        return {
            period,
            totalRevenue,
            totalMetaCost,
            grossMargin,
            marginPercentage: Math.round(marginPercentage * 100) / 100,
            totalConversations: parseInt(stats.totalConversations) || 0,
            topTenants: topTenants.map(t => ({
                tenantId: t.tenantId,
                tenantName: t.tenantId, // TODO: Join with tenant table
                conversations: parseInt(t.conversations) || 0,
                revenue: parseFloat(t.revenue) || 0,
            })),
        };
    }

    // ==================== HELPERS ====================

    private toPackageResponse(pkg: TopUpPackage): TopUpPackageResponseDto {
        return {
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            badge: pkg.badge,
            credits: pkg.credits,
            bonusCredits: pkg.bonusCredits,
            totalCredits: pkg.totalCredits,
            price: Number(pkg.price),
            currency: pkg.currency,
            pricePerCredit: pkg.pricePerCredit,
            originalPrice: Number(pkg.originalPrice),
            savingsPercentage: pkg.savingsPercentage,
            isActive: pkg.isActive,
            isPopular: pkg.isPopular,
            isBestValue: pkg.isBestValue,
        };
    }

    private toPricingResponse(pricing: ConversationPricing): PricingResponseDto {
        return {
            id: pricing.id,
            countryCode: pricing.countryCode,
            countryName: pricing.countryName,
            category: pricing.category,
            metaCostUsd: Number(pricing.metaCostUsd),
            platformCredits: Number(pricing.platformCredits),
            platformCurrencyAmount: Number(pricing.platformCurrencyAmount),
            platformCurrency: pricing.platformCurrency,
            markupPercentage: Number(pricing.markupPercentage),
            isFree: pricing.isFree,
            isActive: pricing.isActive,
        };
    }

    private async createAuditLog(data: Partial<AdminAuditLog>): Promise<void> {
        const log = this.auditLogRepository.create(data);
        await this.auditLogRepository.save(log);
    }

    private getPeriodStartDate(period: string): Date {
        const now = new Date();
        switch (period) {
            case 'today':
                return new Date(now.getFullYear(), now.getMonth(), now.getDate());
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - 7);
                return weekStart;
            case 'month':
                return new Date(now.getFullYear(), now.getMonth(), 1);
            case 'year':
                return new Date(now.getFullYear(), 0, 1);
            default:
                return new Date(now.getFullYear(), now.getMonth(), 1);
        }
    }
}
