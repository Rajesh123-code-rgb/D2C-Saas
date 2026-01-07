import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import {
    AutomationRule,
    ActionConfig,
    ActionType,
    ConditionConfig,
    ConditionOperator,
} from './automation-rule.entity';
import { AutomationLog, ExecutionStatus, ExecutedAction } from './automation-log.entity';
import { Contact } from '../contacts/contact.entity';
import { WhatsAppService } from '../channels/whatsapp/whatsapp.service';
import { ContactsService } from '../contacts/contacts.service';
import { EmailService } from '../channels/email/email.service';
import { ChannelsService } from '../channels/channels.service';
import { ChannelType } from '../channels/channel.entity';

interface ExecuteAutomationJob {
    logId: string;
    automationId: string;
    tenantId: string;
    contactId: string | null;
    eventData: Record<string, any>;
}

@Injectable()
@Processor('automations')
export class AutomationsProcessor extends WorkerHost {
    private readonly logger = new Logger(AutomationsProcessor.name);

    constructor(
        @InjectRepository(AutomationRule)
        private readonly ruleRepository: Repository<AutomationRule>,
        @InjectRepository(AutomationLog)
        private readonly logRepository: Repository<AutomationLog>,
        @InjectRepository(Contact)
        private readonly contactRepository: Repository<Contact>,
        @InjectQueue('automations')
        private readonly automationQueue: Queue,
        private readonly whatsappService: WhatsAppService,
        private readonly emailService: EmailService,
        private readonly contactsService: ContactsService,
        private readonly channelsService: ChannelsService,
    ) {
        super();
    }

    async process(job: Job<ExecuteAutomationJob>): Promise<any> {
        const { logId, automationId, tenantId, contactId, eventData } = job.data;

        this.logger.log(`Processing automation ${automationId} for log ${logId}`);

        // Get the automation log
        const log = await this.logRepository.findOne({
            where: { id: logId },
            relations: ['automation', 'contact'],
        });

        if (!log) {
            this.logger.error(`Automation log ${logId} not found`);
            return { success: false, error: 'Log not found' };
        }

        // Get the automation rule
        const automation = await this.ruleRepository.findOne({
            where: { id: automationId },
        });

        if (!automation) {
            log.status = ExecutionStatus.FAILED;
            log.errorMessage = 'Automation not found';
            await this.logRepository.save(log);
            return { success: false, error: 'Automation not found' };
        }

        // Get contact if available
        let contact: Contact | null = null;
        if (contactId) {
            contact = await this.contactRepository.findOne({
                where: { id: contactId },
            });
        }

        // Update log status to running
        log.status = ExecutionStatus.RUNNING;
        log.startedAt = new Date();
        await this.logRepository.save(log);

        try {
            // Execute all actions in sequence
            const actionsExecuted: ExecutedAction[] = [];

            for (let i = 0; i < automation.actions.length; i++) {
                const action = automation.actions[i];
                log.currentActionIndex = i;
                await this.logRepository.save(log);

                const result = await this.executeAction(
                    action,
                    tenantId,
                    contact,
                    eventData,
                    log,
                );

                actionsExecuted.push({
                    actionIndex: i,
                    actionType: action.type,
                    status: result.success ? 'success' : 'failed',
                    result: result.data,
                    error: result.error,
                    executedAt: new Date(),
                });

                // If action failed, stop execution
                if (!result.success && result.error) {
                    log.status = ExecutionStatus.FAILED;
                    log.errorMessage = result.error;
                    break;
                }

                // Handle wait action - reschedule remaining actions
                if (result.shouldWait && result.waitMs) {
                    log.status = ExecutionStatus.WAITING;
                    log.nextExecutionAt = new Date(Date.now() + result.waitMs);
                    log.actionsExecuted = actionsExecuted;
                    await this.logRepository.save(log);

                    // Queue continuation job
                    await this.automationQueue.add(
                        'continue-automation',
                        {
                            logId,
                            automationId,
                            tenantId,
                            contactId,
                            eventData,
                            startFromIndex: i + 1,
                        },
                        { delay: result.waitMs },
                    );

                    return { success: true, waiting: true };
                }
            }

            // Update log with final status
            log.actionsExecuted = actionsExecuted;
            log.completedAt = new Date();
            log.executionTimeMs = log.completedAt.getTime() - log.startedAt.getTime();

            if (log.status !== ExecutionStatus.FAILED) {
                log.status = ExecutionStatus.COMPLETED;
            }

            await this.logRepository.save(log);

            // Update automation stats
            automation.runCount += 1;
            if (log.status === ExecutionStatus.COMPLETED) {
                automation.successCount += 1;
            } else {
                automation.failureCount += 1;
            }
            automation.lastRunAt = new Date();
            await this.ruleRepository.save(automation);

            this.logger.log(
                `Automation ${automation.name} completed with status: ${log.status}`,
            );

            return { success: log.status === ExecutionStatus.COMPLETED };
        } catch (error) {
            const err = error as Error;
            log.status = ExecutionStatus.FAILED;
            log.errorMessage = err.message;
            log.completedAt = new Date();
            await this.logRepository.save(log);

            automation.runCount += 1;
            automation.failureCount += 1;
            await this.ruleRepository.save(automation);

            throw error;
        }
    }

