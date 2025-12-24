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
import * as crypto from 'crypto';
import { StoresService } from '../services/stores.service';
import { OrdersService, CreateOrderDto } from '../services/orders.service';
import { CartsService } from '../services/carts.service';
import { OrderStatus, PaymentStatus, PaymentMethod } from '../entities/order.entity';
import { EcommercePlatform } from '../entities/store.entity';

@ApiTags('WooCommerce Webhooks')
@Controller('webhooks/woocommerce')
export class WooCommerceWebhookController {
    private readonly logger = new Logger(WooCommerceWebhookController.name);

    constructor(
        private readonly storesService: StoresService,
        private readonly ordersService: OrdersService,
        private readonly cartsService: CartsService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Handle WooCommerce webhook events' })
    async handleWebhook(
        @Headers('x-wc-webhook-topic') topic: string,
        @Headers('x-wc-webhook-source') source: string,
        @Headers('x-wc-webhook-signature') signature: string,
        @Body() body: any,
        @Req() req: RawBodyRequest<Request>,
    ): Promise<{ status: string }> {
        try {
            this.logger.log(`WooCommerce webhook received: ${topic} from ${source}`);

            // Find store by source URL
            const store = await this.findStoreByUrl(source);
            if (!store) {
                this.logger.warn(`Store not found for ${source}`);
                return { status: 'store_not_found' };
            }

            // Verify signature
            const rawBody = req.rawBody?.toString() || JSON.stringify(body);
            if (store.webhookSecret && !this.verifySignature(rawBody, signature, store.webhookSecret)) {
                this.logger.warn('Invalid webhook signature');
                return { status: 'invalid_signature' };
            }

            // Route to appropriate handler
            switch (topic) {
                case 'order.created':
                    await this.handleOrderCreated(body, store.tenantId, store.id);
                    break;
                case 'order.updated':
                    await this.handleOrderUpdated(body, store.tenantId, store.id);
                    break;
                case 'order.completed':
                    await this.handleOrderCompleted(body, store.tenantId, store.id);
                    break;
                case 'order.cancelled':
                    await this.handleOrderCancelled(body, store.tenantId, store.id);
                    break;
                case 'order.refunded':
                    await this.handleOrderRefunded(body, store.tenantId, store.id);
                    break;
                default:
                    this.logger.log(`Unhandled topic: ${topic}`);
            }

            return { status: 'received' };
        } catch (error: any) {
            this.logger.error(`Webhook error: ${error.message}`, error.stack);
            return { status: 'error' };
        }
    }

    private async handleOrderCreated(data: any, tenantId: string, storeId: string): Promise<void> {
        this.logger.log(`Processing WooCommerce order created: ${data.number}`);

        // Parse customer info
        const billing = data.billing || {};
        const shipping = data.shipping || {};

        // Determine payment method
        let paymentMethod = PaymentMethod.OTHER;
        const wcPaymentMethod = data.payment_method?.toLowerCase() || '';
        if (wcPaymentMethod.includes('cod') || wcPaymentMethod.includes('cash')) {
            paymentMethod = PaymentMethod.COD;
        } else if (wcPaymentMethod.includes('razorpay') || wcPaymentMethod.includes('payu') || wcPaymentMethod.includes('upi')) {
            paymentMethod = PaymentMethod.UPI;
        } else if (data.date_paid) {
            paymentMethod = PaymentMethod.PREPAID;
        }

        // Determine payment status
        let paymentStatus = PaymentStatus.PENDING;
        if (data.date_paid) {
            paymentStatus = PaymentStatus.PAID;
        } else if (paymentMethod === PaymentMethod.COD) {
            paymentStatus = PaymentStatus.COD_PENDING;
        }

        // Determine order status
        let orderStatus = OrderStatus.PENDING;
        switch (data.status) {
            case 'processing':
                orderStatus = OrderStatus.PROCESSING;
                break;
            case 'on-hold':
                orderStatus = OrderStatus.PENDING;
                break;
            case 'completed':
                orderStatus = OrderStatus.DELIVERED;
                break;
            case 'cancelled':
                orderStatus = OrderStatus.CANCELLED;
                break;
            case 'refunded':
                orderStatus = OrderStatus.REFUNDED;
                break;
        }

        // Parse items
        const items = (data.line_items || []).map((item: any) => ({
            productId: item.product_id?.toString(),
            platformProductId: item.product_id?.toString(),
            name: item.name,
            sku: item.sku || '',
            quantity: item.quantity,
            price: parseFloat(item.price),
            originalPrice: parseFloat(item.price),
            variantId: item.variation_id?.toString(),
            imageUrl: item.image?.src,
        }));

        const orderDto: CreateOrderDto = {
            storeId,
            platformOrderId: data.id.toString(),
            orderNumber: data.number?.toString() || `#${data.id}`,
            customerEmail: billing.email,
            customerPhone: billing.phone,
            customerName: `${billing.first_name || ''} ${billing.last_name || ''}`.trim(),
            status: orderStatus,
            paymentStatus,
            paymentMethod,
            currency: data.currency || 'INR',
            subtotal: parseFloat(data.subtotal || 0),
            discount: parseFloat(data.discount_total || 0),
            shipping: parseFloat(data.shipping_total || 0),
            tax: parseFloat(data.total_tax || 0),
            total: parseFloat(data.total || 0),
            items,
            shippingAddress: {
                firstName: shipping.first_name || billing.first_name,
                lastName: shipping.last_name || billing.last_name,
                phone: billing.phone,
                email: billing.email,
                address1: shipping.address_1 || billing.address_1,
                address2: shipping.address_2 || billing.address_2,
                city: shipping.city || billing.city,
                state: shipping.state || billing.state,
                country: shipping.country || billing.country,
                postalCode: shipping.postcode || billing.postcode,
                company: shipping.company || billing.company,
            },
            billingAddress: {
                firstName: billing.first_name,
                lastName: billing.last_name,
                phone: billing.phone,
                email: billing.email,
                address1: billing.address_1,
                address2: billing.address_2,
                city: billing.city,
                state: billing.state,
                country: billing.country,
                postalCode: billing.postcode,
                company: billing.company,
            },
            notes: data.customer_note,
            customerNote: data.customer_note,
            orderDate: new Date(data.date_created),
            metadata: {
                woocommerceId: data.id,
                paymentMethod: data.payment_method,
                paymentMethodTitle: data.payment_method_title,
                transactionId: data.transaction_id,
            },
        };

        await this.ordersService.createOrder(tenantId, orderDto);
    }

    private async handleOrderUpdated(data: any, tenantId: string, storeId: string): Promise<void> {
        this.logger.log(`Processing WooCommerce order updated: ${data.number}`);

        // Map WooCommerce status to our status
        let orderStatus: OrderStatus | null = null;
        switch (data.status) {
            case 'processing':
                orderStatus = OrderStatus.PROCESSING;
                break;
            case 'completed':
                orderStatus = OrderStatus.DELIVERED;
                break;
            case 'cancelled':
                orderStatus = OrderStatus.CANCELLED;
                break;
            case 'refunded':
                orderStatus = OrderStatus.REFUNDED;
                break;
        }

        if (orderStatus) {
            // Find order by platform ID and update
            // Note: Would need to implement findByPlatformId in OrdersService
            this.logger.log(`Would update order ${data.id} to status ${orderStatus}`);
        }
    }

    private async handleOrderCompleted(data: any, tenantId: string, storeId: string): Promise<void> {
        this.logger.log(`Processing WooCommerce order completed: ${data.number}`);
        // Order delivered
    }

    private async handleOrderCancelled(data: any, tenantId: string, storeId: string): Promise<void> {
        this.logger.log(`Processing WooCommerce order cancelled: ${data.number}`);
        // Order cancelled
    }

    private async handleOrderRefunded(data: any, tenantId: string, storeId: string): Promise<void> {
        this.logger.log(`Processing WooCommerce order refunded: ${data.number}`);
        // Order refunded
    }

    private async findStoreByUrl(sourceUrl: string): Promise<any> {
        // Normalize URL
        let normalizedUrl = sourceUrl.toLowerCase().trim();
        normalizedUrl = normalizedUrl.replace(/\/$/, '');
        normalizedUrl = normalizedUrl.replace(/^https?:\/\//, '');

        // Find store by URL
        const stores = await this.storesService.findAll('');
        return stores.find((s) => {
            const storeUrl = s.storeUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
            return storeUrl === normalizedUrl || normalizedUrl.includes(storeUrl);
        });
    }

    private verifySignature(payload: string, signature: string, secret: string): boolean {
        if (!signature || !secret) {
            return true; // Skip verification if no secret configured
        }

        const calculatedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload, 'utf8')
            .digest('base64');

        try {
            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(calculatedSignature),
            );
        } catch {
            return false;
        }
    }
}
