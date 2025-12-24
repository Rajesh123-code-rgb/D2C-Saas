import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface CreateCheckoutSessionDto {
    tenantId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    trialDays?: number;
}

export interface CreatePortalSessionDto {
    customerId: string;
    returnUrl: string;
}

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private stripe: Stripe;

    constructor(private readonly configService: ConfigService) {
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (secretKey) {
            this.stripe = new Stripe(secretKey);
            this.logger.log('Stripe initialized');
        } else {
            this.logger.warn('STRIPE_SECRET_KEY not configured - Stripe features disabled');
        }
    }

    /**
     * Check if Stripe is configured
     */
    isConfigured(): boolean {
        return !!this.stripe;
    }

    /**
     * Create a Stripe customer
     */
    async createCustomer(params: {
        email: string;
        name?: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Customer> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');

        const customer = await this.stripe.customers.create({
            email: params.email,
            name: params.name,
            metadata: params.metadata,
        });

        this.logger.log(`Created Stripe customer: ${customer.id}`);
        return customer;
    }

    /**
     * Get a Stripe customer by ID
     */
    async getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');
        return this.stripe.customers.retrieve(customerId);
    }

    /**
     * Update customer default payment method
     */
    async updateCustomerPaymentMethod(
        customerId: string,
        paymentMethodId: string,
    ): Promise<Stripe.Customer> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');

        // Attach payment method to customer
        await this.stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });

        // Set as default
        return this.stripe.customers.update(customerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
    }

    /**
     * Create a checkout session for subscription
     */
    async createCheckoutSession(dto: CreateCheckoutSessionDto): Promise<Stripe.Checkout.Session> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: dto.priceId,
                    quantity: 1,
                },
            ],
            success_url: dto.successUrl,
            cancel_url: dto.cancelUrl,
            metadata: {
                tenantId: dto.tenantId,
            },
        };

        if (dto.customerEmail) {
            sessionParams.customer_email = dto.customerEmail;
        }

        if (dto.trialDays && dto.trialDays > 0) {
            sessionParams.subscription_data = {
                trial_period_days: dto.trialDays,
            };
        }

        const session = await this.stripe.checkout.sessions.create(sessionParams);
        this.logger.log(`Created checkout session: ${session.id}`);

        return session;
    }

    /**
     * Create a customer portal session
     */
    async createPortalSession(dto: CreatePortalSessionDto): Promise<Stripe.BillingPortal.Session> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');

        const session = await this.stripe.billingPortal.sessions.create({
            customer: dto.customerId,
            return_url: dto.returnUrl,
        });

        return session;
    }

    /**
     * Create a subscription
     */
    async createSubscription(params: {
        customerId: string;
        priceId: string;
        trialDays?: number;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Subscription> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');

        const subscriptionParams: Stripe.SubscriptionCreateParams = {
            customer: params.customerId,
            items: [{ price: params.priceId }],
            metadata: params.metadata,
        };

        if (params.trialDays && params.trialDays > 0) {
            subscriptionParams.trial_period_days = params.trialDays;
        }

        const subscription = await this.stripe.subscriptions.create(subscriptionParams);
        this.logger.log(`Created subscription: ${subscription.id}`);

        return subscription;
    }

    /**
     * Update a subscription (upgrade/downgrade)
     */
    async updateSubscription(
        subscriptionId: string,
        newPriceId: string,
    ): Promise<Stripe.Subscription> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');

        // Get current subscription
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

        // Update to new price
        const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
            items: [
                {
                    id: subscription.items.data[0].id,
                    price: newPriceId,
                },
            ],
            proration_behavior: 'create_prorations',
        });

        this.logger.log(`Updated subscription ${subscriptionId} to price ${newPriceId}`);
        return updatedSubscription;
    }

    /**
     * Cancel a subscription
     */
    async cancelSubscription(
        subscriptionId: string,
        atPeriodEnd: boolean = true,
    ): Promise<Stripe.Subscription> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');

        let subscription: Stripe.Subscription;

        if (atPeriodEnd) {
            subscription = await this.stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true,
            });
        } else {
            subscription = await this.stripe.subscriptions.cancel(subscriptionId);
        }

        this.logger.log(`Cancelled subscription: ${subscriptionId}`);
        return subscription;
    }

    /**
     * Resume a cancelled subscription
     */
    async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');

        const subscription = await this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });

        this.logger.log(`Resumed subscription: ${subscriptionId}`);
        return subscription;
    }

    /**
     * Get subscription
     */
    async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');
        return this.stripe.subscriptions.retrieve(subscriptionId);
    }

    /**
     * List invoices for a customer
     */
    async listInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');

        const invoices = await this.stripe.invoices.list({
            customer: customerId,
            limit,
        });

        return invoices.data;
    }

    /**
     * Get a specific invoice
     */
    async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');
        return this.stripe.invoices.retrieve(invoiceId);
    }

    /**
     * List payment methods for a customer
     */
    async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');

        const paymentMethods = await this.stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });

        return paymentMethods.data;
    }

    /**
     * Construct webhook event from payload
     */
    constructWebhookEvent(
        payload: string | Buffer,
        signature: string,
        webhookSecret: string,
    ): Stripe.Event {
        if (!this.stripe) throw new BadRequestException('Stripe not configured');

        return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }

    /**
     * Get price ID for a plan tier and billing cycle
     */
    getPriceId(planTier: string, billingCycle: 'monthly' | 'yearly'): string {
        const key = `STRIPE_PRICE_${planTier.toUpperCase()}_${billingCycle.toUpperCase()}`;
        const priceId = this.configService.get<string>(key);

        if (!priceId) {
            throw new BadRequestException(`Price not configured for ${planTier} ${billingCycle}`);
        }

        return priceId;
    }
}
