import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../../contacts/contact.entity';
import { EcommerceOrder } from '../../ecommerce/entities/order.entity';
import { AbandonedCart, CartRecoveryStatus } from '../../ecommerce/entities/cart.entity';
import { CustomerHealthScore } from '../../ecommerce/entities/customer-health.entity';
import { PredictiveScoringService } from './predictive-scoring.service';

export interface NextBestAction {
    actionType: string;
    actionName: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    reason: string;
    suggestedContent?: string;
    suggestedChannel: 'whatsapp' | 'email' | 'sms' | 'call';
    expectedOutcome: string;
    confidence: number;
    metadata?: Record<string, any>;
}

@Injectable()
export class NextBestActionService {
    private readonly logger = new Logger(NextBestActionService.name);

    constructor(
        @InjectRepository(Contact)
        private readonly contactRepository: Repository<Contact>,
        @InjectRepository(EcommerceOrder)
        private readonly orderRepository: Repository<EcommerceOrder>,
        @InjectRepository(AbandonedCart)
        private readonly cartRepository: Repository<AbandonedCart>,
        @InjectRepository(CustomerHealthScore)
        private readonly healthRepository: Repository<CustomerHealthScore>,
        private readonly scoringService: PredictiveScoringService,
    ) { }

    /**
     * Get recommended actions for a contact
     */
    async getNextBestActions(
        tenantId: string,
        contactId: string,
        limit: number = 5,
    ): Promise<NextBestAction[]> {
        const actions: NextBestAction[] = [];

        // Get contact data
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, tenantId },
        });

        if (!contact) {
            throw new Error('Contact not found');
        }

        // Get health score if available
        const healthScore = await this.healthRepository.findOne({
            where: { tenantId, contactId },
        });

        // Get orders
        const orders = await this.orderRepository.find({
            where: { tenantId, contactId },
            order: { createdAt: 'DESC' },
            take: 5,
        });

        // Get abandoned carts
        const abandonedCarts = await this.cartRepository.find({
            where: { tenantId, contactId, recoveryStatus: CartRecoveryStatus.PENDING },
        });

        // Action 1: Abandoned Cart Recovery
        if (abandonedCarts.length > 0) {
            const cart = abandonedCarts[0];
            actions.push({
                actionType: 'abandoned_cart_recovery',
                actionName: 'Recover Abandoned Cart',
                priority: 'critical',
                reason: `Customer has ₹${cart.total} worth of items in cart`,
                suggestedContent: `Hi ${contact.name}! Your cart is waiting 🛒 Complete your order now and get free shipping!`,
                suggestedChannel: 'whatsapp',
                expectedOutcome: '15-25% recovery rate',
                confidence: 0.85,
                metadata: { cartId: cart.id, cartValue: cart.total },
            });
        }

        // Action 2: Win-back for churning customers
        if (healthScore?.winBackEligible) {
            const discount = healthScore.winBackTier === '120_day' ? '20%' :
                healthScore.winBackTier === '90_day' ? '15%' : '10%';
            actions.push({
                actionType: 'win_back_campaign',
                actionName: 'Win-Back Campaign',
                priority: healthScore.winBackTier === '120_day' ? 'critical' : 'high',
                reason: `Customer inactive for ${healthScore.daysSinceLastOrder} days (${healthScore.winBackTier?.replace('_', ' ')})`,
                suggestedContent: `We miss you, ${contact.name}! 💝 Here's ${discount} off your next order. Use code COMEBACK${discount.replace('%', '')}`,
                suggestedChannel: 'whatsapp',
                expectedOutcome: `${healthScore.winBackTier === '30_day' ? '12%' : '8%'} reactivation rate`,
                confidence: 0.75,
                metadata: { tier: healthScore.winBackTier, daysSince: healthScore.daysSinceLastOrder },
            });
        }

        // Action 3: Upsell for recent purchasers
        if (orders.length > 0) {
            const lastOrder = orders[0];
            const daysSince = Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            if (daysSince >= 3 && daysSince <= 14) {
                actions.push({
                    actionType: 'post_purchase_upsell',
                    actionName: 'Post-Purchase Upsell',
                    priority: 'medium',
                    reason: `Customer ordered ${daysSince} days ago - perfect timing for related products`,
                    suggestedContent: `Hi ${contact.name}! Hope you're loving your recent purchase 🌟 Check out these items that go perfectly with it!`,
                    suggestedChannel: 'whatsapp',
                    expectedOutcome: '5-8% conversion rate',
                    confidence: 0.7,
                    metadata: { orderId: lastOrder.id, orderValue: lastOrder.total },
                });
            }
        }

        // Action 4: Request review
        if (orders.length > 0) {
            const deliveredOrders = orders.filter(o => o.status === 'delivered');
            if (deliveredOrders.length > 0) {
                const recentDelivered = deliveredOrders[0];
                const daysSinceDelivery = recentDelivered.deliveredAt
                    ? Math.floor((Date.now() - new Date(recentDelivered.deliveredAt).getTime()) / (1000 * 60 * 60 * 24))
                    : 999;

                if (daysSinceDelivery >= 3 && daysSinceDelivery <= 10) {
                    actions.push({
                        actionType: 'review_request',
                        actionName: 'Request Product Review',
                        priority: 'low',
                        reason: `Order delivered ${daysSinceDelivery} days ago - ideal time for feedback`,
                        suggestedContent: `Hi ${contact.name}! How's your recent purchase? We'd love to hear your feedback! ⭐`,
                        suggestedChannel: 'whatsapp',
                        expectedOutcome: '20-30% response rate',
                        confidence: 0.8,
                        metadata: { orderId: recentDelivered.id },
                    });
                }
            }
        }

        // Action 5: Complete profile
        if (!contact.email || !contact.name) {
            actions.push({
                actionType: 'profile_completion',
                actionName: 'Complete Customer Profile',
                priority: 'low',
                reason: 'Missing profile information limits personalization',
                suggestedContent: `Hi! We'd love to know you better. Can you share your ${!contact.email ? 'email' : 'name'} for exclusive offers?`,
                suggestedChannel: 'whatsapp',
                expectedOutcome: 'Better segmentation and targeting',
                confidence: 0.9,
                metadata: { missingFields: [!contact.email && 'email', !contact.name && 'name'].filter(Boolean) },
            });
        }

        // Action 6: VIP recognition
        if (healthScore && healthScore.healthScore >= 80) {
            actions.push({
                actionType: 'vip_recognition',
                actionName: 'VIP Customer Recognition',
                priority: 'medium',
                reason: `High-value customer with health score ${healthScore.healthScore}`,
                suggestedContent: `${contact.name}, you're one of our VIP customers! 🌟 Here's exclusive early access to our new collection!`,
                suggestedChannel: 'whatsapp',
                expectedOutcome: 'Increased loyalty and retention',
                confidence: 0.85,
                metadata: { healthScore: healthScore.healthScore, totalSpent: healthScore.totalSpent },
            });
        }

        // Action 7: Reorder reminder
        if (orders.length >= 2) {
            const avgGap = healthScore?.averageOrderGapDays || 30;
            const daysSinceLastOrder = healthScore?.daysSinceLastOrder || 0;

            if (daysSinceLastOrder >= avgGap * 0.8 && daysSinceLastOrder <= avgGap * 1.2) {
                actions.push({
                    actionType: 'reorder_reminder',
                    actionName: 'Reorder Reminder',
                    priority: 'high',
                    reason: `Based on purchase pattern, customer may need to reorder soon`,
                    suggestedContent: `Hi ${contact.name}! Time for a refill? 🔄 Reorder your favorites with one click!`,
                    suggestedChannel: 'whatsapp',
                    expectedOutcome: '25-35% reorder rate',
                    confidence: 0.75,
                    metadata: { avgGap, daysSince: daysSinceLastOrder },
                });
            }
        }

        // Sort by priority and return top actions
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return actions.slice(0, limit);
    }

    /**
     * Get bulk next-best-actions for multiple contacts
     */
    async getBulkActions(
        tenantId: string,
        options: { segment?: string; limit?: number } = {},
    ): Promise<Map<string, NextBestAction[]>> {
        const contacts = await this.contactRepository.find({
            where: { tenantId },
            take: options.limit || 100,
        });

        const results = new Map<string, NextBestAction[]>();

        for (const contact of contacts) {
            try {
                const actions = await this.getNextBestActions(tenantId, contact.id, 3);
                if (actions.length > 0) {
                    results.set(contact.id, actions);
                }
            } catch (error: any) {
                this.logger.error(`Error getting NBA for ${contact.id}: ${error.message}`);
            }
        }

        return results;
    }

    /**
     * Execute an action
     */
    async executeAction(
        tenantId: string,
        contactId: string,
        action: NextBestAction,
    ): Promise<{ success: boolean; messageId?: string }> {
        // This would integrate with the message sending services
        this.logger.log(`Executing action ${action.actionType} for contact ${contactId}`);

        // In production, this would:
        // 1. Create automation rule or campaign
        // 2. Send message via appropriate channel
        // 3. Track execution

        return { success: true };
    }
}
