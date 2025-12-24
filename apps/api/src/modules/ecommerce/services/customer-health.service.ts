import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    CustomerHealthScore,
    HealthStatus,
} from '../entities/customer-health.entity';
import { Contact } from '../../contacts/contact.entity';
import { EcommerceOrder } from '../entities/order.entity';
import { EventsService } from './events.service';
import { EcommerceEventType } from '../entities/event.entity';

@Injectable()
export class CustomerHealthService {
    private readonly logger = new Logger(CustomerHealthService.name);

    constructor(
        @InjectRepository(CustomerHealthScore)
        private readonly healthRepository: Repository<CustomerHealthScore>,
        @InjectRepository(Contact)
        private readonly contactRepository: Repository<Contact>,
        @InjectRepository(EcommerceOrder)
        private readonly orderRepository: Repository<EcommerceOrder>,
        private readonly eventsService: EventsService,
    ) { }

    /**
     * Calculate or update health score for a contact
     */
    async calculateHealthScore(tenantId: string, contactId: string): Promise<CustomerHealthScore> {
        let healthScore = await this.healthRepository.findOne({
            where: { tenantId, contactId },
        });

        if (!healthScore) {
            healthScore = this.healthRepository.create({ tenantId, contactId });
        }

        // Get contact with orders
        const contact = await this.contactRepository.findOne({
            where: { id: contactId },
        });

        if (!contact) {
            throw new Error('Contact not found');
        }

        // Get all orders for this contact
        const orders = await this.orderRepository.find({
            where: { tenantId, contactId },
            order: { createdAt: 'DESC' },
        });

        // Calculate metrics
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0);
        const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

        // Days since last order
        const lastOrder = orders[0];
        const daysSinceLastOrder = lastOrder
            ? Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

        // Average order gap
        let averageOrderGapDays = 0;
        if (orders.length >= 2) {
            const gaps: number[] = [];
            for (let i = 0; i < orders.length - 1; i++) {
                const gap = (new Date(orders[i].createdAt).getTime() - new Date(orders[i + 1].createdAt).getTime()) / (1000 * 60 * 60 * 24);
                gaps.push(gap);
            }
            averageOrderGapDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        }

        // COD Risk Score
        const codOrders = orders.filter(o => o.paymentMethod === 'cod');
        const codDelivered = codOrders.filter(o => o.status === 'delivered').length;
        const codRTO = codOrders.filter(o => o.status === 'returned').length;
        const codRiskScore = codOrders.length > 0
            ? Math.round((codDelivered / codOrders.length) * 100)
            : 50; // Default to 50 if no COD history

        // Calculate component scores (0-100)
        const recencyScore = this.calculateRecencyScore(daysSinceLastOrder);
        const frequencyScore = this.calculateFrequencyScore(totalOrders, averageOrderGapDays);
        const monetaryScore = this.calculateMonetaryScore(totalSpent, avgOrderValue);
        const engagementScore = 50; // TODO: Calculate from message/campaign engagement

        // Overall health score (weighted average)
        const overallScore = Math.round(
            recencyScore * 0.3 +
            frequencyScore * 0.25 +
            monetaryScore * 0.25 +
            engagementScore * 0.2
        );

        // Determine health status
        let healthStatus: HealthStatus;
        if (overallScore >= 80) {
            healthStatus = HealthStatus.EXCELLENT;
        } else if (overallScore >= 60) {
            healthStatus = HealthStatus.GOOD;
        } else if (overallScore >= 40) {
            healthStatus = HealthStatus.AT_RISK;
        } else if (overallScore >= 20) {
            healthStatus = HealthStatus.CHURNING;
        } else {
            healthStatus = HealthStatus.CHURNED;
        }

        // Churn prediction
        const churnProbability = this.calculateChurnProbability(
            daysSinceLastOrder,
            averageOrderGapDays,
            totalOrders
        );

        const churnRiskFactors = this.identifyChurnRiskFactors(
            daysSinceLastOrder,
            averageOrderGapDays,
            totalOrders,
            codRiskScore
        );

        // Win-back eligibility
        let winBackEligible = false;
        let winBackTier: '30_day' | '60_day' | '90_day' | '120_day' | null = null;

        if (totalOrders > 0 && daysSinceLastOrder >= 30) {
            winBackEligible = true;
            if (daysSinceLastOrder >= 120) {
                winBackTier = '120_day';
            } else if (daysSinceLastOrder >= 90) {
                winBackTier = '90_day';
            } else if (daysSinceLastOrder >= 60) {
                winBackTier = '60_day';
            } else {
                winBackTier = '30_day';
            }
        }

        // Update health score
        Object.assign(healthScore, {
            healthScore: overallScore,
            healthStatus,
            purchaseFrequencyScore: frequencyScore,
            monetaryValueScore: monetaryScore,
            recencyScore,
            engagementScore,
            codRiskScore,
            codOrdersTotal: codOrders.length,
            codOrdersDelivered: codDelivered,
            codOrdersRTO: codRTO,
            daysSinceLastOrder,
            averageOrderGapDays,
            totalOrders,
            totalSpent,
            averageOrderValue: avgOrderValue,
            churnProbability,
            churnRiskFactors,
            winBackEligible,
            winBackTier,
            lastCalculatedAt: new Date(),
        });

