import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    ProductRecommendation,
    RecommendationType,
    ReorderReminder,
} from '../entities/recommendation.entity';
import { EcommerceOrder } from '../entities/order.entity';
import { Contact } from '../../contacts/contact.entity';

@Injectable()
export class RecommendationsService {
    private readonly logger = new Logger(RecommendationsService.name);

    constructor(
        @InjectRepository(ProductRecommendation)
        private readonly recommendationRepository: Repository<ProductRecommendation>,
        @InjectRepository(ReorderReminder)
        private readonly reorderRepository: Repository<ReorderReminder>,
        @InjectRepository(EcommerceOrder)
        private readonly orderRepository: Repository<EcommerceOrder>,
    ) { }

    // ========== Product Recommendations ==========

    /**
     * Create a product recommendation rule
     */
    async createRecommendation(
        tenantId: string,
        data: {
            type: RecommendationType;
            sourceProductId?: string;
            sourceCategory?: string;
            recommendedProductId: string;
            recommendedProductName: string;
            recommendedProductImage?: string;
            recommendedProductPrice: number;
            score?: number;
        },
    ): Promise<ProductRecommendation> {
        const recommendation = this.recommendationRepository.create({
            tenantId,
            type: data.type,
            sourceProductId: data.sourceProductId,
            sourceCategory: data.sourceCategory,
            recommendedProductId: data.recommendedProductId,
            recommendedProductName: data.recommendedProductName,
            recommendedProductImage: data.recommendedProductImage,
            recommendedProductPrice: data.recommendedProductPrice,
            score: data.score || 0.5,
        });

        await this.recommendationRepository.save(recommendation);
        return recommendation;
    }

    /**
     * Get upsell recommendations for a product
     */
    async getUpsells(
        tenantId: string,
        productId: string,
        limit: number = 4,
    ): Promise<ProductRecommendation[]> {
        return this.recommendationRepository.find({
            where: {
                tenantId,
                sourceProductId: productId,
                type: RecommendationType.UPSELL,
                isActive: true,
            },
            order: { score: 'DESC' },
            take: limit,
        });
    }

    /**
     * Get cross-sell recommendations for an order
     */
    async getCrossSells(
        tenantId: string,
        orderItems: Array<{ productId: string; category?: string }>,
        limit: number = 4,
    ): Promise<ProductRecommendation[]> {
        const productIds = orderItems.map((i) => i.productId);
        const categories = orderItems.map((i) => i.category).filter(Boolean) as string[];

        // Get recommendations based on products and categories
        const recommendations = await this.recommendationRepository
            .createQueryBuilder('rec')
            .where('rec.tenantId = :tenantId', { tenantId })
            .andWhere('rec.type = :type', { type: RecommendationType.CROSS_SELL })
            .andWhere('rec.isActive = true')
            .andWhere(
                '(rec.sourceProductId IN (:...productIds) OR rec.sourceCategory IN (:...categories))',
                { productIds, categories },
            )
            .andWhere('rec.recommendedProductId NOT IN (:...productIds)', { productIds })
            .orderBy('rec.score', 'DESC')
            .take(limit)
            .getMany();

        return recommendations;
    }

    /**
     * Get frequently bought together recommendations
     */
    async getFrequentlyBoughtTogether(
        tenantId: string,
        productId: string,
        limit: number = 3,
    ): Promise<ProductRecommendation[]> {
        return this.recommendationRepository.find({
            where: {
                tenantId,
                sourceProductId: productId,
                type: RecommendationType.FREQUENTLY_BOUGHT_TOGETHER,
                isActive: true,
            },
            order: { score: 'DESC' },
            take: limit,
        });
    }

    /**
     * Track recommendation impression
     */
    async trackImpression(recommendationId: string): Promise<void> {
        await this.recommendationRepository.increment(
            { id: recommendationId },
            'impressions',
            1,
        );
    }

    /**
     * Track recommendation click
     */
    async trackClick(recommendationId: string): Promise<void> {
        await this.recommendationRepository.increment(
            { id: recommendationId },
            'clicks',
            1,
        );
    }

    /**
     * Track recommendation conversion
     */
    async trackConversion(recommendationId: string, revenue: number): Promise<void> {
        await this.recommendationRepository
            .createQueryBuilder()
            .update(ProductRecommendation)
            .set({
                conversions: () => 'conversions + 1',
                revenue: () => `revenue + ${revenue}`,
            })
            .where('id = :id', { id: recommendationId })
            .execute();
    }

    // ========== Reorder Reminders ==========

