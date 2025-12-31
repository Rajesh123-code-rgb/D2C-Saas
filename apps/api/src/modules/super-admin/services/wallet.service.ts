import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MessageWallet, WalletStatus } from '../entities/message-wallet.entity';
import {
    MessageTransaction,
    TransactionType,
    TransactionStatus,
    PaymentMethod,
    ConversationType,
} from '../entities/message-transaction.entity';
import { ConversationPricing, ConversationCategory } from '../entities/conversation-pricing.entity';
import { TopUpPackage } from '../entities/topup-package.entity';
import { AdminAuditLog, AdminAuditAction } from '../entities/admin-audit-log.entity';
import { SuperAdminUser } from '../entities/super-admin-user.entity';
import {
    UpdateWalletSettingsDto,
    WalletResponseDto,
    AddCreditsDto,
    DeductCreditsDto,
    RefundCreditsDto,
    TransactionResponseDto,
    TransactionFilterDto,
    TransactionListResponseDto,
} from '../dto/billing.dto';

@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);

    constructor(
        @InjectRepository(MessageWallet)
        private walletRepository: Repository<MessageWallet>,
        @InjectRepository(MessageTransaction)
        private transactionRepository: Repository<MessageTransaction>,
        @InjectRepository(ConversationPricing)
        private pricingRepository: Repository<ConversationPricing>,
        @InjectRepository(TopUpPackage)
        private packageRepository: Repository<TopUpPackage>,
        @InjectRepository(AdminAuditLog)
        private auditLogRepository: Repository<AdminAuditLog>,
        private dataSource: DataSource,
    ) { }

    /**
     * Get or create wallet for a tenant
     */
    async getOrCreateWallet(tenantId: string, currency = 'INR'): Promise<MessageWallet> {
        let wallet = await this.walletRepository.findOne({
            where: { tenantId },
        });

        if (!wallet) {
            wallet = this.walletRepository.create({
                tenantId,
                currency,
                creditBalance: 0,
                currencyBalance: 0,
                status: WalletStatus.ACTIVE,
            });
            await this.walletRepository.save(wallet);
            this.logger.log(`Created wallet for tenant: ${tenantId}`);
        }

        return wallet;
    }

    /**
     * Get wallet by tenant ID
     */
    async getWallet(tenantId: string): Promise<WalletResponseDto> {
        const wallet = await this.getOrCreateWallet(tenantId);
        return this.toWalletResponse(wallet);
    }

    /**
     * Update wallet settings (auto-recharge, thresholds)
     */
    async updateWalletSettings(
        tenantId: string,
        updateDto: UpdateWalletSettingsDto,
    ): Promise<WalletResponseDto> {
        const wallet = await this.getOrCreateWallet(tenantId);

        if (updateDto.lowBalanceThreshold !== undefined) {
            wallet.lowBalanceThreshold = updateDto.lowBalanceThreshold;
        }
        if (updateDto.autoRechargeEnabled !== undefined) {
            wallet.autoRechargeEnabled = updateDto.autoRechargeEnabled;
        }
        if (updateDto.autoRechargeThreshold !== undefined) {
            wallet.autoRechargeThreshold = updateDto.autoRechargeThreshold;
        }
        if (updateDto.autoRechargeAmount !== undefined) {
            wallet.autoRechargeAmount = updateDto.autoRechargeAmount;
        }
        if (updateDto.autoRechargePaymentMethodId !== undefined) {
            wallet.autoRechargePaymentMethodId = updateDto.autoRechargePaymentMethodId;
        }
        if (updateDto.autoRechargePackageId !== undefined) {
            wallet.autoRechargePackageId = updateDto.autoRechargePackageId;
        }

        // Reset low balance alert if threshold changed
        if (updateDto.lowBalanceThreshold !== undefined) {
            wallet.lowBalanceAlertSent = false;
        }

        await this.walletRepository.save(wallet);
        return this.toWalletResponse(wallet);
    }

    /**
     * Check if tenant has enough credits
     */
    async hasEnoughCredits(tenantId: string, requiredCredits: number): Promise<boolean> {
        const wallet = await this.getOrCreateWallet(tenantId);
        return wallet.hasEnoughCredits(requiredCredits);
    }

    /**
     * Get credit cost for a conversation type and country
     */
    async getConversationCost(
        category: ConversationCategory,
        countryCode: string,
    ): Promise<{ credits: number; currency: number; metaCost: number; isFree: boolean }> {
        // Try to find country-specific pricing
        let pricing = await this.pricingRepository.findOne({
            where: { countryCode, category, isActive: true },
        });

        // Fall back to default pricing
        if (!pricing) {
            pricing = await this.pricingRepository.findOne({
                where: { countryCode: '*', category, isActive: true },
            });
        }

        if (!pricing) {
            // No pricing found, use default values
            return {
                credits: 1,
                currency: 1,
                metaCost: 0.01,
                isFree: category === ConversationCategory.SERVICE,
            };
        }

        return {
            credits: pricing.platformCredits,
            currency: pricing.platformCurrencyAmount,
            metaCost: pricing.metaCostUsd,
            isFree: pricing.isFree,
        };
    }

    /**
     * Add credits to wallet (admin action or purchase)
     */
    async addCredits(
        addDto: AddCreditsDto,
        admin?: SuperAdminUser,
        paymentDetails?: {
            paymentId: string;
            paymentMethod: PaymentMethod;
            packageId?: string;
            currencyAmount?: number;
        },
    ): Promise<TransactionResponseDto> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const wallet = await this.getOrCreateWallet(addDto.tenantId);
            const balanceBefore = wallet.creditBalance;

            // Update wallet balance
            wallet.creditBalance = Number(wallet.creditBalance) + addDto.credits;
            wallet.currencyBalance = Number(wallet.currencyBalance) + (paymentDetails?.currencyAmount || addDto.credits);
            wallet.totalCreditsAdded = Number(wallet.totalCreditsAdded) + addDto.credits;

            // Reset suspended status if was depleted
            if (wallet.status === WalletStatus.DEPLETED) {
                wallet.status = WalletStatus.ACTIVE;
                wallet.suspendedAt = null;
                wallet.suspendedReason = null;
            }

            // Reset low balance alert
            if (wallet.creditBalance >= wallet.lowBalanceThreshold) {
                wallet.lowBalanceAlertSent = false;
            }

            await queryRunner.manager.save(wallet);

            // Create transaction record
            const transaction = this.transactionRepository.create({
                tenantId: addDto.tenantId,
                walletId: wallet.id,
                type: paymentDetails ? TransactionType.CREDIT : TransactionType.ADJUSTMENT,
                creditsAmount: addDto.credits,
                currencyAmount: paymentDetails?.currencyAmount || addDto.credits,
                balanceBefore,
                balanceAfter: wallet.creditBalance,
                status: TransactionStatus.COMPLETED,
                description: addDto.description || addDto.reason,
                paymentId: paymentDetails?.paymentId,
                paymentMethod: paymentDetails?.paymentMethod || PaymentMethod.ADMIN_CREDIT,
                topUpPackageId: paymentDetails?.packageId,
                adjustedByAdminId: admin?.id,
            });

            await queryRunner.manager.save(transaction);
            await queryRunner.commitTransaction();

            // Log audit
            if (admin) {
                await this.createAuditLog({
                    adminId: admin.id,
                    adminEmail: admin.email,
                    adminName: admin.fullName,
                    action: AdminAuditAction.CREDIT_ISSUE,
                    resourceType: 'message_wallet',
                    resourceId: wallet.id,
                    targetTenantId: addDto.tenantId,
                    newValues: { credits: addDto.credits, reason: addDto.reason },
                    description: `Added ${addDto.credits} credits to tenant ${addDto.tenantId}`,
                    success: true,
                });
            }

            this.logger.log(`Added ${addDto.credits} credits to tenant ${addDto.tenantId}`);
            return this.toTransactionResponse(transaction);

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Deduct credits from wallet (message send)
     */
    async deductCredits(deductDto: DeductCreditsDto): Promise<TransactionResponseDto> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const wallet = await this.getOrCreateWallet(deductDto.tenantId);

            // Check sufficient balance
            if (!wallet.hasEnoughCredits(deductDto.credits)) {
                throw new BadRequestException('Insufficient credits');
            }

            const balanceBefore = wallet.creditBalance;

            // Deduct from wallet
            wallet.creditBalance = Number(wallet.creditBalance) - deductDto.credits;
            wallet.currencyBalance = Number(wallet.currencyBalance) - deductDto.credits;
            wallet.totalCreditsUsed = Number(wallet.totalCreditsUsed) + deductDto.credits;
            wallet.totalConversations = Number(wallet.totalConversations) + 1;

            // Check low balance
            if (wallet.shouldSendLowBalanceAlert()) {
                wallet.lowBalanceAlertSent = true;
                wallet.lowBalanceAlertSentAt = new Date();
                // TODO: Send low balance notification
            }

            // Check if depleted
            if (wallet.creditBalance <= 0) {
                wallet.status = WalletStatus.DEPLETED;
                wallet.suspendedAt = new Date();
                wallet.suspendedReason = 'Credit balance depleted';
            }

            await queryRunner.manager.save(wallet);

            // Get pricing for meta cost tracking
            const pricing = await this.getConversationCost(
                deductDto.conversationType,
                deductDto.contactCountry || '*',
            );

            // Map ConversationCategory to ConversationType (same values, different enums)
            const conversationType = deductDto.conversationType.toLowerCase() as ConversationType;

            // Create transaction record
            const transaction = this.transactionRepository.create({
                tenantId: deductDto.tenantId,
                walletId: wallet.id,
                type: TransactionType.DEBIT,
                creditsAmount: -deductDto.credits,
                currencyAmount: -deductDto.credits,
                metaCost: pricing.metaCost,
                platformMarkup: deductDto.credits - pricing.metaCost,
                balanceBefore,
                balanceAfter: wallet.creditBalance,
                status: TransactionStatus.COMPLETED,
                conversationType,
                messageId: deductDto.messageId,
                conversationId: deductDto.conversationId,
                contactId: deductDto.contactId,
                contactCountry: deductDto.contactCountry,
                description: `Message sent (${deductDto.conversationType})`,
            });

            await queryRunner.manager.save(transaction);
            await queryRunner.commitTransaction();

            return this.toTransactionResponse(transaction);

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Process refund
     */
    async refundCredits(
        refundDto: RefundCreditsDto,
        admin: SuperAdminUser,
    ): Promise<TransactionResponseDto> {
        const originalTransaction = await this.transactionRepository.findOne({
            where: { id: refundDto.transactionId },
        });

        if (!originalTransaction) {
            throw new NotFoundException('Original transaction not found');
        }

        if (originalTransaction.status === TransactionStatus.REFUNDED) {
            throw new BadRequestException('Transaction already refunded');
        }

        const refundAmount = refundDto.amount || Math.abs(originalTransaction.creditsAmount);

        // Add credits back
        const addResult = await this.addCredits(
            {
                tenantId: originalTransaction.tenantId,
                credits: refundAmount,
                reason: `Refund: ${refundDto.reason}`,
                description: `Refund for transaction ${originalTransaction.id}`,
            },
            admin,
        );

        // Update original transaction status
        originalTransaction.status = TransactionStatus.REFUNDED;
        await this.transactionRepository.save(originalTransaction);

        // Log audit
        await this.createAuditLog({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.fullName,
            action: AdminAuditAction.REFUND,
            resourceType: 'message_wallet',
            resourceId: originalTransaction.walletId,
            targetTenantId: originalTransaction.tenantId,
            previousValues: { transactionId: refundDto.transactionId },
            newValues: { refundAmount, reason: refundDto.reason },
            description: `Refunded ${refundAmount} credits for transaction ${refundDto.transactionId}`,
            success: true,
        });

        return addResult;
    }

    /**
     * Get transaction history
     */
    async getTransactions(
        filter: TransactionFilterDto,
    ): Promise<TransactionListResponseDto> {
        const page = filter.page || 1;
        const limit = filter.limit || 20;
        const skip = (page - 1) * limit;

        const queryBuilder = this.transactionRepository
            .createQueryBuilder('t')
            .orderBy('t.createdAt', 'DESC');

        if (filter.tenantId) {
            queryBuilder.andWhere('t.tenantId = :tenantId', { tenantId: filter.tenantId });
        }

        if (filter.type) {
            queryBuilder.andWhere('t.type = :type', { type: filter.type });
        }

        if (filter.status) {
            queryBuilder.andWhere('t.status = :status', { status: filter.status });
        }

        if (filter.startDate) {
            queryBuilder.andWhere('t.createdAt >= :startDate', { startDate: filter.startDate });
        }

        if (filter.endDate) {
            queryBuilder.andWhere('t.createdAt <= :endDate', { endDate: filter.endDate });
        }

        const [transactions, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return {
            transactions: transactions.map(t => this.toTransactionResponse(t)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Allocate monthly plan credits
     */
    async allocatePlanCredits(
        tenantId: string,
        credits: number,
    ): Promise<void> {
        const wallet = await this.getOrCreateWallet(tenantId);

        wallet.planCreditsMonthly = credits;
        wallet.planCreditsUsed = 0;
        wallet.planCreditsResetDate = this.getNextMonthFirstDay();

        // Add plan credits to balance
        const balanceBefore = wallet.creditBalance;
        wallet.creditBalance = Number(wallet.creditBalance) + credits;

        await this.walletRepository.save(wallet);

        // Create transaction record
        const transaction = this.transactionRepository.create({
            tenantId,
            walletId: wallet.id,
            type: TransactionType.PLAN_ALLOCATION,
            creditsAmount: credits,
            balanceBefore,
            balanceAfter: wallet.creditBalance,
            status: TransactionStatus.COMPLETED,
            paymentMethod: PaymentMethod.PLAN_CREDIT,
            description: `Monthly plan credits allocation`,
        });

        await this.transactionRepository.save(transaction);
        this.logger.log(`Allocated ${credits} plan credits to tenant ${tenantId}`);
    }

    /**
     * Get usage stats for a tenant
     */
    async getUsageStats(tenantId: string, period: string): Promise<any> {
        const startDate = this.getPeriodStartDate(period);

        const stats = await this.transactionRepository
            .createQueryBuilder('t')
            .select([
                'COUNT(*) as totalTransactions',
                'SUM(CASE WHEN t.type = :debit THEN 1 ELSE 0 END) as totalConversations',
                'SUM(CASE WHEN t.type = :debit THEN ABS(t.creditsAmount) ELSE 0 END) as totalCreditsUsed',
                'SUM(CASE WHEN t.conversationType = :marketing THEN 1 ELSE 0 END) as marketingCount',
                'SUM(CASE WHEN t.conversationType = :utility THEN 1 ELSE 0 END) as utilityCount',
                'SUM(CASE WHEN t.conversationType = :auth THEN 1 ELSE 0 END) as authCount',
                'SUM(CASE WHEN t.conversationType = :service THEN 1 ELSE 0 END) as serviceCount',
            ])
            .where('t.tenantId = :tenantId', { tenantId })
            .andWhere('t.createdAt >= :startDate', { startDate })
            .setParameters({
                debit: TransactionType.DEBIT,
                marketing: ConversationType.MARKETING,
                utility: ConversationType.UTILITY,
                auth: ConversationType.AUTHENTICATION,
                service: ConversationType.SERVICE,
            })
            .getRawOne();

        return {
            tenantId,
            period,
            totalCreditsUsed: parseInt(stats.totalCreditsUsed) || 0,
            totalConversations: parseInt(stats.totalConversations) || 0,
            conversationsByCategory: {
                marketing: parseInt(stats.marketingCount) || 0,
                utility: parseInt(stats.utilityCount) || 0,
                authentication: parseInt(stats.authCount) || 0,
                service: parseInt(stats.serviceCount) || 0,
            },
        };
    }

    /**
     * Helper: Convert wallet to response DTO
     */
    private toWalletResponse(wallet: MessageWallet): WalletResponseDto {
        return {
            id: wallet.id,
            tenantId: wallet.tenantId,
            creditBalance: Number(wallet.creditBalance),
            currencyBalance: Number(wallet.currencyBalance),
            currency: wallet.currency,
            planCreditsMonthly: wallet.planCreditsMonthly,
            planCreditsUsed: wallet.planCreditsUsed,
            planCreditsResetDate: wallet.planCreditsResetDate,
            lowBalanceThreshold: wallet.lowBalanceThreshold,
            autoRechargeEnabled: wallet.autoRechargeEnabled,
            autoRechargeThreshold: wallet.autoRechargeThreshold,
            status: wallet.status,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
        };
    }

    /**
     * Helper: Convert transaction to response DTO
     */
    private toTransactionResponse(transaction: MessageTransaction): TransactionResponseDto {
        return {
            id: transaction.id,
            tenantId: transaction.tenantId,
            type: transaction.type,
            creditsAmount: Number(transaction.creditsAmount),
            currencyAmount: Number(transaction.currencyAmount),
            balanceBefore: Number(transaction.balanceBefore),
            balanceAfter: Number(transaction.balanceAfter),
            status: transaction.status,
            description: transaction.description,
            conversationType: transaction.conversationType,
            createdAt: transaction.createdAt,
        };
    }

    /**
     * Helper: Create audit log
     */
    private async createAuditLog(data: Partial<AdminAuditLog>): Promise<void> {
        const log = this.auditLogRepository.create(data);
        await this.auditLogRepository.save(log);
    }

    /**
     * Helper: Get first day of next month
     */
    private getNextMonthFirstDay(): Date {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    /**
     * Helper: Get period start date
     */
    private getPeriodStartDate(period: string): Date {
        const now = new Date();
        switch (period) {
            case 'day':
                return new Date(now.getFullYear(), now.getMonth(), now.getDate());
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
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
