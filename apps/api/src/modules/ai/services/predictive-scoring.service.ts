import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIPrediction } from '../entities/ai.entity';
import { Contact } from '../../contacts/contact.entity';
import { EcommerceOrder } from '../../ecommerce/entities/order.entity';
import { Message, MessageDirection } from '../../inbox/message.entity';

export interface PredictiveScore {
    score: number;
    confidence: number;
    factors: Array<{
        factor: string;
        impact: 'positive' | 'negative';
        weight: number;
        value: any;
    }>;
    recommendations: Array<{
        action: string;
        priority: 'high' | 'medium' | 'low';
        expectedImpact: string;
    }>;
}

@Injectable()
export class PredictiveScoringService {
    private readonly logger = new Logger(PredictiveScoringService.name);

    constructor(
        @InjectRepository(AIPrediction)
        private readonly predictionRepository: Repository<AIPrediction>,
        @InjectRepository(Contact)
        private readonly contactRepository: Repository<Contact>,
        @InjectRepository(EcommerceOrder)
        private readonly orderRepository: Repository<EcommerceOrder>,
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
    ) { }

    /**
     * Calculate lead score (0-100)
     */
    async calculateLeadScore(tenantId: string, contactId: string): Promise<PredictiveScore> {
        const contact = await this.contactRepository.findOne({ where: { id: contactId } });
        if (!contact) throw new Error('Contact not found');

        const factors: PredictiveScore['factors'] = [];
        let totalScore = 0;
        let weightSum = 0;

        // Factor 1: Profile completeness (weight: 15)
        const profileWeight = 15;
        const hasEmail = !!contact.email;
        const hasPhone = !!contact.phone;
        const hasName = !!contact.name;
        const profileScore = ((hasEmail ? 40 : 0) + (hasPhone ? 40 : 0) + (hasName ? 20 : 0));
        totalScore += profileScore * (profileWeight / 100);
        weightSum += profileWeight;
        factors.push({
            factor: 'Profile Completeness',
            impact: profileScore >= 60 ? 'positive' : 'negative',
            weight: profileWeight,
            value: `${profileScore}%`,
        });

        // Factor 2: Engagement (weight: 25)
        const engagementWeight = 25;
        const messageCount = await this.messageRepository.count({
            where: { conversationId: contactId, direction: MessageDirection.INBOUND } as any,
        });
        const engagementScore = Math.min(messageCount * 10, 100);
        totalScore += engagementScore * (engagementWeight / 100);
        weightSum += engagementWeight;
        factors.push({
            factor: 'Message Engagement',
            impact: engagementScore >= 50 ? 'positive' : 'negative',
            weight: engagementWeight,
            value: `${messageCount} messages`,
        });

        // Factor 3: Order history (weight: 35)
        const orderWeight = 35;
        const orders = await this.orderRepository.find({
            where: { contactId, tenantId },
        });
        const orderScore = Math.min(orders.length * 25, 100);
        totalScore += orderScore * (orderWeight / 100);
        weightSum += orderWeight;
        factors.push({
            factor: 'Order History',
            impact: orders.length > 0 ? 'positive' : 'negative',
            weight: orderWeight,
            value: `${orders.length} orders`,
        });

        // Factor 4: Recency (weight: 25)
        const recencyWeight = 25;
        const lastOrder = orders[0];
        let recencyScore = 50;
        if (lastOrder) {
            const daysSince = Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            recencyScore = daysSince <= 30 ? 100 : daysSince <= 60 ? 75 : daysSince <= 90 ? 50 : 25;
        }
        totalScore += recencyScore * (recencyWeight / 100);
        weightSum += recencyWeight;
        factors.push({
            factor: 'Purchase Recency',
            impact: recencyScore >= 50 ? 'positive' : 'negative',
            weight: recencyWeight,
            value: lastOrder ? `${Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago` : 'No orders',
        });

        const finalScore = Math.round(totalScore);
        const confidence = Math.min((messageCount + orders.length * 5) / 30, 1);

        // Generate recommendations
        const recommendations = this.generateLeadRecommendations(finalScore, factors);

        // Save prediction
        await this.savePrediction(tenantId, contactId, 'lead_score', finalScore, confidence, factors, recommendations);

        return { score: finalScore, confidence, factors, recommendations };
    }