        await this.healthRepository.save(healthScore);

        this.logger.log(`Health score calculated for contact ${contactId}: ${overallScore}`);

        return healthScore;
    }

    private calculateRecencyScore(daysSinceLastOrder: number): number {
        if (daysSinceLastOrder <= 7) return 100;
        if (daysSinceLastOrder <= 14) return 90;
        if (daysSinceLastOrder <= 30) return 75;
        if (daysSinceLastOrder <= 60) return 50;
        if (daysSinceLastOrder <= 90) return 30;
        if (daysSinceLastOrder <= 180) return 15;
        return 5;
    }

    private calculateFrequencyScore(totalOrders: number, avgGapDays: number): number {
        // Score based on order count and purchase frequency
        const orderCountScore = Math.min(totalOrders * 10, 50);
        const frequencyScore = avgGapDays > 0
            ? Math.max(50 - avgGapDays, 0)
            : 25;
        return Math.round((orderCountScore + frequencyScore) / 2);
    }

    private calculateMonetaryScore(totalSpent: number, avgOrderValue: number): number {
        // Score based on total spend and AOV (adjust thresholds based on business)
        const spendScore = Math.min(totalSpent / 500, 50); // ₹50k = max 50 points
        const aovScore = Math.min(avgOrderValue / 100, 50); // ₹5k AOV = max 50 points
        return Math.round(spendScore + aovScore);
    }

    private calculateChurnProbability(
        daysSinceLastOrder: number,
        avgGapDays: number,
        totalOrders: number,
    ): number {
        if (totalOrders === 0) return 0;

        // Simple churn probability based on deviation from average purchase gap
        if (avgGapDays === 0) avgGapDays = 30; // Default

        const deviationRatio = daysSinceLastOrder / avgGapDays;

        if (deviationRatio < 1.5) return 0.1;
        if (deviationRatio < 2) return 0.3;
        if (deviationRatio < 3) return 0.5;
        if (deviationRatio < 4) return 0.7;
        return 0.9;
    }

    private identifyChurnRiskFactors(
        daysSinceLastOrder: number,
        avgGapDays: number,
        totalOrders: number,
        codRiskScore: number,
    ): string[] {
        const factors: string[] = [];

        if (daysSinceLastOrder > 60) {
            factors.push('Long inactive period');
        }
        if (totalOrders === 1) {
            factors.push('Single purchase customer');
        }
        if (avgGapDays > 60 && totalOrders > 1) {
            factors.push('Infrequent buyer');
        }
        if (codRiskScore < 50 && totalOrders > 0) {
            factors.push('Low COD reliability');
        }

        return factors;
    }

    /**
     * Get win-back eligible customers
     */
    async getWinBackCandidates(
        tenantId: string,
        tier?: '30_day' | '60_day' | '90_day' | '120_day',
    ): Promise<CustomerHealthScore[]> {
        const where: any = { tenantId, winBackEligible: true };
        if (tier) where.winBackTier = tier;

        return this.healthRepository.find({
            where,
            relations: ['contact'],
            order: { churnProbability: 'DESC' },
        });
    }

    /**
     * Get at-risk customers
     */
    async getAtRiskCustomers(tenantId: string): Promise<CustomerHealthScore[]> {
        return this.healthRepository.find({
            where: {
                tenantId,
                healthStatus: HealthStatus.AT_RISK,
            },
            relations: ['contact'],
            order: { churnProbability: 'DESC' },
            take: 100,
        });
    }

    /**
     * Get COD risky customers
     */
    async getCODRiskyCustomers(tenantId: string, maxScore: number = 40): Promise<CustomerHealthScore[]> {
        return this.healthRepository
            .createQueryBuilder('health')
            .leftJoinAndSelect('health.contact', 'contact')
            .where('health.tenantId = :tenantId', { tenantId })
            .andWhere('health.codRiskScore < :maxScore', { maxScore })
            .andWhere('health.codOrdersTotal > 0')
            .orderBy('health.codRiskScore', 'ASC')
            .take(100)
            .getMany();
    }

    /**
     * Bulk recalculate health scores (scheduled job)
     */
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async recalculateAllHealthScores(): Promise<void> {
        this.logger.log('Starting daily health score recalculation...');

        // Get all active tenants from contacts
        const contacts = await this.contactRepository
            .createQueryBuilder('contact')
            .select('DISTINCT contact.tenantId')
            .getRawMany();

        for (const { tenantId } of contacts) {
            const tenantContacts = await this.contactRepository.find({
                where: { tenantId },
                select: ['id'],
            });

            for (const contact of tenantContacts) {
                try {
                    await this.calculateHealthScore(tenantId, contact.id);
                } catch (error: any) {
                    this.logger.error(`Error calculating health for ${contact.id}: ${error.message}`);
                }
            }
        }

        this.logger.log('Health score recalculation complete');
    }
}
