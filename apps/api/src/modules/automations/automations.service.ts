import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
    AutomationRule,
    AutomationStatus,
    TriggerType,
    ActionConfig,
    ConditionConfig,
    ConditionOperator,
} from './automation-rule.entity';
import { AutomationLog, ExecutionStatus, ExecutedAction } from './automation-log.entity';

export interface CreateAutomationDto {
    name: string;
    description?: string;
    triggerType: TriggerType;
    triggerConfig: any;
    conditions?: ConditionConfig[];
    actions: ActionConfig[];
    delayConfig?: any;
}

@Injectable()
export class AutomationsService {
    private readonly logger = new Logger(AutomationsService.name);

    constructor(
        @InjectRepository(AutomationRule)
        private readonly ruleRepository: Repository<AutomationRule>,
        @InjectRepository(AutomationLog)
        private readonly logRepository: Repository<AutomationLog>,
        @InjectQueue('automations')
        private readonly automationQueue: Queue,
    ) { }

    async create(tenantId: string, dto: CreateAutomationDto): Promise<AutomationRule> {
        const rule = this.ruleRepository.create({
            tenantId,
            name: dto.name,
            description: dto.description,
            triggerType: dto.triggerType,
            triggerConfig: { type: dto.triggerType, ...dto.triggerConfig },
            conditions: dto.conditions || [],
            actions: dto.actions,
            delayConfig: dto.delayConfig,
            status: AutomationStatus.DRAFT,
        });

        await this.ruleRepository.save(rule);
        this.logger.log(`Automation created: ${rule.name}`);

        return rule;
    }

    async findAll(
        tenantId: string,
        options: { status?: AutomationStatus; triggerType?: TriggerType } = {},
    ): Promise<AutomationRule[]> {
        const where: any = { tenantId };
        if (options.status) where.status = options.status;
        if (options.triggerType) where.triggerType = options.triggerType;

        return this.ruleRepository.find({
            where,
            order: { priority: 'DESC', createdAt: 'DESC' },
        });
    }

    async findById(tenantId: string, id: string): Promise<AutomationRule> {
        const rule = await this.ruleRepository.findOne({
            where: { id, tenantId },
        });

        if (!rule) {
            throw new NotFoundException('Automation not found');
        }

        return rule;
    }

    async update(
        tenantId: string,
        id: string,
        updates: Partial<CreateAutomationDto>,
    ): Promise<AutomationRule> {
        const rule = await this.findById(tenantId, id);
        Object.assign(rule, updates);
        await this.ruleRepository.save(rule);
        return rule;
    }

    async activate(tenantId: string, id: string): Promise<AutomationRule> {
        const rule = await this.findById(tenantId, id);
        rule.status = AutomationStatus.ACTIVE;
        await this.ruleRepository.save(rule);
        this.logger.log(`Automation activated: ${rule.name}`);
        return rule;
    }

    async pause(tenantId: string, id: string): Promise<AutomationRule> {
        const rule = await this.findById(tenantId, id);
        rule.status = AutomationStatus.PAUSED;
        await this.ruleRepository.save(rule);
        this.logger.log(`Automation paused: ${rule.name}`);
        return rule;
    }

    async delete(tenantId: string, id: string): Promise<void> {
        const rule = await this.findById(tenantId, id);
        await this.ruleRepository.remove(rule);
    }

    /**
     * Trigger automations based on an event
     */
    async triggerByEvent(
        tenantId: string,
        eventType: TriggerType,
        contactId: string | null,
        eventData: Record<string, any>,
    ): Promise<void> {
        // Find matching active automations
        const automations = await this.ruleRepository.find({
            where: {
                tenantId,
                triggerType: eventType,
                status: AutomationStatus.ACTIVE,
            },
            order: { priority: 'DESC' },
        });

        if (automations.length === 0) {
            this.logger.debug(`No automations for event: ${eventType}`);
            return;
        }

        this.logger.log(`Found ${automations.length} automations for ${eventType}`);

        for (const automation of automations) {
            // Check conditions
            const conditionsMet = this.evaluateConditions(automation.conditions, eventData);

            if (!conditionsMet) {
                this.logger.debug(`Conditions not met for automation: ${automation.name}`);
                continue;
            }

            // Create execution log
            const log = this.logRepository.create({
                tenantId,
                automationId: automation.id,
                contactId,
                triggerEvent: {
                    type: eventType,
                    source: 'ecommerce',
                    data: eventData,
                },
                status: ExecutionStatus.PENDING,
            });

            await this.logRepository.save(log);

            // Queue for execution
            const delay = this.calculateDelay(automation.delayConfig);

            await this.automationQueue.add(
                'execute-automation',
                {
                    logId: log.id,
                    automationId: automation.id,
                    tenantId,
                    contactId,
                    eventData,
                },
                {
                    delay,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 1000 },
                },
            );

            this.logger.log(`Queued automation: ${automation.name} with ${delay}ms delay`);
        }
    }

    /**
     * Evaluate conditions against event data
     */
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
                case ConditionOperator.NOT_CONTAINS:
                    return !String(fieldValue).includes(condition.value);
                case ConditionOperator.GREATER_THAN:
                    return Number(fieldValue) > Number(condition.value);
                case ConditionOperator.LESS_THAN:
                    return Number(fieldValue) < Number(condition.value);
                case ConditionOperator.IS_SET:
                    return fieldValue !== null && fieldValue !== undefined;
                case ConditionOperator.IS_NOT_SET:
                    return fieldValue === null || fieldValue === undefined;
                case ConditionOperator.IN_LIST:
                    return Array.isArray(condition.value) && condition.value.includes(fieldValue);
                default:
                    return true;
            }
        });
    }

    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Calculate delay in milliseconds from delay config
     */
    private calculateDelay(delayConfig: any): number {
        if (!delayConfig || delayConfig.type === 'immediate') {
            return 0;
        }

        if (delayConfig.type === 'delay' && delayConfig.delaySeconds) {
            return delayConfig.delaySeconds * 1000;
        }

        return 0;
    }

    /**
     * Get automation stats
     */
    async getStats(tenantId: string): Promise<{
        total: number;
        active: number;
        paused: number;
        totalRuns: number;
        successRate: number;
    }> {
        const automations = await this.ruleRepository.find({ where: { tenantId } });

        const total = automations.length;
        const active = automations.filter((a) => a.status === AutomationStatus.ACTIVE).length;
        const paused = automations.filter((a) => a.status === AutomationStatus.PAUSED).length;
        const totalRuns = automations.reduce((sum, a) => sum + a.runCount, 0);
        const totalSuccess = automations.reduce((sum, a) => sum + a.successCount, 0);

        return {
            total,
            active,
            paused,
            totalRuns,
            successRate: totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0,
        };
    }

    /**
     * Get execution logs for an automation
     */
    async getLogs(
        tenantId: string,
        automationId: string,
        options: { page?: number; limit?: number } = {},
    ): Promise<{ logs: AutomationLog[]; total: number }> {
        const { page = 1, limit = 20 } = options;

        const [logs, total] = await this.logRepository.findAndCount({
            where: { tenantId, automationId },
            relations: ['contact'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { logs, total };
    }
}
