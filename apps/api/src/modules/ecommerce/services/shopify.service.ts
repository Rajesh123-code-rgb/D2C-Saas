import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { EcommerceStore, EcommercePlatform } from '../entities/store.entity';

export interface ShopifyOAuthConfig {
    apiKey: string;
    apiSecret: string;
    scopes: string[];
    redirectUri: string;
}

export interface ShopifyAccessTokenResponse {
    access_token: string;
    scope: string;
    expires_in?: number;
    associated_user_scope?: string;
    associated_user?: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
    };
}

@Injectable()
export class ShopifyService {
    private readonly logger = new Logger(ShopifyService.name);

    // Default scopes for the app
    private readonly defaultScopes = [
        'read_orders',
        'write_orders',
        'read_products',
        'read_customers',
        'write_customers',
        'read_checkouts',
        'write_checkouts',
    ];

    constructor(
        @InjectRepository(EcommerceStore)
        private readonly storeRepository: Repository<EcommerceStore>,
    ) { }

    /**
     * Generate the OAuth authorization URL for Shopify
     */
    getAuthorizationUrl(
        shop: string,
        state: string,
        redirectUri?: string,
    ): string {
        const apiKey = process.env.SHOPIFY_API_KEY;
        if (!apiKey) {
            throw new BadRequestException('Shopify API key not configured');
        }

        // Validate shop domain
        const shopDomain = this.sanitizeShopDomain(shop);
        if (!shopDomain) {
            throw new BadRequestException('Invalid shop domain');
        }

        const scopes = this.defaultScopes.join(',');
        const redirect = redirectUri || process.env.SHOPIFY_REDIRECT_URI ||
            `${process.env.API_URL}/api/v1/shopify/auth/callback`;

        const authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
        authUrl.searchParams.set('client_id', apiKey);
        authUrl.searchParams.set('scope', scopes);
        authUrl.searchParams.set('redirect_uri', redirect);
        authUrl.searchParams.set('state', state);

        this.logger.log(`Generated OAuth URL for shop: ${shopDomain}`);
        return authUrl.toString();
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(
        shop: string,
        code: string,
    ): Promise<ShopifyAccessTokenResponse> {
        const apiKey = process.env.SHOPIFY_API_KEY;
        const apiSecret = process.env.SHOPIFY_API_SECRET;

        if (!apiKey || !apiSecret) {
            throw new BadRequestException('Shopify API credentials not configured');
        }

        const shopDomain = this.sanitizeShopDomain(shop);
        if (!shopDomain) {
            throw new BadRequestException('Invalid shop domain');
        }

        const tokenUrl = `https://${shopDomain}/admin/oauth/access_token`;

        try {
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: apiKey,
                    client_secret: apiSecret,
                    code,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Failed to exchange code: ${errorText}`);
                throw new UnauthorizedException('Failed to obtain access token');
            }

            const tokenData = await response.json() as ShopifyAccessTokenResponse;
            this.logger.log(`Successfully obtained access token for shop: ${shopDomain}`);
            return tokenData;
        } catch (error) {
            const err = error as Error;
            this.logger.error(`OAuth token exchange failed: ${err.message}`);
            throw new UnauthorizedException('Failed to complete OAuth flow');
        }
    }

    /**
     * Validate HMAC signature from Shopify OAuth callback
     */
    validateHmac(query: Record<string, string>): boolean {
        const apiSecret = process.env.SHOPIFY_API_SECRET;
        if (!apiSecret) {
            throw new BadRequestException('Shopify API secret not configured');
        }

        const { hmac, ...params } = query;
        if (!hmac) {
            return false;
        }

        // Sort parameters alphabetically and create query string
        const sortedParams = Object.keys(params)
            .sort()
            .map((key) => `${key}=${params[key]}`)
            .join('&');

        // Generate HMAC
        const generatedHmac = crypto
            .createHmac('sha256', apiSecret)
            .update(sortedParams)
            .digest('hex');

        // Compare using timing-safe comparison
        return crypto.timingSafeEqual(
            Buffer.from(hmac, 'hex'),
            Buffer.from(generatedHmac, 'hex'),
        );
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(rawBody: string, hmac: string): boolean {
        const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET;
        if (!secret) {
            this.logger.warn('Webhook secret not configured');
            return false;
        }

        const generatedHmac = crypto
            .createHmac('sha256', secret)
            .update(rawBody, 'utf8')
            .digest('base64');

        try {
            return crypto.timingSafeEqual(
                Buffer.from(hmac),
                Buffer.from(generatedHmac),
            );
        } catch {
            return false;
        }
    }

    /**
     * Connect a Shopify store using OAuth token
     */
    async connectStoreWithOAuth(
        tenantId: string,
        shop: string,
        accessToken: string,
        scope: string,
    ): Promise<EcommerceStore> {
        const shopDomain = this.sanitizeShopDomain(shop);
        if (!shopDomain) {
            throw new BadRequestException('Invalid shop domain');
        }

        // Check if store already exists
        let store = await this.storeRepository.findOne({
            where: { tenantId, storeUrl: shopDomain },
        });

        if (store) {
            // Update existing store with new token
            store.accessToken = accessToken;
            store.isActive = true;
            store.settings = {
                ...store.settings,
                shopifyScope: scope,
            };
        } else {
            // Fetch shop info from Shopify API
            const shopInfo = await this.getShopInfo(shopDomain, accessToken);

            // Create new store
            store = this.storeRepository.create({
                tenantId,
                platform: EcommercePlatform.SHOPIFY,
                storeName: shopInfo?.name || shopDomain.replace('.myshopify.com', ''),
                storeUrl: shopDomain,
                accessToken,
                isActive: true,
                settings: {
                    shopifyScope: scope,
                    currency: shopInfo?.currency || 'USD',
                    timezone: shopInfo?.timezone || 'UTC',
                },
            });
        }

        return this.storeRepository.save(store);
    }

    /**
     * Get shop information from Shopify API
     */
    async getShopInfo(shop: string, accessToken: string): Promise<any> {
        const shopDomain = this.sanitizeShopDomain(shop);
        if (!shopDomain) {
            throw new BadRequestException('Invalid shop domain');
        }

        try {
            const response = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                this.logger.warn(`Failed to fetch shop info: ${response.status}`);
                return null;
            }

            const data = await response.json() as { shop?: any };
            return data.shop;
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Error fetching shop info: ${err.message}`);
            return null;
        }
    }

