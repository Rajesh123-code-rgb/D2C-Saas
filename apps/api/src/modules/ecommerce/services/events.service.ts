import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EcommerceEvent, EcommerceEventType } from '../entities/event.entity';

export interface EmitEventDto {
    tenantId: string;
    storeId: string;
    contactId?: string;
    eventType: EcommerceEventType;
    referenceId?: string;
    referenceType?: 'order' | 'cart' | 'product';
    payload: Record<string, any>;
}

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);

    constructor(
        @InjectRepository(EcommerceEvent)
        private readonly eventRepository: Repository<EcommerceEvent>,
        @InjectQueue('ecommerce-events')
        private readonly eventsQueue: Queue,
    ) { }

    async emitEvent(dto: EmitEventDto): Promise<EcommerceEvent> {
        const event = this.eventRepository.create({
            tenantId: dto.tenantId,
            storeId: dto.storeId,
            contactId: dto.contactId,
            eventType: dto.eventType,
            referenceId: dto.referenceId,
            referenceType: dto.referenceType,
            payload: dto.payload,
            processed: false,
        });

        await this.eventRepository.save(event);
        this.logger.log(`Event emitted: ${dto.eventType} for tenant ${dto.tenantId}`);

        // Queue for processing
        await this.eventsQueue.add('process-event', {
            eventId: event.id,
            tenantId: dto.tenantId,
            eventType: dto.eventType,
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
        });

        return event;
    }

    async markProcessed(eventId: string, automationId?: string): Promise<void> {
        await this.eventRepository.update(eventId, {
            processed: true,
            processedAt: new Date(),
            automationTriggered: !!automationId,
            automationId,
        });
    }

    async markFailed(eventId: string, error: string): Promise<void> {
        await this.eventRepository.update(eventId, {
            processed: true,
            processedAt: new Date(),
            error,
        });
    }

    async findById(eventId: string): Promise<EcommerceEvent | null> {
        return this.eventRepository.findOne({
            where: { id: eventId },
        });
    }

    async findPendingEvents(limit: number = 100): Promise<EcommerceEvent[]> {
        return this.eventRepository.find({
            where: { processed: false },
            order: { createdAt: 'ASC' },
            take: limit,
        });
    }

    async findEventsByContact(
        tenantId: string,
        contactId: string,
        options: { eventType?: EcommerceEventType; limit?: number } = {},
    ): Promise<EcommerceEvent[]> {
        const where: any = { tenantId, contactId };
        if (options.eventType) where.eventType = options.eventType;

        return this.eventRepository.find({
            where,
            order: { createdAt: 'DESC' },
            take: options.limit || 50,
        });
    }

    async getEventStats(tenantId: string, storeId?: string): Promise<Record<EcommerceEventType, number>> {
        const where: any = { tenantId };
        if (storeId) where.storeId = storeId;

        const events = await this.eventRepository.find({ where });

        const stats: Partial<Record<EcommerceEventType, number>> = {};
        for (const event of events) {
            stats[event.eventType] = (stats[event.eventType] || 0) + 1;
        }

        return stats as Record<EcommerceEventType, number>;
    }

    async cleanupOldEvents(daysOld: number = 90): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await this.eventRepository.delete({
            createdAt: LessThan(cutoffDate),
            processed: true,
        });

        return result.affected || 0;
    }
}