    private async executeAction(
        action: ActionConfig,
        tenantId: string,
        contact: Contact | null,
        eventData: Record<string, any>,
        log: AutomationLog,
    ): Promise<{
        success: boolean;
        data?: any;
        error?: string;
        shouldWait?: boolean;
        waitMs?: number;
    }> {
        try {
            switch (action.type) {
                case ActionType.SEND_WHATSAPP_TEMPLATE:
                    return await this.executeSendWhatsAppTemplate(action, tenantId, contact, eventData);

                case ActionType.SEND_WHATSAPP_MESSAGE:
                    return await this.executeSendWhatsAppMessage(action, tenantId, contact, eventData);

                case ActionType.SEND_EMAIL:
                    return await this.executeSendEmail(action, tenantId, contact, eventData);

                case ActionType.ADD_TAG:
                    return await this.executeAddTag(action, tenantId, contact);

                case ActionType.REMOVE_TAG:
                    return await this.executeRemoveTag(action, tenantId, contact);

                case ActionType.UPDATE_CONTACT:
                    return await this.executeUpdateContact(action, tenantId, contact);

                case ActionType.UPDATE_LIFECYCLE:
                    return await this.executeUpdateLifecycle(action, tenantId, contact);

                case ActionType.WAIT:
                    return this.executeWait(action);

                case ActionType.CONDITION:
                    return await this.executeCondition(action, tenantId, contact, eventData, log);

                case ActionType.WEBHOOK:
                    return await this.executeWebhook(action, eventData, contact);

                default:
                    this.logger.warn(`Unknown action type: ${action.type}`);
                    return { success: true, data: { skipped: true, reason: 'Unknown action type' } };
            }
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Action ${action.type} failed: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    private async executeSendWhatsAppTemplate(
        action: ActionConfig,
        tenantId: string,
        contact: Contact | null,
        eventData: Record<string, any>,
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!contact?.phone) {
            return { success: false, error: 'Contact has no phone number' };
        }

        try {
            // Find WhatsApp channel
            const channels = await this.channelsService.findAll(tenantId);
            const channel = channels.find(c => c.channelType === ChannelType.WHATSAPP);

            if (!channel) {
                return { success: false, error: 'No WhatsApp channel connected' };
            }

            const result = await this.whatsappService.sendTemplateMessage(
                channel.id,
                contact.phone,
                action.templateId || '',
                'en',
                this.buildTemplateComponents(action, contact, eventData),
            );

            return { success: true, data: result };
        } catch (error) {
            const err = error as Error;
            return { success: false, error: err.message };
        }
    }

    private async executeSendWhatsAppMessage(
        action: ActionConfig,
        tenantId: string,
        contact: Contact | null,
        eventData: Record<string, any>,
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!contact?.phone) {
            return { success: false, error: 'Contact has no phone number' };
        }

        const message = this.interpolateMessage(action.message || '', contact, eventData);

        try {
            // Find WhatsApp channel
            const channels = await this.channelsService.findAll(tenantId);
            const channel = channels.find(c => c.channelType === ChannelType.WHATSAPP);

            if (!channel) {
                return { success: false, error: 'No WhatsApp channel connected' };
            }

            const result = await this.whatsappService.sendTextMessage(
                channel.id,
                contact.phone,
                message,
            );

            return { success: true, data: result };
        } catch (error) {
            const err = error as Error;
            return { success: false, error: err.message };
        }
    }

    private async executeSendEmail(
        action: ActionConfig,
        tenantId: string,
        contact: Contact | null,
        eventData: Record<string, any>,
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!contact?.email) {
            return { success: false, error: 'Contact has no email address' };
        }

