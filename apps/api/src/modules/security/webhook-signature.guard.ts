import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

export const WEBHOOK_PROVIDER_KEY = 'webhook_provider';

export type WebhookProvider = 'meta' | 'shopify' | 'stripe' | 'woocommerce';

export function WebhookProvider(provider: WebhookProvider) {
    return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
        Reflect.defineMetadata(WEBHOOK_PROVIDER_KEY, provider, descriptor?.value ?? target);
    };
}

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
    private readonly logger = new Logger(WebhookSignatureGuard.name);

    constructor(
        private configService: ConfigService,
        private reflector: Reflector,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const provider = this.reflector.get<WebhookProvider>(
            WEBHOOK_PROVIDER_KEY,
            context.getHandler(),
        );

        if (!provider) {
            this.logger.warn('No webhook provider specified, skipping signature verification');
            return true;
        }

        try {
            switch (provider) {
                case 'meta':
                    return this.verifyMetaSignature(request);
                case 'shopify':
                    return this.verifyShopifySignature(request);
                case 'stripe':
                    return this.verifyStripeSignature(request);
                case 'woocommerce':
                    return this.verifyWooCommerceSignature(request);
                default:
                    this.logger.warn(`Unknown webhook provider: ${provider}`);
                    return true;
            }
        } catch (error) {
            this.logger.error(`Webhook signature verification failed: ${(error as Error).message}`);
            throw new UnauthorizedException('Invalid webhook signature');
        }
    }

    /**
     * Verify Meta/Facebook webhook signature
     * Header: x-hub-signature-256
     */
    private verifyMetaSignature(request: any): boolean {
        const signature = request.headers['x-hub-signature-256'];
        if (!signature) {
            throw new UnauthorizedException('Missing x-hub-signature-256 header');
        }

        const appSecret = this.configService.get<string>('META_APP_SECRET');
        if (!appSecret) {
            this.logger.warn('META_APP_SECRET not configured, skipping verification');
            return true;
        }

        const rawBody = request.rawBody || JSON.stringify(request.body);
        const expectedSignature = 'sha256=' + crypto
            .createHmac('sha256', appSecret)
            .update(rawBody)
            .digest('hex');

        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature),
        );

        if (!isValid) {
            this.logger.warn('Invalid Meta webhook signature');
            throw new UnauthorizedException('Invalid webhook signature');
        }

        return true;
    }

    /**
     * Verify Shopify webhook signature
     * Header: x-shopify-hmac-sha256
     */
    private verifyShopifySignature(request: any): boolean {
        const signature = request.headers['x-shopify-hmac-sha256'];
        if (!signature) {
            throw new UnauthorizedException('Missing x-shopify-hmac-sha256 header');
        }

        const secret = this.configService.get<string>('SHOPIFY_WEBHOOK_SECRET');
        if (!secret) {
            this.logger.warn('SHOPIFY_WEBHOOK_SECRET not configured, skipping verification');
            return true;
        }

        const rawBody = request.rawBody || JSON.stringify(request.body);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody, 'utf8')
            .digest('base64');

        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature, 'base64'),
            Buffer.from(expectedSignature, 'base64'),
        );

        if (!isValid) {
            this.logger.warn('Invalid Shopify webhook signature');
            throw new UnauthorizedException('Invalid webhook signature');
        }

        return true;
    }

    /**
     * Verify Stripe webhook signature
     * Header: stripe-signature
     */
    private verifyStripeSignature(request: any): boolean {
        const signature = request.headers['stripe-signature'];
        if (!signature) {
            throw new UnauthorizedException('Missing stripe-signature header');
        }

        const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
        if (!secret) {
            this.logger.warn('STRIPE_WEBHOOK_SECRET not configured, skipping verification');
            return true;
        }

        const rawBody = request.rawBody || JSON.stringify(request.body);

        // Parse Stripe signature header
        const elements = signature.split(',');
        const signatureMap: Record<string, string> = {};

        for (const element of elements) {
            const [key, value] = element.split('=');
            signatureMap[key] = value;
        }

        const timestamp = signatureMap['t'];
        const v1Signature = signatureMap['v1'];

        if (!timestamp || !v1Signature) {
            throw new UnauthorizedException('Invalid stripe-signature format');
        }

        // Validate timestamp (prevent replay attacks - 5 minute tolerance)
        const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
        if (timestampAge > 300) {
            throw new UnauthorizedException('Webhook timestamp too old');
        }

        const signedPayload = `${timestamp}.${rawBody}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(signedPayload)
            .digest('hex');

        const isValid = crypto.timingSafeEqual(
            Buffer.from(v1Signature),
            Buffer.from(expectedSignature),
        );

        if (!isValid) {
            this.logger.warn('Invalid Stripe webhook signature');
            throw new UnauthorizedException('Invalid webhook signature');
        }

        return true;
    }

    /**
     * Verify WooCommerce webhook signature
     * Header: x-wc-webhook-signature
     */
    private verifyWooCommerceSignature(request: any): boolean {
        const signature = request.headers['x-wc-webhook-signature'];
        if (!signature) {
            // WooCommerce webhooks might not always have signature
            this.logger.warn('Missing x-wc-webhook-signature header');
            return true;
        }

        const secret = this.configService.get<string>('WOOCOMMERCE_WEBHOOK_SECRET');
        if (!secret) {
            this.logger.warn('WOOCOMMERCE_WEBHOOK_SECRET not configured, skipping verification');
            return true;
        }

        const rawBody = request.rawBody || JSON.stringify(request.body);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('base64');

        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature, 'base64'),
            Buffer.from(expectedSignature, 'base64'),
        );

        if (!isValid) {
            this.logger.warn('Invalid WooCommerce webhook signature');
            throw new UnauthorizedException('Invalid webhook signature');
        }

        return true;
    }
}
