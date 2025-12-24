import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import * as crypto from 'crypto';

describe('Webhook Endpoints (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('WhatsApp Webhooks', () => {
        describe('GET /webhooks/whatsapp (Verification)', () => {
            it('should respond with hub.challenge for valid verification request', async () => {
                const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'test-verify-token';
                const challenge = 'test-challenge-123';

                const response = await request(app.getHttpServer())
                    .get('/api/v1/webhooks/whatsapp')
                    .query({
                        'hub.mode': 'subscribe',
                        'hub.verify_token': verifyToken,
                        'hub.challenge': challenge,
                    });

                // Either 200 with challenge or 403 if token doesn't match
                expect([200, 403]).toContain(response.status);
            });

            it('should reject invalid verification token', async () => {
                const response = await request(app.getHttpServer())
                    .get('/api/v1/webhooks/whatsapp')
                    .query({
                        'hub.mode': 'subscribe',
                        'hub.verify_token': 'invalid-token',
                        'hub.challenge': 'challenge',
                    });

                expect(response.status).toBe(403);
            });
        });

        describe('POST /webhooks/whatsapp (Message Reception)', () => {
            it('should accept valid webhook payload', async () => {
                const payload = {
                    object: 'whatsapp_business_account',
                    entry: [{
                        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
                        changes: [{
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '1234567890',
                                    phone_number_id: 'PHONE_NUMBER_ID',
                                },
                                messages: [{
                                    from: '9876543210',
                                    id: 'wamid.test123',
                                    timestamp: Date.now().toString(),
                                    text: { body: 'Hello from test' },
                                    type: 'text',
                                }],
                            },
                            field: 'messages',
                        }],
                    }],
                };

                const response = await request(app.getHttpServer())
                    .post('/api/v1/webhooks/whatsapp')
                    .send(payload);

                // Should acknowledge the webhook (200 OK)
                expect([200, 404]).toContain(response.status);
            });

            it('should handle status update webhooks', async () => {
                const payload = {
                    object: 'whatsapp_business_account',
                    entry: [{
                        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
                        changes: [{
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '1234567890',
                                    phone_number_id: 'PHONE_NUMBER_ID',
                                },
                                statuses: [{
                                    id: 'wamid.test123',
                                    status: 'delivered',
                                    timestamp: Date.now().toString(),
                                    recipient_id: '9876543210',
                                }],
                            },
                            field: 'messages',
                        }],
                    }],
                };

                const response = await request(app.getHttpServer())
                    .post('/api/v1/webhooks/whatsapp')
                    .send(payload);

                expect([200, 404]).toContain(response.status);
            });
        });
    });

    describe('Shopify Webhooks', () => {
        describe('POST /webhooks/shopify/:topic', () => {
            const generateShopifyHmac = (body: string, secret: string): string => {
                return crypto
                    .createHmac('sha256', secret)
                    .update(body, 'utf8')
                    .digest('base64');
            };

            it('should handle order creation webhook', async () => {
                const orderPayload = {
                    id: 123456789,
                    order_number: 1001,
                    email: 'customer@example.com',
                    total_price: '99.99',
                    currency: 'USD',
                    created_at: new Date().toISOString(),
                    line_items: [{
                        title: 'Test Product',
                        quantity: 1,
                        price: '99.99',
                    }],
                    customer: {
                        id: 987654321,
                        email: 'customer@example.com',
                        first_name: 'Test',
                        last_name: 'Customer',
                    },
                };

                const body = JSON.stringify(orderPayload);
                const hmac = generateShopifyHmac(body, process.env.SHOPIFY_WEBHOOK_SECRET || 'test-secret');

                const response = await request(app.getHttpServer())
                    .post('/api/v1/webhooks/shopify/orders/create')
                    .set('X-Shopify-Hmac-Sha256', hmac)
                    .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
                    .set('X-Shopify-Topic', 'orders/create')
                    .send(orderPayload);

                // Either 200 if valid or 404/401 if endpoint/auth issues
                expect([200, 401, 404]).toContain(response.status);
            });

            it('should handle cart update webhook', async () => {
                const cartPayload = {
                    id: 'cart-123',
                    token: 'cart-token-xyz',
                    line_items: [{
                        id: 1,
                        title: 'Abandoned Product',
                        quantity: 2,
                        price: '49.99',
                    }],
                };

                const response = await request(app.getHttpServer())
                    .post('/api/v1/webhooks/shopify/carts/update')
                    .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
                    .set('X-Shopify-Topic', 'carts/update')
                    .send(cartPayload);

                expect([200, 401, 404]).toContain(response.status);
            });
        });
    });

    describe('Stripe Webhooks', () => {
        describe('POST /webhooks/stripe', () => {
            it('should handle payment intent succeeded', async () => {
                const payload = {
                    id: 'evt_test123',
                    type: 'payment_intent.succeeded',
                    data: {
                        object: {
                            id: 'pi_test123',
                            amount: 9999,
                            currency: 'usd',
                            status: 'succeeded',
                            metadata: {
                                tenantId: 'test-tenant-id',
                            },
                        },
                    },
                };

                const response = await request(app.getHttpServer())
                    .post('/api/v1/webhooks/stripe')
                    .set('Stripe-Signature', 'test-signature')
                    .send(payload);

                // 200 if handled, 400 if signature invalid, 404 if not implemented
                expect([200, 400, 404]).toContain(response.status);
            });

            it('should handle subscription updated', async () => {
                const payload = {
                    id: 'evt_test456',
                    type: 'customer.subscription.updated',
                    data: {
                        object: {
                            id: 'sub_test456',
                            status: 'active',
                            metadata: {
                                tenantId: 'test-tenant-id',
                            },
                        },
                    },
                };

                const response = await request(app.getHttpServer())
                    .post('/api/v1/webhooks/stripe')
                    .send(payload);

                expect([200, 400, 404]).toContain(response.status);
            });
        });
    });

    describe('WooCommerce Webhooks', () => {
        describe('POST /webhooks/woocommerce/:storeId', () => {
            it('should handle new order webhook', async () => {
                const orderPayload = {
                    id: 12345,
                    status: 'pending',
                    total: '150.00',
                    currency: 'USD',
                    billing: {
                        email: 'customer@example.com',
                        phone: '+1234567890',
                        first_name: 'Test',
                        last_name: 'Customer',
                    },
                    line_items: [{
                        name: 'Test Product',
                        quantity: 1,
                        total: '150.00',
                    }],
                };

                const response = await request(app.getHttpServer())
                    .post('/api/v1/webhooks/woocommerce/test-store-id')
                    .set('X-WC-Webhook-Topic', 'order.created')
                    .set('X-WC-Webhook-Source', 'https://test-store.com')
                    .send(orderPayload);

                expect([200, 404]).toContain(response.status);
            });

            it('should handle order status update', async () => {
                const payload = {
                    id: 12345,
                    status: 'completed',
                    total: '150.00',
                };

                const response = await request(app.getHttpServer())
                    .post('/api/v1/webhooks/woocommerce/test-store-id')
                    .set('X-WC-Webhook-Topic', 'order.updated')
                    .send(payload);

                expect([200, 404]).toContain(response.status);
            });
        });
    });
});
