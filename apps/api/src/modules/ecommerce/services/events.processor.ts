import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EcommerceEvent, EcommerceEventType } from '../entities/event.entity';
import { EventsService } from './events.service';
import { AutomationsService } from '../../automations/automations.service';
import { TriggerType } from '../../automations/automation-rule.entity';

// Map e-commerce events to automation triggers
const eventToTriggerMap: Record<EcommerceEventType, TriggerType> = {
    [EcommerceEventType.ORDER_CREATED]: TriggerType.ORDER_CREATED,
    [EcommerceEventType.ORDER_CONFIRMED]: TriggerType.ORDER_CONFIRMED,
    [EcommerceEventType.ORDER_PROCESSING]: TriggerType.ORDER_CREATED, // No specific trigger
    [EcommerceEventType.ORDER_SHIPPED]: TriggerType.ORDER_SHIPPED,
    [EcommerceEventType.ORDER_OUT_FOR_DELIVERY]: TriggerType.ORDER_SHIPPED,
    [EcommerceEventType.ORDER_DELIVERED]: TriggerType.ORDER_DELIVERED,
    [EcommerceEventType.ORDER_CANCELLED]: TriggerType.ORDER_CANCELLED,
    [EcommerceEventType.ORDER_REFUNDED]: TriggerType.ORDER_CANCELLED,
    [EcommerceEventType.ORDER_RETURNED]: TriggerType.ORDER_CANCELLED,
    [EcommerceEventType.PAYMENT_SUCCESS]: TriggerType.PAYMENT_SUCCESS,
    [EcommerceEventType.PAYMENT_FAILED]: TriggerType.PAYMENT_FAILED,
    [EcommerceEventType.PAYMENT_REFUNDED]: TriggerType.ORDER_CANCELLED,
    [EcommerceEventType.COD_CONFIRMED]: TriggerType.COD_ORDER_CREATED,
    [EcommerceEventType.COD_REJECTED]: TriggerType.ORDER_CANCELLED,
    [EcommerceEventType.CART_CREATED]: TriggerType.CART_ABANDONED,
    [EcommerceEventType.CART_UPDATED]: TriggerType.CART_ABANDONED,
    [EcommerceEventType.CART_ABANDONED]: TriggerType.CART_ABANDONED,
    [EcommerceEventType.CART_RECOVERED]: TriggerType.CART_RECOVERED,
    [EcommerceEventType.CUSTOMER_CREATED]: TriggerType.CONTACT_CREATED,
    [EcommerceEventType.CUSTOMER_UPDATED]: TriggerType.CONTACT_CREATED,
    [EcommerceEventType.FIRST_ORDER]: TriggerType.FIRST_ORDER,
    [EcommerceEventType.REPEAT_ORDER]: TriggerType.REPEAT_ORDER,
    [EcommerceEventType.HIGH_VALUE_ORDER]: TriggerType.HIGH_VALUE_ORDER,
    [EcommerceEventType.PRODUCT_VIEWED]: TriggerType.CONTACT_CREATED,
    [EcommerceEventType.PRODUCT_ADDED_TO_CART]: TriggerType.CART_ABANDONED,
    [EcommerceEventType.PRODUCT_BACK_IN_STOCK]: TriggerType.CONTACT_CREATED,
};

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    retryDelays: [1000, 5000, 30000], // Exponential backoff: 1s, 5s, 30s
    retryableErrors: [
        'ECONNREFUSED',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'timeout',
        'socket hang up',
    ],
};

@Injectable()
@Processor('ecommerce-events')
export class EcommerceEventsProcessor extends WorkerHost {
    private readonly logger = new Logger(EcommerceEventsProcessor.name);

    constructor(
        @InjectRepository(EcommerceEvent)
        private readonly eventRepository: Repository<EcommerceEvent>,
        private readonly eventsService: EventsService,
        private readonly automationsService: AutomationsService,
    ) {
        super();
    }

    async process(job: Job<{ eventId: string; tenantId: string; eventType: string }>): Promise<void> {
        const { eventId, tenantId, eventType } = job.data;
        const attemptNumber = job.attemptsMade + 1;
        const startTime = Date.now();

        // Structured log context
        const logContext = {
            jobId: job.id,
            eventId,
            tenantId,
            eventType,
            attempt: attemptNumber,
        };

        this.logger.log({
            message: `Processing event (attempt ${attemptNumber})`,
            ...logContext,
        });

        try {
            await this.processEventWithRetry(job, logContext);

            const duration = Date.now() - startTime;
            this.logger.log({
                message: 'Event processed successfully',
                ...logContext,
                durationMs: duration,
            });
        } catch (error: any) {
            const duration = Date.now() - startTime;
            const isRetryable = this.isRetryableError(error);
            const hasRetriesLeft = attemptNumber < RETRY_CONFIG.maxRetries;

            this.logger.error({
                message: `Event processing failed`,
                ...logContext,
                error: error.message,
                stack: error.stack,
                durationMs: duration,
                isRetryable,
                willRetry: isRetryable && hasRetriesLeft,
            });

            // Mark as failed in database
            await this.eventsService.markFailed(eventId, error.message);

            // Only throw for retryable errors if retries remain
            if (isRetryable && hasRetriesLeft) {
                throw error; // BullMQ will retry
            }

            // For non-retryable errors or max retries reached, don't retry
            this.logger.error({
                message: 'Event permanently failed',
                ...logContext,
                reason: hasRetriesLeft ? 'Non-retryable error' : 'Max retries exceeded',
            });
        }
    }

    private async processEventWithRetry(
        job: Job<{ eventId: string; tenantId: string; eventType: string }>,
        logContext: Record<string, any>,
    ): Promise<void> {
        const { eventId, tenantId } = job.data;

        // Get the full event
        const event = await this.eventsService.findById(eventId);

        if (!event) {
            this.logger.warn({
                message: 'Event not found',
                ...logContext,
            });
            return;
        }

        if (event.processed) {
            this.logger.debug({
                message: 'Event already processed (skipping)',
                ...logContext,
            });
            return;
        }

        // Map to automation trigger type
        const triggerType = eventToTriggerMap[event.eventType as EcommerceEventType];

        if (!triggerType) {
            this.logger.warn({
                message: 'No trigger mapping for event type',
                ...logContext,
                eventType: event.eventType,
            });
            await this.eventsService.markProcessed(eventId);
            return;
        }

        // Build event data for automation
        const eventData = {
            ...event.payload,
            eventType: event.eventType,
            referenceId: event.referenceId,
            referenceType: event.referenceType,
            storeId: event.storeId,
            createdAt: event.createdAt,
        };

        this.logger.debug({
            message: 'Triggering automation',
            ...logContext,
            triggerType,
            contactId: event.contactId,
        });

        // Trigger matching automations
        await this.automationsService.triggerByEvent(
            tenantId,
            triggerType,
            event.contactId,
            eventData,
        );

        // Mark event as processed
        await this.eventsService.markProcessed(eventId);
    }

    /**
     * Check if an error is retryable based on error message/code
     */
    private isRetryableError(error: any): boolean {
        const errorMessage = error.message || '';
        const errorCode = error.code || '';

        return RETRY_CONFIG.retryableErrors.some(
            (retryable) =>
                errorMessage.toLowerCase().includes(retryable.toLowerCase()) ||
                errorCode === retryable,
        );
    }
}