    /**
     * Calculate churn risk (0-100, higher = more likely to churn)
     */
    async calculateChurnRisk(tenantId: string, contactId: string): Promise<PredictiveScore> {
        const factors: PredictiveScore['factors'] = [];
        let riskScore = 0;

        // Get order history
        const orders = await this.orderRepository.find({
            where: { contactId, tenantId },
            order: { createdAt: 'DESC' },
        });

        // Factor 1: Days since last order
        if (orders.length > 0) {
            const daysSince = Math.floor((Date.now() - new Date(orders[0].createdAt).getTime()) / (1000 * 60 * 60 * 24));
            const recencyRisk = daysSince > 90 ? 80 : daysSince > 60 ? 60 : daysSince > 30 ? 30 : 10;
            riskScore += recencyRisk * 0.35;
            factors.push({
                factor: 'Inactivity Period',
                impact: recencyRisk >= 50 ? 'negative' : 'positive',
                weight: 35,
                value: `${daysSince} days`,
            });
        } else {
            factors.push({
                factor: 'No Purchase History',
                impact: 'negative',
                weight: 35,
                value: 'Never purchased',
            });
            riskScore += 50 * 0.35;
        }

        // Factor 2: Order frequency decline
        if (orders.length >= 3) {
            const recentGap = orders.length >= 2
                ? (new Date(orders[0].createdAt).getTime() - new Date(orders[1].createdAt).getTime()) / (1000 * 60 * 60 * 24)
                : 30;
            const oldGap = orders.length >= 3
                ? (new Date(orders[1].createdAt).getTime() - new Date(orders[2].createdAt).getTime()) / (1000 * 60 * 60 * 24)
                : 30;

            const frequencyDecline = recentGap > oldGap * 1.5;
            const declineRisk = frequencyDecline ? 70 : 20;
            riskScore += declineRisk * 0.25;
            factors.push({
                factor: 'Frequency Pattern',
                impact: frequencyDecline ? 'negative' : 'positive',
                weight: 25,
                value: frequencyDecline ? 'Declining' : 'Stable',
            });
        }

        // Factor 3: Recent engagement
        const recentMessages = await this.messageRepository.count({
            where: {
                conversationId: contactId,
                direction: MessageDirection.INBOUND,
            } as any,
        });
        const engagementRisk = recentMessages === 0 ? 60 : recentMessages < 3 ? 40 : 15;
        riskScore += engagementRisk * 0.20;
        factors.push({
            factor: 'Engagement Level',
            impact: engagementRisk >= 40 ? 'negative' : 'positive',
            weight: 20,
            value: `${recentMessages} messages`,
        });

        // Factor 4: Order value trend
        if (orders.length >= 2) {
            const recentAOV = Number(orders[0].total);
            const avgAOV = orders.reduce((sum, o) => sum + Number(o.total), 0) / orders.length;
            const aovDecline = recentAOV < avgAOV * 0.7;
            const aovRisk = aovDecline ? 50 : 15;
            riskScore += aovRisk * 0.20;
            factors.push({
                factor: 'Order Value Trend',
                impact: aovDecline ? 'negative' : 'positive',
                weight: 20,
                value: aovDecline ? 'Decreasing' : 'Stable/Growing',
            });
        }

        const finalScore = Math.min(Math.round(riskScore), 100);
        const confidence = Math.min(orders.length / 5, 1);
        const recommendations = this.generateChurnRecommendations(finalScore, factors);

        await this.savePrediction(tenantId, contactId, 'churn_risk', finalScore, confidence, factors, recommendations);

        return { score: finalScore, confidence, factors, recommendations };
    }

