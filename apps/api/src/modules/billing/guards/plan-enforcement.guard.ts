import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from '../services/subscriptions.service';
import { UsageService } from '../services/usage.service';
import { PlansService } from '../services/plans.service';
import { PlanFeatures } from '../entities/plan.entity';
import { UsageResourceType } from '../entities/usage.entity';

// Decorator keys
export const REQUIRE_PLAN_FEATURE_KEY = 'requirePlanFeature';
export const CHECK_USAGE_LIMIT_KEY = 'checkUsageLimit';

// Decorators
export const RequirePlanFeature = (feature: keyof PlanFeatures) =>
    SetMetadata(REQUIRE_PLAN_FEATURE_KEY, feature);

export const CheckUsageLimit = (resource: UsageResourceType) =>
    SetMetadata(CHECK_USAGE_LIMIT_KEY, resource);

@Injectable()
export class PlanEnforcementGuard implements CanActivate {
    private readonly logger = new Logger(PlanEnforcementGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly subscriptionsService: SubscriptionsService,
        private readonly usageService: UsageService,
        private readonly plansService: PlansService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const tenantId = request.user?.tenantId;

        if (!tenantId) {
            this.logger.warn('No tenantId found in request');
            return true; // Let other guards handle authentication
        }

        // Check feature requirement
        const requiredFeature = this.reflector.getAllAndOverride<keyof PlanFeatures>(
            REQUIRE_PLAN_FEATURE_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (requiredFeature) {
            await this.checkFeatureAccess(tenantId, requiredFeature);
        }

        // Check usage limit
        const usageLimit = this.reflector.getAllAndOverride<UsageResourceType>(
            CHECK_USAGE_LIMIT_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (usageLimit) {
            await this.checkUsageLimit(tenantId, usageLimit);
        }

        return true;
    }

    /**
     * Check if tenant has access to a specific feature
     */
    private async checkFeatureAccess(
        tenantId: string,
        feature: keyof PlanFeatures,
    ): Promise<void> {
        const subscription = await this.subscriptionsService.findByTenantId(tenantId);

        if (!subscription) {
            throw new ForbiddenException('No active subscription found');
        }

        const plan = await this.plansService.findById(subscription.planId);
        if (!plan) {
            throw new ForbiddenException('Subscription plan not found');
        }

        const hasFeature = plan.features[feature];

        if (typeof hasFeature === 'boolean' && !hasFeature) {
            throw new ForbiddenException(
                `Your plan does not include access to this feature. Please upgrade to unlock it.`,
            );
        }
    }

    /**
     * Check if tenant has exceeded usage limit
     */
    private async checkUsageLimit(
        tenantId: string,
        resourceType: UsageResourceType,
    ): Promise<void> {
        const subscription = await this.subscriptionsService.findByTenantId(tenantId);

        if (!subscription) {
            throw new ForbiddenException('No active subscription found');
        }

        const plan = await this.plansService.findById(subscription.planId);
        if (!plan) {
            throw new ForbiddenException('Subscription plan not found');
        }

        const usage = await this.usageService.getUsageForPeriod(tenantId);
        const currentUsage = usage[resourceType] || 0;

        // Get limit from plan features
        let limit: number;
        switch (resourceType) {
            case UsageResourceType.CONTACTS:
                limit = plan.features.maxContacts;
                break;
            case UsageResourceType.MESSAGES:
                limit = plan.features.maxMessagesPerMonth;
                break;
            case UsageResourceType.CAMPAIGNS:
                limit = plan.features.maxCampaignsPerMonth;
                break;
            case UsageResourceType.AUTOMATIONS:
                limit = plan.features.maxAutomations;
                break;
            case UsageResourceType.AGENTS:
                limit = plan.features.maxAgents;
                break;
            default:
                limit = -1; // Unlimited
        }

        // -1 means unlimited
        if (limit !== -1 && currentUsage >= limit) {
            throw new ForbiddenException(
                `You have reached your ${resourceType} limit (${currentUsage}/${limit}). Please upgrade your plan.`,
            );
        }
    }
}

/**
 * Utility guard to check plan limits before incrementing usage
 */
@Injectable()
export class UsageLimitGuard implements CanActivate {
    private readonly logger = new Logger(UsageLimitGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly subscriptionsService: SubscriptionsService,
        private readonly usageService: UsageService,
        private readonly plansService: PlansService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const tenantId = request.user?.tenantId;

        if (!tenantId) {
            return true;
        }

        const resourceType = this.reflector.getAllAndOverride<UsageResourceType>(
            CHECK_USAGE_LIMIT_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!resourceType) {
            return true;
        }

        const subscription = await this.subscriptionsService.findByTenantId(tenantId);
        if (!subscription) {
            return true; // Let other guards handle
        }

        const plan = await this.plansService.findById(subscription.planId);
        if (!plan) {
            return true;
        }

        const usage = await this.usageService.getUsageForPeriod(tenantId);
        const currentUsage = usage[resourceType] || 0;

        let limit: number;
        switch (resourceType) {
            case UsageResourceType.CONTACTS:
                limit = plan.features.maxContacts;
                break;
            case UsageResourceType.MESSAGES:
                limit = plan.features.maxMessagesPerMonth;
                break;
            case UsageResourceType.CAMPAIGNS:
                limit = plan.features.maxCampaignsPerMonth;
                break;
            case UsageResourceType.AUTOMATIONS:
                limit = plan.features.maxAutomations;
                break;
            case UsageResourceType.AGENTS:
                limit = plan.features.maxAgents;
                break;
            default:
                limit = -1;
        }

        if (limit !== -1 && currentUsage >= limit) {
            throw new ForbiddenException(
                `${resourceType} limit reached. Please upgrade your plan.`,
            );
        }

        return true;
    }
}
