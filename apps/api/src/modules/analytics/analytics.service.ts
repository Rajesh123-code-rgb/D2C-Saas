import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Campaign, CampaignExecution, CampaignStatus, CampaignStats } from '../campaigns/entities/campaign.entity';
import { Conversation, ConversationStatus } from '../inbox/conversation.entity';
import { Message, MessageDirection } from '../inbox/message.entity';
import { Contact } from '../contacts/contact.entity';
import { EcommerceOrder, OrderStatus } from '../ecommerce/entities/order.entity';
import { AutomationRule, AutomationStatus } from '../automations/automation-rule.entity';
import { AutomationLog } from '../automations/automation-log.entity';
import { Channel } from '../channels/channel.entity';

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export interface DashboardMetrics {
    conversations: {
        total: number;
        open: number;
        pending: number;
        resolved: number;
        change: number;
    };
    contacts: {
        total: number;
        newThisPeriod: number;
        change: number;
    };
    messages: {
        total: number;
        inbound: number;
        outbound: number;
        change: number;
    };
    revenue: {
        total: number;
        thisMonth: number;
        lastMonth: number;
        change: number;
    };
    orders: {
        total: number;
        thisMonth: number;
        pending: number;
        completed: number;
    };
    avgResponseTime: number;
    resolutionRate: number;
}

export interface CampaignMetrics {
    totalCampaigns: number;
    activeCampaigns: number;
    completedCampaigns: number;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalReplied: number;
    totalConverted: number;
    conversionValue: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    conversionRate: number;
    campaignPerformance: Array<{
        id: string;
        name: string;
        status: string;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        replied: number;
        converted: number;
    }>;
}

export interface AutomationMetrics {
    totalAutomations: number;
    activeAutomations: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    topAutomations: Array<{
        id: string;
        name: string;
        executions: number;
        successRate: number;
    }>;
}

