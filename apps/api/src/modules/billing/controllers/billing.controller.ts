import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { PlansService } from '../services/plans.service';
import { SubscriptionsService, CreateSubscriptionDto } from '../services/subscriptions.service';
import { UsageService } from '../services/usage.service';
import { StripeService } from '../services/stripe.service';
import { InvoicesService } from '../services/invoices.service';
import { PlanTier } from '../entities/plan.entity';

@Controller('billing')
export class BillingController {
    constructor(
        private readonly plansService: PlansService,
        private readonly subscriptionsService: SubscriptionsService,
        private readonly usageService: UsageService,
        private readonly stripeService: StripeService,
        private readonly invoicesService: InvoicesService,
    ) { }

    // Plans endpoints
    @Get('plans')
    async getPlans() {
        return this.plansService.findAll();
    }

    @Get('plans/:tier')
    async getPlan(@Param('tier') tier: PlanTier) {
        return this.plansService.findByTier(tier);
    }

    // Subscription endpoints
    @Post('subscriptions')
    async createSubscription(@Body() dto: CreateSubscriptionDto) {
        return this.subscriptionsService.create(dto);
    }

    @Get('subscriptions/:tenantId')
    async getSubscription(@Param('tenantId') tenantId: string) {
        return this.subscriptionsService.findByTenantId(tenantId);
    }

    // Also support query param for subscription lookup
    @Get('subscription')
    async getSubscriptionByQuery(@Query('tenantId') tenantId: string) {
        if (!tenantId) {
            return { error: 'tenantId is required' };
        }
        return this.subscriptionsService.findByTenantId(tenantId);
    }

    @Put('subscriptions/:tenantId/upgrade')
    async upgradeSubscription(
        @Param('tenantId') tenantId: string,
        @Body('planTier') planTier: PlanTier,
    ) {
        return this.subscriptionsService.upgrade(tenantId, planTier);
    }

    @Post('subscriptions/:tenantId/cancel')
    async cancelSubscription(
        @Param('tenantId') tenantId: string,
        @Body('immediately') immediately?: boolean,
    ) {
        return this.subscriptionsService.cancel(tenantId, immediately);
    }

    @Post('subscriptions/:tenantId/activate')
    async activateSubscription(@Param('tenantId') tenantId: string) {
        return this.subscriptionsService.activateFromTrial(tenantId);
    }

    @Get('subscriptions/:tenantId/limits')
    async checkLimits(@Param('tenantId') tenantId: string) {
        return this.subscriptionsService.checkLimits(tenantId);
    }

    // Usage endpoints
    @Get('usage/:tenantId')
    async getUsage(
        @Param('tenantId') tenantId: string,
        @Query('period') period?: string,
    ) {
        return this.usageService.getUsageForPeriod(tenantId, period);
    }

    // Also support query param for usage lookup
    @Get('usage')
    async getUsageByQuery(
        @Query('tenantId') tenantId: string,
        @Query('period') period?: string,
    ) {
        if (!tenantId) {
            return { error: 'tenantId is required' };
        }
        return this.usageService.getUsageForPeriod(tenantId, period);
    }

    @Get('usage/:tenantId/total')
    async getTotalUsage(@Param('tenantId') tenantId: string) {
        return this.usageService.getTotalUsage(tenantId);
    }

    @Get('usage/:tenantId/history')
    async getUsageHistory(
        @Param('tenantId') tenantId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.usageService.getUsageHistory(
            tenantId,
            new Date(startDate),
            new Date(endDate),
        );
    }

    // Stripe Checkout endpoints
    @Post('checkout')
    async createCheckoutSession(
        @Body() body: {
            tenantId: string;
            planTier: string;
            billingCycle: 'monthly' | 'yearly';
            successUrl: string;
            cancelUrl: string;
        },
    ) {
        try {
            const { tenantId, planTier, billingCycle, successUrl, cancelUrl } = body;

            // Get or create Stripe customer
            let subscription = await this.subscriptionsService.findByTenantId(tenantId);
            let customerId = subscription?.stripeCustomerId;

            if (!customerId) {
                // Create a new Stripe customer
                const customer = await this.stripeService.createCustomer({
                    email: `tenant-${tenantId}@app.com`,
                    metadata: { tenantId },
                });
                customerId = customer.id;
            }

            // Get the price ID for the selected plan
            const priceId = this.stripeService.getPriceId(planTier as PlanTier, billingCycle);

            if (!priceId) {
                return {
                    error: 'Price not configured for this plan',
                    message: `No Stripe price ID found for ${planTier} (${billingCycle}). Please configure STRIPE_PRICE_${planTier.toUpperCase()}_${billingCycle.toUpperCase()} in your environment.`
                };
            }

            // Create Stripe checkout session
            const session = await this.stripeService.createCheckoutSession({
                tenantId,
                priceId,
                successUrl,
                cancelUrl,
                customerEmail: customerId,
            });

            return {
                checkoutUrl: session.url,
                sessionId: session.id,
            };
        } catch (error) {
            const err = error as Error;
            console.error('Checkout error:', err);
            return {
                error: 'Failed to create checkout session',
                message: err.message,
            };
        }
    }

    @Post('portal')
    async createPortalSession(
        @Body() body: { tenantId: string; returnUrl: string },
    ) {
        try {
            const { tenantId, returnUrl } = body;

            const subscription = await this.subscriptionsService.findByTenantId(tenantId);

            if (!subscription?.stripeCustomerId) {
                return {
                    error: 'No subscription found',
                    message: 'You need an active subscription to access the billing portal.',
                };
            }

            const session = await this.stripeService.createPortalSession({
                customerId: subscription.stripeCustomerId,
                returnUrl,
            });

            return {
                portalUrl: session.url,
            };
        } catch (error) {
            const err = error as Error;
            console.error('Portal error:', err);
            return {
                error: 'Failed to create portal session',
                message: err.message,
            };
        }
    }

    // Invoices endpoints
    @Get('invoices')
    async getInvoices(@Query('tenantId') tenantId: string) {
        if (!tenantId) {
            return [];
        }
        return this.invoicesService.findByTenantId(tenantId);
    }

    @Get('invoices/:id')
    async getInvoice(@Param('id') id: string) {
        return this.invoicesService.findById(id);
    }
}
