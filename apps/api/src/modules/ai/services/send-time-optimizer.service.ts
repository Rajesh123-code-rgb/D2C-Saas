import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SendTimeInsight } from '../entities/ai.entity';
import { Message, MessageDirection } from '../../inbox/message.entity';

interface TimeSlot {
    hour: number;
    dayOfWeek: number;
    engagementScore: number;
    messageCount: number;
}

@Injectable()
export class SendTimeOptimizerService {
    private readonly logger = new Logger(SendTimeOptimizerService.name);

    constructor(
        @InjectRepository(SendTimeInsight)
        private readonly insightRepository: Repository<SendTimeInsight>,
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
    ) { }

    /**
     * Get optimal send time for a contact
     */
    async getOptimalSendTime(tenantId: string, contactId: string): Promise<{
        optimalHour: number;
        optimalDay: number;
        confidence: number;
        dataPoints: number;
    }> {
        const insight = await this.insightRepository.findOne({
            where: { tenantId, contactId },
        });

        if (insight) {
            return {
                optimalHour: insight.optimalHour,
                optimalDay: insight.optimalDay,
                confidence: insight.confidence,
                dataPoints: insight.dataPoints,
            };
        }

        // Calculate if not exists
        return this.calculateOptimalTime(tenantId, contactId);
    }

    /**
     * Calculate optimal send time based on message engagement
     */
    async calculateOptimalTime(tenantId: string, contactId: string): Promise<{
        optimalHour: number;
        optimalDay: number;
        confidence: number;
        dataPoints: number;
    }> {
        // Get messages for analysis (last 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const messages = await this.messageRepository.find({
            where: {
                conversationId: contactId,
                direction: MessageDirection.INBOUND,
                createdAt: MoreThan(ninetyDaysAgo),
            } as any,
            order: { createdAt: 'DESC' },
        });

        if (messages.length < 3) {
            // Not enough data, return defaults
            return {
                optimalHour: 10, // 10 AM default
                optimalDay: 2, // Tuesday default
                confidence: 0.3,
                dataPoints: messages.length,
            };
        }

        // Analyze response times by hour and day
        const timeSlots: Map<string, TimeSlot> = new Map();

        for (const message of messages) {
            const date = new Date(message.createdAt);
            const hour = date.getHours();
            const dayOfWeek = date.getDay();
            const key = `${hour}-${dayOfWeek}`;

            const slot = timeSlots.get(key) || {
                hour,
                dayOfWeek,
                engagementScore: 0,
                messageCount: 0,
            };

            slot.messageCount++;
            slot.engagementScore += message.status === 'read' ? 3 : message.status === 'delivered' ? 2 : 1;

            timeSlots.set(key, slot);
        }

        // Find best slot
        let bestSlot: TimeSlot = {
            hour: 10,
            dayOfWeek: 2,
            engagementScore: 0,
            messageCount: 0,
        };

        for (const slot of timeSlots.values()) {
            const score = slot.engagementScore / Math.max(slot.messageCount, 1);
            const bestScore = bestSlot.engagementScore / Math.max(bestSlot.messageCount, 1);

            if (score > bestScore) {
                bestSlot = slot;
            }
        }

        const confidence = Math.min(messages.length / 30, 1);

        // Save insight
        await this.insightRepository.save({
            tenantId,
            contactId,
            optimalHour: bestSlot.hour,
            optimalDay: bestSlot.dayOfWeek,
            confidence,
            dataPoints: messages.length,
            hourlyEngagement: Object.fromEntries(
                [...timeSlots.entries()].map(([k, v]) => [k, v.engagementScore])
            ),
            dayOfWeekEngagement: this.aggregateDayEngagement(timeSlots),
            lastCalculatedAt: new Date(),
        });

        return {
            optimalHour: bestSlot.hour,
            optimalDay: bestSlot.dayOfWeek,
            confidence,
            dataPoints: messages.length,
        };
    }

    /**
     * Get next optimal window
     */
    async getNextOptimalWindow(tenantId: string, contactId: string): Promise<Date> {
        const { optimalHour, optimalDay } = await this.getOptimalSendTime(tenantId, contactId);

        const now = new Date();
        const result = new Date(now);

        // Set to optimal hour
        result.setHours(optimalHour, 0, 0, 0);

        // If it's past today's optimal time, move to next occurrence
        if (result <= now) {
            result.setDate(result.getDate() + 1);
        }

        // Adjust to optimal day of week
        const dayDiff = (optimalDay - result.getDay() + 7) % 7;
        if (dayDiff > 0) {
            result.setDate(result.getDate() + dayDiff);
        }

        return result;
    }

    private aggregateDayEngagement(timeSlots: Map<string, TimeSlot>): Record<number, number> {
        const dayScores: Record<number, number> = {};

        for (const slot of timeSlots.values()) {
            dayScores[slot.dayOfWeek] = (dayScores[slot.dayOfWeek] || 0) + slot.engagementScore;
        }

        return dayScores;
    }

    /**
     * Scheduled job to recalculate insights
     */
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async recalculateAllInsights(): Promise<void> {
        this.logger.log('Starting scheduled send time insight recalculation');
        // In production, would batch process all contacts
    }
}
