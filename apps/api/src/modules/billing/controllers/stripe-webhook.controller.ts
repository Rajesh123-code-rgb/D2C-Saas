import {
    Controller,
    Post,
    Headers,
    RawBodyRequest,
    Req,
    Logger,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import Stripe from 'stripe';
import { StripeService } from '../services/stripe.service';
import { SubscriptionsService } from '../services/subscriptions.service';
import { InvoicesService } from '../services/invoices.service';
import { SubscriptionStatus, BillingCycle } from '../entities/subscription.entity';
import { InvoiceStatus } from '../entities/invoice.entity';

@ApiTags('Stripe Webhooks')
@Controller('webhooks/stripe')
export class StripeWebhookController {
    private readonly logger = new Logger(StripeWebhookController.name);
    private readonly webhookSecret: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly stripeService: StripeService,
        private readonly subscriptionsService: SubscriptionsService,
        private readonly invoicesService: InvoicesService,
    ) {
        this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiExcludeEndpoint()
    async handleWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ): Promise<{ received: boolean }> {
        if (!this.webhookSecret) {
            this.logger.warn('Stripe webhook secret not configured');
            return { received: true };
        }

        let event: Stripe.Event;

        try {
            event = this.stripeService.constructWebhookEvent(
                req.rawBody as Buffer,
                signature,
                this.webhookSecret,
            );
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Webhook signature verification failed: ${err.message}`);
            return { received: false };
        }

        this.logger.log(`Processing webhook event: ${event.type}`);

        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                    break;

                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                    break;

                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                    break;

                case 'invoice.paid':
                    await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
                    break;

                case 'invoice.payment_failed':
                    await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
                    break;

                case 'invoice.created':
                case 'invoice.finalized':
                    await this.handleInvoiceCreated(event.data.object as Stripe.Invoice);
                    break;

                default:
                    this.logger.log(`Unhandled event type: ${event.type}`);
            }
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Error processing webhook: ${err.message}`, err.stack);
        }

        return { received: true };
    }

    /**
     * Handle successful checkout session
     */
    private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
        const tenantId = session.metadata?.tenantId;
        if (!tenantId) {
            this.logger.warn('Checkout session missing tenantId in metadata');
            return;
        }

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (customerId && subscriptionId) {
            // Update subscription with Stripe IDs
            await this.subscriptionsService.updateStripeInfo(
                tenantId,
                customerId,
                subscriptionId,
            );

            this.logger.log(`Checkout completed for tenant ${tenantId}`);
        }
    }

    /**
     * Handle subscription updates
     */
    private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
        const customerId = subscription.customer as string;

        // Find tenant by Stripe customer ID
        const existingSubscription = await this.findSubscriptionByStripeId(subscription.id);
        if (!existingSubscription) {
            this.logger.warn(`Subscription not found: ${subscription.id}`);
            return;
        }

        // Map Stripe status to our status
        let status: SubscriptionStatus;
        switch (subscription.status) {
            case 'active':
                status = SubscriptionStatus.ACTIVE;
                break;
            case 'trialing':
                status = SubscriptionStatus.TRIALING;
                break;
            case 'past_due':
                status = SubscriptionStatus.PAST_DUE;
                break;
            case 'canceled':
                status = SubscriptionStatus.CANCELLED;
                break;
            case 'paused':
                status = SubscriptionStatus.PAUSED;
                break;
            default:
                status = SubscriptionStatus.ACTIVE;
        }

        // Update local subscription
        // Note: This requires extending subscriptions.service with update method
        this.logger.log(`Subscription ${subscription.id} status updated to ${status}`);
    }

    /**
     * Handle subscription deletion
     */
    private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
        const existingSubscription = await this.findSubscriptionByStripeId(subscription.id);
        if (!existingSubscription) {
            return;
        }

        // Mark subscription as cancelled
        await this.subscriptionsService.cancel(existingSubscription.tenantId, true);
        this.logger.log(`Subscription cancelled: ${subscription.id}`);
    }

    /**
     * Handle paid invoice
     */
    private async handleInvoicePaid(stripeInvoice: Stripe.Invoice): Promise<void> {
        // Get customer metadata to find tenant
        const customerId = stripeInvoice.customer as string;
        const existingSubscription = await this.findSubscriptionByStripeCustomer(customerId);

        if (!existingSubscription) {
            this.logger.warn(`No subscription found for customer ${customerId}`);
            return;
        }

        // Create or update invoice in our database
        let invoice = await this.invoicesService.findByStripeInvoiceId(stripeInvoice.id);

        if (invoice) {
            await this.invoicesService.markAsPaid(invoice.id, {
                amountPaid: (stripeInvoice.amount_paid || 0) / 100,
                stripePaymentIntentId: (stripeInvoice as any).payment_intent as string,
            });
        } else {
            await this.invoicesService.createFromStripeInvoice(
                existingSubscription.tenantId,
                stripeInvoice,
            );
        }

        this.logger.log(`Invoice paid: ${stripeInvoice.id}`);
    }

    /**
     * Handle failed payment
     */
    private async handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice): Promise<void> {
        const customerId = stripeInvoice.customer as string;
        const existingSubscription = await this.findSubscriptionByStripeCustomer(customerId);

        if (!existingSubscription) {
            return;
        }

        // Update invoice status
        const invoice = await this.invoicesService.findByStripeInvoiceId(stripeInvoice.id);
        if (invoice) {
            await this.invoicesService.updateStripeInfo(invoice.id, {
                status: InvoiceStatus.OPEN, // Still open, payment failed
            });
        }

        // TODO: Send notification to tenant about failed payment
        this.logger.warn(`Payment failed for invoice ${stripeInvoice.id}`);
    }

    /**
     * Handle invoice creation
     */
    private async handleInvoiceCreated(stripeInvoice: Stripe.Invoice): Promise<void> {
        const customerId = stripeInvoice.customer as string;
        const existingSubscription = await this.findSubscriptionByStripeCustomer(customerId);

        if (!existingSubscription) {
            return;
        }

        // Create invoice in our database
        await this.invoicesService.createFromStripeInvoice(
            existingSubscription.tenantId,
            stripeInvoice,
        );

        this.logger.log(`Invoice created: ${stripeInvoice.id}`);
    }

    /**
     * Find subscription by Stripe subscription ID
     */
    private async findSubscriptionByStripeId(stripeSubscriptionId: string): Promise<any> {
        // This would need a method in subscriptions service
        // For now, return null and implement properly
        return null;
    }

    /**
     * Find subscription by Stripe customer ID
     */
    private async findSubscriptionByStripeCustomer(stripeCustomerId: string): Promise<any> {
        // This would need a method in subscriptions service
        // For now, return null and implement properly
        return null;
    }
}