    /**
     * Detect purchase intent (0-100)
     */
    async detectPurchaseIntent(tenantId: string, contactId: string): Promise<PredictiveScore> {
        const factors: PredictiveScore['factors'] = [];
        let intentScore = 0;

        // Factor 1: Recent cart activity
        // Factor 2: Message content sentiment
        // Factor 3: Browse behavior
        // Factor 4: Time since last order

        const orders = await this.orderRepository.find({
            where: { contactId, tenantId },
            order: { createdAt: 'DESC' },
            take: 1,
        });

        if (orders.length > 0) {
            const daysSince = Math.floor((Date.now() - new Date(orders[0].createdAt).getTime()) / (1000 * 60 * 60 * 24));
            // Reorder patterns suggest intent
            const reorderIntent = daysSince >= 25 && daysSince <= 45 ? 70 : daysSince < 25 ? 30 : 20;
            intentScore += reorderIntent * 0.4;
            factors.push({
                factor: 'Reorder Pattern',
                impact: reorderIntent >= 50 ? 'positive' : 'negative',
                weight: 40,
                value: `${daysSince} days since last order`,
            });
        }

        // Recent inquiries
        const recentMessages = await this.messageRepository.count({
            where: { conversationId: contactId, direction: MessageDirection.INBOUND } as any,
        });
        const inquiryIntent = recentMessages >= 3 ? 80 : recentMessages >= 1 ? 50 : 20;
        intentScore += inquiryIntent * 0.35;
        factors.push({
            factor: 'Recent Inquiries',
            impact: inquiryIntent >= 50 ? 'positive' : 'negative',
            weight: 35,
            value: `${recentMessages} recent messages`,
        });

        const finalScore = Math.round(intentScore);
        const confidence = 0.6; // Intent detection has inherent uncertainty
        const recommendations = this.generateIntentRecommendations(finalScore, factors);

        await this.savePrediction(tenantId, contactId, 'purchase_intent', finalScore, confidence, factors, recommendations);

        return { score: finalScore, confidence, factors, recommendations };
    }

    private generateLeadRecommendations(score: number, factors: any[]): PredictiveScore['recommendations'] {
        const recommendations: PredictiveScore['recommendations'] = [];

        if (score >= 70) {
            recommendations.push({
                action: 'Send exclusive offer',
                priority: 'high',
                expectedImpact: 'High conversion probability',
            });
        } else if (score >= 40) {
            recommendations.push({
                action: 'Nurture with educational content',
                priority: 'medium',
                expectedImpact: 'Build trust and engagement',
            });
        } else {
            recommendations.push({
                action: 'Request profile completion',
                priority: 'low',
                expectedImpact: 'Better personalization',
            });
        }

        return recommendations;
    }

    private generateChurnRecommendations(risk: number, factors: any[]): PredictiveScore['recommendations'] {
        const recommendations: PredictiveScore['recommendations'] = [];

        if (risk >= 70) {
            recommendations.push({
                action: 'Immediate win-back campaign',
                priority: 'high',
                expectedImpact: 'Prevent churn',
            });
            recommendations.push({
                action: 'Personal outreach from support',
                priority: 'high',
                expectedImpact: 'Re-engage customer',
            });
        } else if (risk >= 40) {
            recommendations.push({
                action: 'Send retention offer',
                priority: 'medium',
                expectedImpact: 'Incentivize return',
            });
        }

        return recommendations;
    }

    private generateIntentRecommendations(intent: number, factors: any[]): PredictiveScore['recommendations'] {
        const recommendations: PredictiveScore['recommendations'] = [];

        if (intent >= 60) {
            recommendations.push({
                action: 'Send personalized product recommendations',
                priority: 'high',
                expectedImpact: 'High conversion opportunity',
            });
            recommendations.push({
                action: 'Offer limited-time discount',
                priority: 'medium',
                expectedImpact: 'Accelerate purchase decision',
            });
        }

        return recommendations;
    }

    private async savePrediction(
        tenantId: string,
        contactId: string,
        type: string,
        score: number,
        confidence: number,
        factors: any[],
        recommendations: any[],
    ): Promise<void> {
        await this.predictionRepository.save({
            tenantId,
            contactId,
            predictionType: type as any,
            score,
            confidence,
            factors,
            recommendations,
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
        });
    }
}
