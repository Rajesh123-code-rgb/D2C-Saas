import {
    Controller,
    Post,
    Headers,
    Body,
    RawBodyRequest,
    Req,
    Logger,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { StoresService } from '../services/stores.service';
import { OrdersService, CreateOrderDto } from '../services/orders.service';
import { CartsService } from '../services/carts.service';
import { OrderStatus, PaymentStatus, PaymentMethod } from '../entities/order.entity';
import { WebhookEvent } from '../entities/webhook-event.entity';
import { WebhookLog } from '../entities/webhook-log.entity';

@ApiTags('Shopify Webhooks')
@Controller('webhooks/shopify')
export class ShopifyWebhookController {
    private readonly logger = new Logger(ShopifyWebhookController.name);

    constructor(
        private readonly storesService: StoresService,
        private readonly ordersService: OrdersService,
        private readonly cartsService: CartsService,
        @InjectRepository(WebhookEvent)
        private readonly webhookEventRepository: Repository<WebhookEvent>,
        @InjectRepository(WebhookLog)
        private readonly webhookLogRepository: Repository<WebhookLog>,
    ) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Handle Shopify webhook events' })
    async handleWebhook(
        @Headers('x-shopify-topic') topic: string,
        @Headers('x-shopify-hmac-sha256') hmac: string,
        @Headers('x-shopify-shop-domain') shopDomain: string,
        @Headers('x-shopify-webhook-id') webhookId: string,
        @Body() body: any,
        @Req() req: RawBodyRequest<Request>,
    ): Promise<{ status: string }> {
        const startTime = Date.now();
        let log: WebhookLog | null = null;

        try {
            this.logger.log(`Shopify webhook received: ${topic} from ${shopDomain} (ID: ${webhookId})`);

            // Create webhook log entry
            log = this.webhookLogRepository.create({
                platform: 'shopify',
                topic,
                storeDomain: shopDomain,
                eventId: webhookId,
                payload: body,
                status: 'received',
            });
            await this.webhookLogRepository.save(log);

            // Check for duplicate event
            if (webhookId) {
                const existingEvent = await this.webhookEventRepository.findOne({
                    where: { eventId: webhookId },
                });

                if (existingEvent) {
                    this.logger.warn(`Duplicate webhook detected: ${webhookId}`);
                    log.status = 'duplicate';
                    log.durationMs = Date.now() - startTime;
                    log.completedAt = new Date();
                    await this.webhookLogRepository.save(log);
                    return { status: 'duplicate' };
                }

                // Record event as being processed
                const event = this.webhookEventRepository.create({
                    eventId: webhookId,
                    platform: 'shopify',
                    topic,
                    processedAt: new Date(),
                    success: false,
                });
                await this.webhookEventRepository.save(event);
            }

            // Update log status
            log.status = 'processing';
            await this.webhookLogRepository.save(log);

            // Route to appropriate handler
            switch (topic) {
                case 'orders/create':
                    await this.handleOrderCreated(body, shopDomain);
                    break;
                case 'orders/updated':
                    await this.handleOrderUpdated(body, shopDomain);
                    break;
                case 'orders/paid':
                    await this.handleOrderPaid(body, shopDomain);
                    break;
                case 'orders/fulfilled':
                    await this.handleOrderFulfilled(body, shopDomain);
                    break;
                case 'orders/cancelled':
                    await this.handleOrderCancelled(body, shopDomain);
                    break;
                case 'checkouts/create':
                    await this.handleCheckoutCreated(body, shopDomain);
                    break;
                case 'checkouts/update':
                    await this.handleCheckoutUpdated(body, shopDomain);
                    break;
                case 'carts/create':
                case 'carts/update':
                    await this.handleCartUpdated(body, shopDomain);
                    break;
                default:
                    this.logger.log(`Unhandled topic: ${topic}`);
            }

            // Mark event as successful
            if (webhookId) {
                await this.webhookEventRepository.update(
                    { eventId: webhookId },
                    { success: true },
                );
            }

            // Update log with success
            log.status = 'success';
            log.durationMs = Date.now() - startTime;
            log.completedAt = new Date();
            await this.webhookLogRepository.save(log);

            return { status: 'received' };
        } catch (error: any) {
            this.logger.error(`Webhook error: ${error.message}`, error.stack);

            // Update log with error
            if (log) {
                log.status = 'failed';
                log.errorMessage = error.message;
                log.durationMs = Date.now() - startTime;
                log.completedAt = new Date();
                await this.webhookLogRepository.save(log);
            }

            // Update event with error
            if (webhookId) {
                await this.webhookEventRepository.update(
                    { eventId: webhookId },
                    { success: false, errorMessage: error.message },
                );
            }

            return { status: 'error' };
        }
    }


    private async handleOrderCreated(data: any, shopDomain: string): Promise<void> {
        this.logger.log(`Processing order created: ${data.order_number}`);

        // Get store and tenant info (would look up from database)
        // For now, we'll need the tenant ID from the store
        const tenantId = await this.getTenantIdFromShop(shopDomain);
        const storeId = await this.getStoreIdFromShop(shopDomain);

        if (!tenantId || !storeId) {
            this.logger.error(`Store not found for ${shopDomain}`);
            return;
        }

        // Parse customer info
        const customer = data.customer || {};
        const shippingAddress = data.shipping_address || {};

        // Determine payment method
        let paymentMethod = PaymentMethod.OTHER;
        if (data.payment_gateway_names?.includes('Cash on Delivery')) {
            paymentMethod = PaymentMethod.COD;
        } else if (data.financial_status === 'paid') {
            paymentMethod = PaymentMethod.PREPAID;
        }

        // Determine payment status
        let paymentStatus = PaymentStatus.PENDING;
        if (data.financial_status === 'paid') {
            paymentStatus = PaymentStatus.PAID;
        } else if (paymentMethod === PaymentMethod.COD) {
            paymentStatus = PaymentStatus.COD_PENDING;
        }

        // Parse items
        const items = (data.line_items || []).map((item: any) => ({
            productId: item.product_id?.toString(),
            platformProductId: item.product_id?.toString(),
            name: item.title,
            sku: item.sku || '',
            quantity: item.quantity,
            price: parseFloat(item.price),
            originalPrice: parseFloat(item.compare_at_price || item.price),
            variantId: item.variant_id?.toString(),
            variantName: item.variant_title,
            imageUrl: item.image?.src,
        }));

        const orderDto: CreateOrderDto = {
            storeId,
            platformOrderId: data.id.toString(),
            orderNumber: data.order_number?.toString() || data.name,
            customerEmail: customer.email,
            customerPhone: shippingAddress.phone || customer.phone,
            customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            status: OrderStatus.PENDING,
            paymentStatus,
            paymentMethod,
            currency: data.currency || 'INR',
            subtotal: parseFloat(data.subtotal_price || 0),
            discount: parseFloat(data.total_discounts || 0),
            shipping: parseFloat(data.total_shipping_price_set?.shop_money?.amount || 0),
            tax: parseFloat(data.total_tax || 0),
            total: parseFloat(data.total_price || 0),
            items,
            shippingAddress: shippingAddress ? {
                firstName: shippingAddress.first_name,
                lastName: shippingAddress.last_name,
                phone: shippingAddress.phone,
                address1: shippingAddress.address1,
                address2: shippingAddress.address2,
                city: shippingAddress.city,
                state: shippingAddress.province,
                country: shippingAddress.country,
                postalCode: shippingAddress.zip,
                company: shippingAddress.company,
            } : undefined,
            notes: data.note,
            customerNote: data.note,
            orderDate: new Date(data.created_at),
            metadata: {
                shopifyId: data.id,
                tags: data.tags,
                source: data.source_name,
            },
        };

        await this.ordersService.createOrder(tenantId, orderDto);

        // Check if this cart was abandoned and mark as recovered
        if (data.cart_token) {
            const cart = await this.cartsService.findByPlatformCartId(
                tenantId,
                storeId,
                data.cart_token,
            );
            if (cart) {
                await this.cartsService.markRecovered(cart.id, data.id.toString());
            }
        }
    }

    private async handleOrderUpdated(data: any, shopDomain: string): Promise<void> {
        this.logger.log(`Processing order updated: ${data.order_number}`);
        // Handle order updates (status changes, etc.)
    }

    private async handleOrderPaid(data: any, shopDomain: string): Promise<void> {
        this.logger.log(`Processing order paid: ${data.order_number}`);

        const tenantId = await this.getTenantIdFromShop(shopDomain);
        if (!tenantId) return;

        // Find and update order payment status
        // This would update the payment status to PAID
    }

    private async handleOrderFulfilled(data: any, shopDomain: string): Promise<void> {
        this.logger.log(`Processing order fulfilled: ${data.order_number}`);

        const tenantId = await this.getTenantIdFromShop(shopDomain);
        if (!tenantId) return;

        // Update order status to shipped/delivered
        // Extract tracking info from fulfillments
        const fulfillment = data.fulfillments?.[0];
        if (fulfillment) {
            this.logger.log(`Tracking: ${fulfillment.tracking_number} via ${fulfillment.tracking_company}`);
        }
    }

    private async handleOrderCancelled(data: any, shopDomain: string): Promise<void> {
        this.logger.log(`Processing order cancelled: ${data.order_number}`);
        // Update order status to cancelled
    }

    private async handleCheckoutCreated(data: any, shopDomain: string): Promise<void> {
        this.logger.log(`Processing checkout created: ${data.token}`);
        await this.processCheckout(data, shopDomain);
    }

    private async handleCheckoutUpdated(data: any, shopDomain: string): Promise<void> {
        this.logger.log(`Processing checkout updated: ${data.token}`);
        await this.processCheckout(data, shopDomain);
    }

    private async processCheckout(data: any, shopDomain: string): Promise<void> {
        const tenantId = await this.getTenantIdFromShop(shopDomain);
        const storeId = await this.getStoreIdFromShop(shopDomain);

        if (!tenantId || !storeId) return;

        // If checkout is abandoned (no order created within timeout)
        // This is typically handled by a scheduled job, not the webhook directly

        const items = (data.line_items || []).map((item: any) => ({
            productId: item.product_id?.toString(),
            platformProductId: item.product_id?.toString(),
            name: item.title,
            sku: item.sku || '',
            quantity: item.quantity,
            price: parseFloat(item.price),
            variantId: item.variant_id?.toString(),
            imageUrl: item.image?.src,
        }));

        await this.cartsService.createOrUpdateCart(tenantId, {
            storeId,
            platformCartId: data.token,
            customerEmail: data.email,
            customerPhone: data.phone || data.shipping_address?.phone,
            customerName: data.shipping_address
                ? `${data.shipping_address.first_name} ${data.shipping_address.last_name}`
                : undefined,
            items,
            subtotal: parseFloat(data.subtotal_price || 0),
            total: parseFloat(data.total_price || 0),
            currency: data.currency || 'INR',
            checkoutUrl: data.abandoned_checkout_url,
        });
    }

    private async handleCartUpdated(data: any, shopDomain: string): Promise<void> {
        this.logger.log(`Processing cart update: ${data.token}`);
        // Similar to checkout handling
    }

    // Helper methods - in production, these would query the database
    private async getTenantIdFromShop(shopDomain: string): Promise<string | null> {
        // TODO: Query stores table by shop domain
        // For now, return null - this needs database lookup
        this.logger.warn(`getTenantIdFromShop not fully implemented for ${shopDomain}`);
        return null;
    }

    private async getStoreIdFromShop(shopDomain: string): Promise<string | null> {
        // TODO: Query stores table by shop domain
        // For now, return null - this needs database lookup
        this.logger.warn(`getStoreIdFromShop not fully implemented for ${shopDomain}`);
        return null;
    }

    private verifyWebhookSignature(
        rawBody: string,
        hmac: string,
        secret: string,
    ): boolean {
        const calculatedHmac = crypto
            .createHmac('sha256', secret)
            .update(rawBody, 'utf8')
            .digest('base64');

        return crypto.timingSafeEqual(
            Buffer.from(hmac),
            Buffer.from(calculatedHmac),
        );
    }
}