    /**
     * Sync products from Shopify
     */
    async syncProducts(storeId: string): Promise<{ count: number }> {
        const store = await this.storeRepository.findOne({ where: { id: storeId } });
        if (!store || !store.accessToken) {
            throw new BadRequestException('Store not found or not connected');
        }

        const shopDomain = store.storeUrl;
        let allProducts: any[] = [];
        let pageInfo: string | null = null;

        try {
            // Paginate through all products
            do {
                const url = new URL(`https://${shopDomain}/admin/api/2024-01/products.json`);
                url.searchParams.set('limit', '250');
                if (pageInfo) {
                    url.searchParams.set('page_info', pageInfo);
                }

                const response = await fetch(url.toString(), {
                    headers: {
                        'X-Shopify-Access-Token': store.accessToken,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch products: ${response.status}`);
                }

                const data = await response.json() as { products?: any[] };
                allProducts = allProducts.concat(data.products || []);

                // Get next page from Link header
                const linkHeader = response.headers.get('link');
                pageInfo = this.extractNextPageInfo(linkHeader);
            } while (pageInfo);

            // Update store product count
            store.productsCount = allProducts.length;
            store.lastSyncAt = new Date();
            await this.storeRepository.save(store);

            this.logger.log(`Synced ${allProducts.length} products from ${shopDomain}`);
            return { count: allProducts.length };
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Product sync failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Sync orders from Shopify
     */
    async syncOrders(storeId: string, sinceId?: string): Promise<{ count: number }> {
        const store = await this.storeRepository.findOne({ where: { id: storeId } });
        if (!store || !store.accessToken) {
            throw new BadRequestException('Store not found or not connected');
        }

        const shopDomain = store.storeUrl;
        let allOrders: any[] = [];
        let pageInfo: string | null = null;

        try {
            do {
                const url = new URL(`https://${shopDomain}/admin/api/2024-01/orders.json`);
                url.searchParams.set('limit', '250');
                url.searchParams.set('status', 'any');
                if (sinceId) {
                    url.searchParams.set('since_id', sinceId);
                }
                if (pageInfo) {
                    url.searchParams.set('page_info', pageInfo);
                }

                const response = await fetch(url.toString(), {
                    headers: {
                        'X-Shopify-Access-Token': store.accessToken,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch orders: ${response.status}`);
                }

                const data = await response.json() as { orders?: any[] };
                allOrders = allOrders.concat(data.orders || []);

                const linkHeader = response.headers.get('link');
                pageInfo = this.extractNextPageInfo(linkHeader);
            } while (pageInfo);

            // Update store order count
            store.ordersCount = (store.ordersCount || 0) + allOrders.length;
            store.lastSyncAt = new Date();
            await this.storeRepository.save(store);

            this.logger.log(`Synced ${allOrders.length} orders from ${shopDomain}`);
            return { count: allOrders.length };
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Order sync failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Sanitize and validate Shopify shop domain
     */
    private sanitizeShopDomain(shop: string): string | null {
        if (!shop) return null;

        // Remove protocol if present
        let domain = shop.replace(/^https?:\/\//, '');

        // Remove trailing slashes
        domain = domain.replace(/\/$/, '');

        // Add .myshopify.com if not present
        if (!domain.includes('.')) {
            domain = `${domain}.myshopify.com`;
        }

        // Validate the domain format
        const shopifyDomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
        if (!shopifyDomainRegex.test(domain)) {
            // Also allow custom domains
            const customDomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
            if (!customDomainRegex.test(domain)) {
                return null;
            }
        }

        return domain;
    }

    /**
     * Extract next page info from Link header
     */
    private extractNextPageInfo(linkHeader: string | null): string | null {
        if (!linkHeader) return null;

        const nextMatch = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
        return nextMatch ? nextMatch[1] : null;
    }
}
