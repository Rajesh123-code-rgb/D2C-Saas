import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { SubscriptionPlan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { UsageRecord, UsageSnapshot } from './entities/usage.entity';
import { Invoice } from './entities/invoice.entity';

// Services
import { PlansService } from './services/plans.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { UsageService } from './services/usage.service';
import { InvoicesService } from './services/invoices.service';
import { StripeService } from './services/stripe.service';

// Controllers
import { BillingController } from './controllers/billing.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';

// Guards
import { PlanEnforcementGuard, UsageLimitGuard } from './guards/plan-enforcement.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            SubscriptionPlan,
            Subscription,
            UsageRecord,
            UsageSnapshot,
            Invoice,
        ]),
        ConfigModule,
    ],
    providers: [
        PlansService,
        SubscriptionsService,
        UsageService,
        InvoicesService,
        StripeService,
        PlanEnforcementGuard,
        UsageLimitGuard,
    ],
    controllers: [BillingController, StripeWebhookController],
    exports: [
        PlansService,
        SubscriptionsService,
        UsageService,
        InvoicesService,
        StripeService,
        PlanEnforcementGuard,
        UsageLimitGuard,
    ],
})
export class BillingModule { }