        try {
            // Get default channel for tenant
            // Since we don't have direct access to channel repo, we'll try to use a pragmatic approach
            // Use a specific channelId if provided in action, or find one via emailService helper

            // Find Email channel
            const channels = await this.channelsService.findAll(tenantId);
            const channel = channels.find(c => c.channelType === ChannelType.EMAIL);

            if (!channel) {
                return { success: false, error: 'No Email channel connected' };
            }

            if (action.templateId) {
                // Derive first/last name
                const nameParts = (contact.name || '').split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                // Use template-based sending
                const variables: Record<string, string> = {
                    name: contact.name || '',
                    firstName,
                    lastName,
                    email: contact.email || '',
                    phone: contact.phone || '',
                    companyName: 'OmniChannel',
                    ...eventData,
                };

                // Flatten contact object for variables
                if (contact.metadata) {
                    Object.entries(contact.metadata).forEach(([key, value]) => {
                        if (typeof value === 'string') variables[key] = value;
                    });
                }

                const result = await this.emailService.sendTemplateEmail(
                    channel.id,
                    contact.email,
                    action.templateId,
                    variables
                );
                return { success: true, data: result };
            }

            // Fallback to custom message sending
            const result = await this.emailService.sendEmail(
                channel.id,
                {
                    to: contact.email,
                    subject: action.subject || 'Notification',
                    text: this.interpolateMessage(action.message || '', contact, eventData),
                    html: this.interpolateMessage(action.message || '', contact, eventData),
                }
            );

            return { success: true, data: result };
        } catch (error) {
            const err = error as Error;
            return { success: false, error: err.message };
        }
    }

    private async executeAddTag(
        action: ActionConfig,
        tenantId: string,
        contact: Contact | null,
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!contact) {
            return { success: false, error: 'No contact for tag operation' };
        }

        try {
            const tagName = action.tagName || action.value;
            if (!tagName) {
                return { success: false, error: 'No tag name specified' };
            }

            // Add tag to contact
            const currentTags = contact.tags || [];
            if (!currentTags.includes(tagName)) {
                contact.tags = [...currentTags, tagName];
                await this.contactRepository.save(contact);
            }

            return { success: true, data: { tagAdded: tagName } };
        } catch (error) {
            const err = error as Error;
            return { success: false, error: err.message };
        }
    }

    private async executeRemoveTag(
        action: ActionConfig,
        tenantId: string,
        contact: Contact | null,
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!contact) {
            return { success: false, error: 'No contact for tag operation' };
        }

        try {
            const tagName = action.tagName || action.value;
            if (!tagName) {
                return { success: false, error: 'No tag name specified' };
            }

            contact.tags = (contact.tags || []).filter((t) => t !== tagName);
            await this.contactRepository.save(contact);

            return { success: true, data: { tagRemoved: tagName } };
        } catch (error) {
            const err = error as Error;
            return { success: false, error: err.message };
        }
    }

    private async executeUpdateContact(
        action: ActionConfig,
        tenantId: string,
        contact: Contact | null,
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!contact) {
            return { success: false, error: 'No contact to update' };
        }

        try {
            const fieldName = action.fieldName || action.field;
            const fieldValue = action.fieldValue || action.value;

            if (!fieldName) {
                return { success: false, error: 'No field name specified' };
            }

            // Update the field (handle custom fields)
            if (fieldName.startsWith('customFields.')) {
                const attrKey = fieldName.replace('customFields.', '');
                contact.customFields = {
                    ...(contact.customFields || {}),
                    [attrKey]: fieldValue,
                };
            } else {
                (contact as any)[fieldName] = fieldValue;
            }

            await this.contactRepository.save(contact);

            return { success: true, data: { field: fieldName, value: fieldValue } };
        } catch (error) {
            const err = error as Error;
            return { success: false, error: err.message };
        }
    }

    private async executeUpdateLifecycle(
        action: ActionConfig,
        tenantId: string,
        contact: Contact | null,
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!contact) {
            return { success: false, error: 'No contact to update' };
        }

        try {
            const newLifecycle = action.newLifecycle || action.value;
            if (!newLifecycle) {
                return { success: false, error: 'No lifecycle stage specified' };
            }

            contact.lifecycleStage = newLifecycle;
            await this.contactRepository.save(contact);

            return { success: true, data: { lifecycle: newLifecycle } };
        } catch (error) {
            const err = error as Error;
            return { success: false, error: err.message };
        }
    }

    private executeWait(action: ActionConfig): {
        success: boolean;
        shouldWait: boolean;
        waitMs: number;
    } {
        let waitMs = (action.waitDuration || 0) * 1000; // Default to seconds

        // Convert based on unit
        switch (action.waitUnit) {
            case 'minutes':
                waitMs = (action.waitDuration || 0) * 60 * 1000;
                break;
            case 'hours':
                waitMs = (action.waitDuration || 0) * 60 * 60 * 1000;
                break;
            case 'days':
                waitMs = (action.waitDuration || 0) * 24 * 60 * 60 * 1000;
                break;
        }

        return { success: true, shouldWait: true, waitMs };
    }

    private async executeCondition(
        action: ActionConfig,
        tenantId: string,
        contact: Contact | null,
        eventData: Record<string, any>,
        log: AutomationLog,
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        const conditions = action.conditions || [];
        const conditionMet = this.evaluateConditions(conditions, {
            ...eventData,
            contact: contact || {},
        });

        const branchActions = conditionMet
            ? action.thenActions || []
            : action.elseActions || [];

        // Execute branch actions
        for (const branchAction of branchActions) {
            const result = await this.executeAction(
                branchAction,
                tenantId,
                contact,
                eventData,
                log,
            );

            if (!result.success) {
                return result;
            }
        }

        return {
            success: true,
            data: {
                conditionMet,
                branch: conditionMet ? 'then' : 'else',
                actionsExecuted: branchActions.length,
            },
        };
    }

    private evaluateConditions(
        conditions: ConditionConfig[],
        data: Record<string, any>,
    ): boolean {
        if (!conditions || conditions.length === 0) {
            return true;
        }

        return conditions.every((condition) => {
            const fieldValue = this.getNestedValue(data, condition.field);

            switch (condition.operator) {
                case ConditionOperator.EQUALS:
                    return fieldValue === condition.value;
                case ConditionOperator.NOT_EQUALS:
                    return fieldValue !== condition.value;
                case ConditionOperator.CONTAINS:
                    return String(fieldValue).includes(condition.value);
                case ConditionOperator.GREATER_THAN:
                    return Number(fieldValue) > Number(condition.value);
                case ConditionOperator.LESS_THAN:
                    return Number(fieldValue) < Number(condition.value);
                case ConditionOperator.IS_SET:
                    return fieldValue !== null && fieldValue !== undefined;
                case ConditionOperator.IS_NOT_SET:
                    return fieldValue === null || fieldValue === undefined;
                default:
                    return true;
            }
        });
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    private async executeWebhook(
        action: ActionConfig,
        eventData: Record<string, any>,
        contact: Contact | null,
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!action.webhookUrl) {
            return { success: false, error: 'No webhook URL specified' };
        }

        try {
            const response = await fetch(action.webhookUrl, {
                method: action.webhookMethod || 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(action.webhookHeaders || {}),
                },
                body: JSON.stringify({
                    event: eventData,
                    contact: contact ? {
                        id: contact.id,
                        name: contact.name,
                        email: contact.email,
                        phone: contact.phone,
                    } : null,
                    timestamp: new Date().toISOString(),
                }),
            });

            return {
                success: response.ok,
                data: { status: response.status },
                error: !response.ok ? `HTTP ${response.status}` : undefined,
            };
        } catch (error) {
            const err = error as Error;
            return { success: false, error: err.message };
        }
    }

    private buildTemplateComponents(
        action: ActionConfig,
        contact: Contact | null,
        eventData: Record<string, any>,
    ): any[] {
        // Build template components based on action config
        // This would map the template variables to actual values
        const components: any[] = [];

        // Add body parameters if we have contact/event data
        if (contact || eventData) {
            components.push({
                type: 'body',
                parameters: [
                    { type: 'text', text: contact?.name || 'Customer' },
                    // Add more parameters based on template requirements
                ],
            });
        }

        return components;
    }

    private interpolateMessage(
        template: string,
        contact: Contact | null,
        eventData: Record<string, any>,
    ): string {
        let message = template;

        // Replace contact placeholders
        if (contact) {
            message = message.replace(/\{\{contact\.name\}\}/g, contact.name || '');
            message = message.replace(/\{\{contact\.email\}\}/g, contact.email || '');
            message = message.replace(/\{\{contact\.phone\}\}/g, contact.phone || '');
        }

        // Replace event data placeholders
        const placeholderRegex = /\{\{(\w+(?:\.\w+)*)\}\}/g;
        message = message.replace(placeholderRegex, (match, path) => {
            const value = this.getNestedValue(eventData, path);
            return value !== undefined ? String(value) : match;
        });

        return message;
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        this.logger.error(
            `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
        );

        // Update log with retry info
        this.updateLogOnFailure(job.data.logId, error.message, job.attemptsMade);
    }

    private async updateLogOnFailure(
        logId: string,
        errorMessage: string,
        attemptsMade: number,
    ): Promise<void> {
        try {
            const log = await this.logRepository.findOne({ where: { id: logId } });
            if (log) {
                log.retryCount = attemptsMade;
                log.errorMessage = errorMessage;
                if (attemptsMade >= log.maxRetries) {
                    log.status = ExecutionStatus.FAILED;
                    log.completedAt = new Date();
                }
                await this.logRepository.save(log);
            }
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Failed to update log ${logId}: ${err.message}`);
        }
    }
}
