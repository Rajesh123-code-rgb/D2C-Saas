import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomWebhook, WebhookEvent, WebhookLog } from '../entities/webhook.entity';
import * as crypto from 'crypto';

export interface CreateWebhookDto {
    tenantId: string;
    name: string;
    description?: string;
    targetUrl: string;
    events: WebhookEvent[];
    headers?: Record<string, string>;
    includePayload?: boolean;
    retryCount?: number;
}

export interface UpdateWebhookDto {
    name?: string;
    description?: string;
    targetUrl?: string;
    events?: WebhookEvent[];
    headers?: Record<string, string>;
    isActive?: boolean;
    includePayload?: boolean;
    retryCount?: number;
}

@Injectable()
export class WebhooksService {
    constructor(
        @InjectRepository(CustomWebhook)
        private readonly webhookRepository: Repository<CustomWebhook>,
        @InjectRepository(WebhookLog)
        private readonly logRepository: Repository<WebhookLog>,
    ) { }

    private generateSecretKey(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    async create(dto: CreateWebhookDto): Promise<CustomWebhook> {
        const webhook = this.webhookRepository.create({
            ...dto,
            secretKey: this.generateSecretKey(),
        });
        return this.webhookRepository.save(webhook);
    }

    async findByTenant(tenantId: string): Promise<CustomWebhook[]> {
        return this.webhookRepository.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    async findById(tenantId: string, id: string): Promise<CustomWebhook | null> {
        return this.webhookRepository.findOne({
            where: { id, tenantId },
        });
    }

    async findActiveByEvent(tenantId: string, event: WebhookEvent): Promise<CustomWebhook[]> {
        const webhooks = await this.webhookRepository.find({
            where: { tenantId, isActive: true },
        });

        return webhooks.filter(w => w.events.includes(event));
    }

    async update(tenantId: string, id: string, dto: UpdateWebhookDto): Promise<CustomWebhook> {
        const webhook = await this.findById(tenantId, id);
        if (!webhook) {
            throw new NotFoundException('Webhook not found');
        }

        Object.assign(webhook, dto);
        return this.webhookRepository.save(webhook);
    }

    async delete(tenantId: string, id: string): Promise<void> {
        const webhook = await this.findById(tenantId, id);
        if (!webhook) {
            throw new NotFoundException('Webhook not found');
        }

        await this.webhookRepository.remove(webhook);
    }

    async regenerateSecret(tenantId: string, id: string): Promise<CustomWebhook> {
        const webhook = await this.findById(tenantId, id);
        if (!webhook) {
            throw new NotFoundException('Webhook not found');
        }

        webhook.secretKey = this.generateSecretKey();
        return this.webhookRepository.save(webhook);
    }

    async trigger(
        webhook: CustomWebhook,
        event: WebhookEvent,
        payload: Record<string, any>,
    ): Promise<WebhookLog> {
        const startTime = Date.now();
        let statusCode = 0;
        let responseBody = '';
        let success = false;
        let error = '';

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Webhook-Event': event,
                'X-Webhook-Signature': this.generateSignature(webhook.secretKey, payload),
                ...webhook.headers,
            };

            const response = await fetch(webhook.targetUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    event,
                    timestamp: new Date().toISOString(),
                    data: webhook.includePayload ? payload : undefined,
                }),
            });

            statusCode = response.status;
            responseBody = await response.text();
            success = response.ok;

            if (!success) {
                error = `HTTP ${statusCode}: ${responseBody.substring(0, 500)}`;
            }
        } catch (err: any) {
            error = err.message || 'Unknown error';
            statusCode = 0;
        }

        const duration = Date.now() - startTime;

        // Update webhook stats
        if (success) {
            webhook.successCount++;
            webhook.lastSuccessAt = new Date();
        } else {
            webhook.failureCount++;
            webhook.lastFailureAt = new Date();
            webhook.lastError = error;
        }
        webhook.lastTriggeredAt = new Date();
        await this.webhookRepository.save(webhook);

        // Log the request
        const log = this.logRepository.create({
            webhookId: webhook.id,
            event,
            payload: webhook.includePayload ? payload : { redacted: true },
            statusCode,
            responseBody: responseBody.substring(0, 1000),
            duration,
            success,
            error,
            attemptNumber: 1,
        });

        return this.logRepository.save(log);
    }

    private generateSignature(secret: string, payload: Record<string, any>): string {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(payload));
        return hmac.digest('hex');
    }

    async getLogs(webhookId: string, limit = 50): Promise<WebhookLog[]> {
        return this.logRepository.find({
            where: { webhookId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
}