export interface ChannelMetrics {
    channels: Array<{
        type: string;
        name: string;
        messageCount: number;
        conversationCount: number;
        percentage: number;
    }>;
    totalMessages: number;
}

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(
        @InjectRepository(Campaign)
        private campaignRepository: Repository<Campaign>,
        @InjectRepository(CampaignExecution)
        private campaignExecutionRepository: Repository<CampaignExecution>,
        @InjectRepository(Conversation)
        private conversationRepository: Repository<Conversation>,
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
        @InjectRepository(Contact)
        private contactRepository: Repository<Contact>,
        @InjectRepository(EcommerceOrder)
        private orderRepository: Repository<EcommerceOrder>,
        @InjectRepository(AutomationRule)
        private automationRepository: Repository<AutomationRule>,
        @InjectRepository(AutomationLog)
        private automationLogRepository: Repository<AutomationLog>,
        @InjectRepository(Channel)
        private channelRepository: Repository<Channel>,
    ) { }

    async getDashboardMetrics(tenantId: string, dateRange?: DateRange): Promise<DashboardMetrics> {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Conversations
        const [totalConversations, openConversations, pendingConversations, resolvedConversations] = await Promise.all([
            this.conversationRepository.count({ where: { tenantId } }),
            this.conversationRepository.count({ where: { tenantId, status: ConversationStatus.OPEN } }),
            this.conversationRepository.count({ where: { tenantId, status: ConversationStatus.PENDING } }),
            this.conversationRepository.count({ where: { tenantId, status: ConversationStatus.RESOLVED } }),
        ]);

        const lastMonthConversations = await this.conversationRepository.count({
            where: {
                tenantId,
                createdAt: Between(startOfLastMonth, endOfLastMonth),
            },
        });

        const thisMonthConversations = await this.conversationRepository.count({
            where: {
                tenantId,
                createdAt: MoreThanOrEqual(startOfMonth),
            },
        });

        const conversationChange = lastMonthConversations > 0
            ? ((thisMonthConversations - lastMonthConversations) / lastMonthConversations) * 100
            : 0;

        // Contacts
        const totalContacts = await this.contactRepository.count({ where: { tenantId } });
        const newContacts = await this.contactRepository.count({
            where: {
                tenantId,
                createdAt: MoreThanOrEqual(startOfMonth),
            },
        });
        const lastMonthContacts = await this.contactRepository.count({
            where: {
                tenantId,
                createdAt: Between(startOfLastMonth, endOfLastMonth),
            },
        });
        const contactChange = lastMonthContacts > 0
            ? ((newContacts - lastMonthContacts) / lastMonthContacts) * 100
            : 0;

        // Messages
        const totalMessages = await this.messageRepository.count({ where: { conversationId: undefined } as any });
        const inboundMessages = await this.messageRepository.count({
            where: { direction: MessageDirection.INBOUND },
        });
        const outboundMessages = await this.messageRepository.count({
            where: { direction: MessageDirection.OUTBOUND },
        });

        // Revenue and Orders
        let totalRevenue = 0;
        let thisMonthRevenue = 0;
        let lastMonthRevenue = 0;
        let totalOrders = 0;
        let thisMonthOrders = 0;
        let pendingOrders = 0;
        let completedOrders = 0;

        try {
            const orders = await this.orderRepository.find({ where: { tenantId } });
            totalOrders = orders.length;
            totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

            const thisMonthOrdersList = orders.filter(o => o.createdAt >= startOfMonth);
            thisMonthOrders = thisMonthOrdersList.length;
            thisMonthRevenue = thisMonthOrdersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

            const lastMonthOrdersList = orders.filter(o => o.createdAt >= startOfLastMonth && o.createdAt <= endOfLastMonth);
            lastMonthRevenue = lastMonthOrdersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

            pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.PROCESSING).length;
            completedOrders = orders.filter(o => o.status === OrderStatus.DELIVERED).length;
        } catch (error) {
            this.logger.warn('Error fetching order data:', error);
        }

        const revenueChange = lastMonthRevenue > 0
            ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : 0;

        // Calculate resolution rate
        const resolutionRate = totalConversations > 0
            ? (resolvedConversations / totalConversations) * 100
            : 0;

        // Average response time (simplified)
        const avgResponseTime = 2.5;

        return {
            conversations: {
                total: totalConversations,
                open: openConversations,
                pending: pendingConversations,
                resolved: resolvedConversations,
                change: Math.round(conversationChange * 10) / 10,
            },
            contacts: {
                total: totalContacts,
                newThisPeriod: newContacts,
                change: Math.round(contactChange * 10) / 10,
            },
            messages: {
                total: totalMessages,
                inbound: inboundMessages,
                outbound: outboundMessages,
                change: 0,
            },
            revenue: {
                total: totalRevenue,
                thisMonth: thisMonthRevenue,
                lastMonth: lastMonthRevenue,
                change: Math.round(revenueChange * 10) / 10,
            },
            orders: {
                total: totalOrders,
                thisMonth: thisMonthOrders,
                pending: pendingOrders,
                completed: completedOrders,
            },
            avgResponseTime,
            resolutionRate: Math.round(resolutionRate * 10) / 10,
        };
    }

    async getCampaignMetrics(tenantId: string, dateRange?: DateRange): Promise<CampaignMetrics> {
        const campaigns = await this.campaignRepository.find({ where: { tenantId } });

        const totalCampaigns = campaigns.length;
        const activeCampaigns = campaigns.filter(c => c.status === CampaignStatus.RUNNING).length;
        const completedCampaigns = campaigns.filter(c => c.status === CampaignStatus.COMPLETED).length;

        // Aggregate stats from all campaigns
        let totalSent = 0;
        let totalDelivered = 0;
        let totalOpened = 0;
        let totalClicked = 0;
        let totalReplied = 0;
        let totalConverted = 0;
        let conversionValue = 0;

        const campaignPerformance = campaigns.map(campaign => {
            const stats = (campaign.stats || {}) as CampaignStats;
            totalSent += stats.totalSent || 0;
            totalDelivered += stats.totalDelivered || 0;
            totalOpened += stats.totalOpened || 0;
            totalClicked += stats.totalClicked || 0;
            totalReplied += stats.totalReplied || 0;
            totalConverted += stats.totalConverted || 0;
            conversionValue += stats.conversionValue || 0;

            return {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                sent: stats.totalSent || 0,
                delivered: stats.totalDelivered || 0,
                opened: stats.totalOpened || 0,
                clicked: stats.totalClicked || 0,
                replied: stats.totalReplied || 0,
                converted: stats.totalConverted || 0,
            };
        });

        return {
            totalCampaigns,
            activeCampaigns,
            completedCampaigns,
            totalSent,
            totalDelivered,
            totalOpened,
            totalClicked,
            totalReplied,
            totalConverted,
            conversionValue,
            deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
            openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
            clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
            replyRate: totalDelivered > 0 ? (totalReplied / totalDelivered) * 100 : 0,
            conversionRate: totalDelivered > 0 ? (totalConverted / totalDelivered) * 100 : 0,
            campaignPerformance: campaignPerformance.slice(0, 10),
        };
    }

    async getAutomationMetrics(tenantId: string, dateRange?: DateRange): Promise<AutomationMetrics> {
        const automations = await this.automationRepository.find({ where: { tenantId } });
        const totalAutomations = automations.length;
        const activeAutomations = automations.filter(a => a.status === AutomationStatus.ACTIVE).length;

        // Get execution stats from automation logs
        let totalExecutions = 0;
        let successfulExecutions = 0;
        let failedExecutions = 0;

        try {
            const logs = await this.automationLogRepository.find({
                where: { tenantId },
            });
            totalExecutions = logs.length;
            successfulExecutions = logs.filter(l => l.status === 'completed').length;
            failedExecutions = logs.filter(l => l.status === 'failed').length;
        } catch (error) {
            this.logger.warn('Error fetching automation logs:', error);
        }

        const successRate = totalExecutions > 0
            ? (successfulExecutions / totalExecutions) * 100
            : 0;

        // Get top automations by run count
        const topAutomations = automations
            .sort((a, b) => (b.runCount || 0) - (a.runCount || 0))
            .slice(0, 5)
            .map(automation => ({
                id: automation.id,
                name: automation.name,
                executions: automation.runCount || 0,
                successRate: automation.runCount > 0
                    ? ((automation.successCount || 0) / automation.runCount) * 100
                    : 0,
            }));

        return {
            totalAutomations,
            activeAutomations,
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            successRate: Math.round(successRate * 10) / 10,
            topAutomations,
        };
    }

    async getChannelMetrics(tenantId: string, dateRange?: DateRange): Promise<ChannelMetrics> {
        // Get message counts by channel type from conversations
        const channelStats = await Promise.all(
            ['whatsapp', 'email', 'instagram'].map(async (channelType) => {
                const conversationCount = await this.conversationRepository.count({
                    where: { tenantId, channelType: channelType as any },
                });
                // Estimate messages from conversations
                const messageCount = conversationCount * 5; // Average estimate
                return {
                    type: channelType,
                    name: channelType.charAt(0).toUpperCase() + channelType.slice(1),
                    messageCount,
                    conversationCount,
                    percentage: 0,
                };
            }),
        );

        const totalMessages = channelStats.reduce((sum, c) => sum + c.messageCount, 0);

        // Calculate percentages
        channelStats.forEach(channel => {
            channel.percentage = totalMessages > 0
                ? Math.round((channel.messageCount / totalMessages) * 100)
                : 0;
        });

        return {
            channels: channelStats,
            totalMessages,
        };
    }

    async getWeeklyMessageStats(tenantId: string): Promise<Array<{ day: string; inbound: number; outbound: number }>> {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const now = new Date();

        // Return default structure with zeros if we can't fetch real data
        const dayStats = days.map(day => ({ day, inbound: 0, outbound: 0 }));

        try {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const messages = await this.messageRepository.find({
                where: {
                    createdAt: MoreThanOrEqual(weekAgo),
                },
            });

            messages.forEach(msg => {
                const dayIndex = new Date(msg.createdAt).getDay();
                if (msg.direction === MessageDirection.INBOUND) {
                    dayStats[dayIndex].inbound++;
                } else {
                    dayStats[dayIndex].outbound++;
                }
            });
        } catch (error) {
            this.logger.warn('Error fetching weekly message stats:', error);
        }

        // Rotate to start from current day
        const todayIndex = now.getDay();
        const rotated = [
            ...dayStats.slice(todayIndex + 1),
            ...dayStats.slice(0, todayIndex + 1),
        ];

        return rotated;
    }

    async getRevenueMetrics(tenantId: string, dateRange?: DateRange): Promise<{
        daily: Array<{ date: string; revenue: number; orders: number }>;
        totalRevenue: number;
        totalOrders: number;
        averageOrderValue: number;
    }> {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let orders: EcommerceOrder[] = [];
        try {
            orders = await this.orderRepository.find({
                where: {
                    tenantId,
                    createdAt: MoreThanOrEqual(thirtyDaysAgo),
                },
            });
        } catch (error) {
            this.logger.warn('Error fetching orders:', error);
        }

        // Group by date
        const dailyMap = new Map<string, { revenue: number; orders: number }>();

        orders.forEach(order => {
            const dateKey = order.createdAt.toISOString().split('T')[0];
            const existing = dailyMap.get(dateKey) || { revenue: 0, orders: 0 };
            existing.revenue += Number(order.total) || 0;
            existing.orders++;
            dailyMap.set(dateKey, existing);
        });

        const daily = Array.from(dailyMap.entries())
            .map(([date, stats]) => ({ date, ...stats }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        return {
            daily,
            totalRevenue,
            totalOrders,
            averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        };
    }
}
