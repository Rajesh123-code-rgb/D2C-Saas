import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// Entities
import { EcommerceStore } from './entities/store.entity';
import { EcommerceOrder } from './entities/order.entity';
import { AbandonedCart } from './entities/cart.entity';
import { EcommerceEvent } from './entities/event.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { WebhookLog } from './entities/webhook-log.entity';

// Services
import { StoresService } from './services/stores.service';
import { OrdersService } from './services/orders.service';
import { CartsService } from './services/carts.service';
import { EventsService } from './services/events.service';
import { EcommerceEventsProcessor } from './services/events.processor';
import { WooCommerceService } from './services/woocommerce.service';
import { ShopifyService } from './services/shopify.service';

// Controllers
import { StoresController } from './controllers/stores.controller';
import { OrdersController } from './controllers/orders.controller';
import { CartsController } from './controllers/carts.controller';
import { ShopifyAuthController } from './controllers/shopify.auth.controller';

// Webhooks
import { ShopifyWebhookController } from './webhooks/shopify.webhook.controller';
import { WooCommerceWebhookController } from './webhooks/woocommerce.webhook.controller';

// Dependencies
import { ContactsModule } from '../contacts/contacts.module';
import { AutomationsModule } from '../automations/automations.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            EcommerceStore,
            EcommerceOrder,
            AbandonedCart,
            EcommerceEvent,
            WebhookEvent,
            WebhookLog,
        ]),
        BullModule.registerQueue({
            name: 'ecommerce-events',
        }),
        ContactsModule,
        forwardRef(() => AutomationsModule),
    ],
    providers: [
        StoresService,
        OrdersService,
        CartsService,
        EventsService,
        EcommerceEventsProcessor,
        WooCommerceService,
        ShopifyService,
    ],
    controllers: [
        StoresController,
        OrdersController,
        CartsController,
        ShopifyAuthController,
        ShopifyWebhookController,
        WooCommerceWebhookController,
    ],
    exports: [
        StoresService,
        OrdersService,
        CartsService,
        EventsService,
        WooCommerceService,
        ShopifyService,
    ],
})
export class EcommerceModule { }
