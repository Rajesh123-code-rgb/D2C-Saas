import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationPolicy, DEFAULT_AUTOMATION_POLICY, PlanAutomationLimits } from '../entities/automation-policy.entity';
import { AutomationRule, TriggerType, ActionType, ActionConfig } from '../../automations/automation-rule.entity';
import { Tenant, SubscriptionTier } from '../../tenants/tenant.entity';

@Injectable()
export class AutomationGovernanceService {
    private readonly logger = new Logger(AutomationGovernanceService.name);

    constructor(
        @InjectRepository(AutomationPolicy)
        private policyRepo: Repository<AutomationPolicy>,
        @InjectRepository(Tenant)
        private tenantRepo: Repository<Tenant>,
        @InjectRepository(AutomationRule)
        private automationRepo: Repository<AutomationRule>,
    ) { }

    async getPolicy(): Promise<AutomationPolicy> {
        let policy = await this.policyRepo.findOne({ where: { name: 'default' } });
        if (!policy) {
            // Create default if not exists
            policy = this.policyRepo.create(DEFAULT_AUTOMATION_POLICY);
            await this.policyRepo.save(policy);
        }
        return policy;
    }

    async updatePolicy(data: Partial<AutomationPolicy>): Promise<AutomationPolicy> {
        const policy = await this.getPolicy();
        Object.assign(policy, data);
        return this.policyRepo.save(policy);
    }

    private getPlanKey(tier: SubscriptionTier): string {
        if (tier === SubscriptionTier.PROFESSIONAL) return 'pro';
        return tier.toString();
    }

    async validateAutomation(tenantId: string, automation: Partial<AutomationRule>): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];
        const policy = await this.getPolicy();

        // 1. Check Global Kill Switch
        if (policy.globalKillSwitch) {
            throw new ForbiddenException('Automation creation is temporarily disabled due to platform maintenance.');
        }

        // 2. Check Global Enabled
        if (!policy.globalEnabled) {
            throw new ForbiddenException('Automations are currently disabled.');
        }

        // 3. Get Tenant and Plan
        const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
        if (!tenant) throw new BadRequestException('Tenant not found');

        const planKey = this.getPlanKey(tenant.subscriptionTier);
        const limits = policy.planLimits[planKey] || policy.planLimits['free'];

        // 4. Check Allowed Trigger
        if (automation.triggerType) {
            const allowedTriggers = policy.allowedTriggers[planKey] || [];
            if (!allowedTriggers.includes(automation.triggerType)) {
                errors.push(`Trigger '${automation.triggerType}' is not allowed on your ${tenant.subscriptionTier} plan.`);
            }
        }

        // 5. Check Max Automations Limit
        if (limits.maxAutomations !== -1) {
            const currentCount = await this.automationRepo.count({
                where: { tenantId, status: 'active' as any } // Verify enum usage
            });
            // If creating active or activating existing
            if (
                (automation.status === 'active' as any) &&
                (!automation.id || (automation.id && await this.isActivating(automation.id)))
            ) {
                if (currentCount >= limits.maxAutomations) {
                    errors.push(`You have reached the limit of ${limits.maxAutomations} active automations for your plan.`);
                }
            }
        }

        // 6. Validate Actions and Complexity
        if (automation.actions) {
            const allowedActions = policy.allowedActions[planKey] || [];
            let stepCount = 0;
            let hasDelay = false;
            let hasCondition = false;
            let hasWebhook = false;

            const checkActions = (actions: ActionConfig[]) => {
                for (const action of actions) {
                    stepCount++;

                    // Check allowed action type
                    if (!allowedActions.includes(action.type)) {
                        errors.push(`Action '${action.type}' is not allowed on your plan.`);
                    }

                    // Check features
                    if (action.type === ActionType.WAIT) hasDelay = true;
                    if (action.type === ActionType.CONDITION) hasCondition = true;
                    if (action.type === ActionType.WEBHOOK) hasWebhook = true;

                    // Recursion for nested actions
                    if (action.thenActions) checkActions(action.thenActions);
                    if (action.elseActions) checkActions(action.elseActions);
                }
            };

            checkActions(automation.actions);

            // Check Step Limit
            if (stepCount > limits.maxStepsPerAutomation) {
                errors.push(`Automation exceeds maximum of ${limits.maxStepsPerAutomation} steps.`);
            }

            // Check Block Settings
            if (hasCondition) {
                const setting = policy.blockSettings.conditionalBranching;
                if (!setting.enabled) errors.push('Conditional branching is temporarily disabled.');
                if (!setting.allowedPlans.includes(planKey)) errors.push('Conditional branching is not available on your plan.');
            }

            if (hasDelay) {
                const setting = policy.blockSettings.delaySteps;
                if (!setting.enabled) errors.push('Delay steps are temporarily disabled.');
                if (!setting.allowedPlans.includes(planKey)) errors.push('Delay steps are not available on your plan.');
            }

            if (hasWebhook) {
                const setting = policy.blockSettings.webhookCalls;
                if (!setting.enabled) errors.push('Webhook calls are temporarily disabled.');
                if (!setting.allowedPlans.includes(planKey)) errors.push('Webhook calls are not available on your plan.');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Helper to check if we are changing status from paused/draft to active
    private async isActivating(automationId: string): Promise<boolean> {
        const existing = await this.automationRepo.findOne({ where: { id: automationId } });
        if (!existing) return true; // New?
        return existing.status !== 'active' as any;
    }

    async checkExecutionLimit(tenantId: string): Promise<boolean> {
        // This would require Redis or a counter table for accurate tracking.
        // For now, we will perform a count query on recent logs if AutomationLog entity exists.
        // Assuming we check this before running an automation.

        const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
        if (!tenant) return false;

        const policy = await this.getPolicy();
        const planKey = this.getPlanKey(tenant.subscriptionTier);
        const limits = policy.planLimits[planKey];

        if (limits.maxExecutionsPerDay === -1) return true;

        // Note: Real implementation would check execution logs count for today
        // const count = await this.automationLogRepo.count(...)

        return true;
    }
}