    /**
     * Create or update reorder reminder after order
     */
    async processOrderForReorder(
        tenantId: string,
        order: EcommerceOrder,
    ): Promise<void> {
        const reorderableCategories = ['consumables', 'food', 'health', 'beauty', 'pet'];

        for (const item of order.items) {
            // Check if product is reorderable
            const isReorderable = reorderableCategories.some(
                (cat) => (item as any).category?.toLowerCase().includes(cat),
            );

            if (!isReorderable) continue;

            // Check for existing reminder
            let reminder = await this.reorderRepository.findOne({
                where: {
                    tenantId,
                    contactId: order.contactId,
                    productId: item.productId,
                },
            });

            if (reminder) {
                // Update existing reminder
                reminder.lastOrderId = order.id;
                reminder.lastOrderDate = order.createdAt;

                // Recalculate cycle based on history
                const previousGap = reminder.reorderCycleDays;
                const newGap = Math.floor(
                    (Date.now() - new Date(reminder.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24),
                );
                reminder.reorderCycleDays = Math.round((previousGap + newGap) / 2);

                reminder.estimatedReorderDate = new Date(
                    Date.now() + reminder.reorderCycleDays * 24 * 60 * 60 * 1000,
                );
                reminder.status = 'pending';
                reminder.reminderCount = 0;
            } else {
                // Create new reminder
                const defaultCycleDays = 30; // Default 30-day cycle
                reminder = this.reorderRepository.create({
                    tenantId,
                    contactId: order.contactId,
                    productId: item.productId,
                    productName: item.name,
                    productImage: item.imageUrl,
                    lastOrderId: order.id,
                    lastOrderDate: order.createdAt,
                    reorderCycleDays: defaultCycleDays,
                    estimatedReorderDate: new Date(Date.now() + defaultCycleDays * 24 * 60 * 60 * 1000),
                    status: 'pending',
                });
            }

            await this.reorderRepository.save(reminder);
        }

        this.logger.log(`Processed order ${order.id} for reorder reminders`);
    }

    /**
     * Get due reorder reminders
     */
    async getDueReminders(tenantId: string): Promise<ReorderReminder[]> {
        return this.reorderRepository
            .createQueryBuilder('reminder')
            .where('reminder.tenantId = :tenantId', { tenantId })
            .andWhere('reminder.status = :status', { status: 'pending' })
            .andWhere('reminder.estimatedReorderDate <= :now', { now: new Date() })
            .orderBy('reminder.estimatedReorderDate', 'ASC')
            .getMany();
    }

    /**
     * Get reminders for a contact
     */
    async getContactReminders(
        tenantId: string,
        contactId: string,
    ): Promise<ReorderReminder[]> {
        return this.reorderRepository.find({
            where: { tenantId, contactId },
            order: { estimatedReorderDate: 'ASC' },
        });
    }

    /**
     * Mark reminder as sent
     */
    async markReminderSent(reminderId: string): Promise<void> {
        await this.reorderRepository.update(reminderId, {
            status: 'sent',
            reminderCount: () => 'reminder_count + 1',
            lastRemindedAt: new Date(),
        });
    }

    /**
     * Mark reminder as converted
     */
    async markReminderConverted(reminderId: string, orderId: string): Promise<void> {
        await this.reorderRepository.update(reminderId, {
            status: 'converted',
            convertedOrderId: orderId,
        });
    }

    /**
     * Snooze reminder
     */
    async snoozeReminder(reminderId: string, days: number): Promise<void> {
        await this.reorderRepository.update(reminderId, {
            status: 'snoozed',
            snoozedUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        });
    }

    /**
     * Get recommendation stats
     */
    async getRecommendationStats(tenantId: string): Promise<{
        totalRecommendations: number;
        totalImpressions: number;
        totalClicks: number;
        totalConversions: number;
        totalRevenue: number;
        ctr: number;
        conversionRate: number;
    }> {
        const recommendations = await this.recommendationRepository.find({
            where: { tenantId },
        });

        const totals = recommendations.reduce(
            (acc, rec) => ({
                impressions: acc.impressions + rec.impressions,
                clicks: acc.clicks + rec.clicks,
                conversions: acc.conversions + rec.conversions,
                revenue: acc.revenue + Number(rec.revenue),
            }),
            { impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
        );

        return {
            totalRecommendations: recommendations.length,
            totalImpressions: totals.impressions,
            totalClicks: totals.clicks,
            totalConversions: totals.conversions,
            totalRevenue: totals.revenue,
            ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
            conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
        };
    }
}
