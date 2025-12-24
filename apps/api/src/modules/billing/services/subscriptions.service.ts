import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus, BillingCycle } from '../entities/subscription.entity';
import { PlansService } from './plans.service';
import { PlanTier } from '../entities/plan.entity';

export interface CreateSubscriptionDto {
    tenantId: string;
    planTier: PlanTier;
    billingCycle?: BillingCycle;
    trialDays?: number;
}

export interface UpdateSubscriptionDto {
    planTier?: PlanTier;
    billingCycle?: BillingCycle;
    status?: SubscriptionStatus;
}

@Injectable()
export class SubscriptionsService {
    constructor(
        @InjectRepository(Subscription)
        private readonly subscriptionRepository: Repository<Subscription>,
        private readonly plansService: PlansService,
    ) { }

    async create(dto: CreateSubscriptionDto): Promise<Subscription> {
        const plan = await this.plansService.findByTier(dto.planTier);
        if (!plan) {
            throw new NotFoundException(`Plan ${dto.planTier} not found`);
        }

        // Check if tenant already has a subscription
        const existingSubscription = await this.findByTenantId(dto.tenantId);
        if (existingSubscription) {
            throw new BadRequestException('Tenant already has an active subscription');
        }

        const now = new Date();
        const trialDays = dto.trialDays || 14;
        const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

        const subscription = this.subscriptionRepository.create({
            tenantId: dto.tenantId,
            planId: plan.id,
            billingCycle: dto.billingCycle || BillingCycle.MONTHLY,
            status: SubscriptionStatus.TRIALING,
            currentPeriodStart: now,
            currentPeriodEnd: trialEndsAt,
            trialEndsAt,
        });

        return this.subscriptionRepository.save(subscription);
    }

    async findByTenantId(tenantId: string): Promise<Subscription | null> {
        return this.subscriptionRepository.findOne({
            where: { tenantId },
            relations: ['plan'],
        });
    }

    async findById(id: string): Promise<Subscription | null> {
        return this.subscriptionRepository.findOne({
            where: { id },
            relations: ['plan'],
        });
    }

    async upgrade(tenantId: string, newPlanTier: PlanTier): Promise<Subscription> {
        const subscription = await this.findByTenantId(tenantId);
        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        const newPlan = await this.plansService.findByTier(newPlanTier);
        if (!newPlan) {
            throw new NotFoundException(`Plan ${newPlanTier} not found`);
        }

        subscription.planId = newPlan.id;
        subscription.status = SubscriptionStatus.ACTIVE;

        return this.subscriptionRepository.save(subscription);
    }

    async cancel(tenantId: string, immediately = false): Promise<Subscription> {
        const subscription = await this.findByTenantId(tenantId);
        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        if (immediately) {
            subscription.status = SubscriptionStatus.CANCELLED;
            subscription.cancelledAt = new Date();
        } else {
            subscription.cancelAtPeriodEnd = true;
        }

        return this.subscriptionRepository.save(subscription);
    }

    async activateFromTrial(tenantId: string): Promise<Subscription> {
        const subscription = await this.findByTenantId(tenantId);
        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        const now = new Date();
        const periodEnd = new Date(now);

        if (subscription.billingCycle === BillingCycle.MONTHLY) {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }

        subscription.status = SubscriptionStatus.ACTIVE;
        subscription.currentPeriodStart = now;
        subscription.currentPeriodEnd = periodEnd;
        subscription.trialEndsAt = null as any;

        return this.subscriptionRepository.save(subscription);
    }

    async updateStripeInfo(
        tenantId: string,
        stripeCustomerId: string,
        stripeSubscriptionId: string,
    ): Promise<Subscription> {
        const subscription = await this.findByTenantId(tenantId);
        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        subscription.stripeCustomerId = stripeCustomerId;
        subscription.stripeSubscriptionId = stripeSubscriptionId;

        return this.subscriptionRepository.save(subscription);
    }

    async checkLimits(tenantId: string): Promise<{
        contacts: { current: number; limit: number; exceeded: boolean };
        messages: { current: number; limit: number; exceeded: boolean };
        automations: { current: number; limit: number; exceeded: boolean };
        campaigns: { current: number; limit: number; exceeded: boolean };
    }> {
        const subscription = await this.findByTenantId(tenantId);
        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        const plan = await this.plansService.findById(subscription.planId);
        if (!plan) {
            throw new NotFoundException('Plan not found');
        }

        // TODO: Implement actual usage counting from database
        // For now, return mock data
        return {
            contacts: { current: 0, limit: plan.features.maxContacts, exceeded: false },
            messages: { current: 0, limit: plan.features.maxMessagesPerMonth, exceeded: false },
            automations: { current: 0, limit: plan.features.maxAutomations, exceeded: false },
            campaigns: { current: 0, limit: plan.features.maxCampaignsPerMonth, exceeded: false },
        };
    }
}
