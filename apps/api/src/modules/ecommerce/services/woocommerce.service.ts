import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EcommerceStore } from '../entities/store.entity';

export interface WooCommerceProduct {
    id: number;
    name: string;
    sku: string;
    price: string;
    stock_status: string;
    stock_quantity: number | null;
}

export interface WooCommerceOrder {
    id: number;
    status: string;
    total: string;
    date_created: string;
    customer_id: number;
}

export interface WooCommerceSyncResult {
    success: boolean;
    productsCount: number;
    ordersCount: number;
    error?: string;
}

@Injectable()
export class WooCommerceService {
    private readonly logger = new Logger(WooCommerceService.name);

    constructor(
        @InjectRepository(EcommerceStore)
        private readonly storeRepository: Repository<EcommerceStore>,
    ) { }

    /**
     * Generate WooCommerce API authentication header
     */
    private getAuthHeader(consumerKey: string, consumerSecret: string): string {
        const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        return `Basic ${credentials}`;
    }

    /**
     * Make authenticated request to WooCommerce REST API
     */
    private async makeRequest<T>(
        storeUrl: string,
        endpoint: string,
        consumerKey: string,
        consumerSecret: string,
    ): Promise<T> {
        const url = `${storeUrl}/wp-json/wc/v3/${endpoint}`;

        this.logger.debug(`Making WooCommerce API request: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': this.getAuthHeader(consumerKey, consumerSecret),
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(`WooCommerce API error: ${response.status} - ${errorText}`);
            throw new Error(`WooCommerce API error: ${response.status} - ${response.statusText}`);
        }

        return response.json() as Promise<T>;
    }

    /**
     * Get total count from WooCommerce API response headers
     */
    private async getCount(
        storeUrl: string,
        endpoint: string,
        consumerKey: string,
        consumerSecret: string,
    ): Promise<number> {
        const url = `${storeUrl}/wp-json/wc/v3/${endpoint}?per_page=1`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': this.getAuthHeader(consumerKey, consumerSecret),
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            this.logger.error(`WooCommerce count API error: ${response.status}`);
            return 0;
        }

        // WooCommerce returns total count in header
        const totalCount = response.headers.get('X-WP-Total');
        return totalCount ? parseInt(totalCount, 10) : 0;
    }

    /**
     * Sync store data from WooCommerce API
     */
    async syncStore(storeId: string): Promise<WooCommerceSyncResult> {
        const store = await this.storeRepository.findOne({ where: { id: storeId } });

        if (!store) {
            return { success: false, productsCount: 0, ordersCount: 0, error: 'Store not found' };
        }

        if (!store.apiKey || !store.apiSecret) {
            return { success: false, productsCount: 0, ordersCount: 0, error: 'Missing API credentials' };
        }

        try {
            this.logger.log(`Syncing WooCommerce store: ${store.storeName}`);

            // Fetch product count
            const productsCount = await this.getCount(
                store.storeUrl,
                'products',
                store.apiKey,
                store.apiSecret,
            );

            // Fetch order count
            const ordersCount = await this.getCount(
                store.storeUrl,
                'orders',
                store.apiKey,
                store.apiSecret,
            );

            // Update store with counts
            await this.storeRepository.update(storeId, {
                productsCount,
                ordersCount,
                lastSyncAt: new Date(),
            });

            this.logger.log(`✅ Sync complete: ${productsCount} products, ${ordersCount} orders`);

            return {
                success: true,
                productsCount,
                ordersCount,
            };
        } catch (error: any) {
            this.logger.error(`Sync failed for ${store.storeName}: ${error.message}`);
            return {
                success: false,
                productsCount: 0,
                ordersCount: 0,
                error: error.message,
            };
        }
    }

    /**
     * Test WooCommerce connection
     */
    async testConnection(
        storeUrl: string,
        consumerKey: string,
        consumerSecret: string,
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Try to fetch system status - this validates credentials
            await this.makeRequest(
                storeUrl,
                'system_status',
                consumerKey,
                consumerSecret,
            );
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Fetch recent orders from WooCommerce
     */
    async getRecentOrders(storeId: string, limit: number = 10): Promise<WooCommerceOrder[]> {
        const store = await this.storeRepository.findOne({ where: { id: storeId } });

        if (!store || !store.apiKey || !store.apiSecret) {
            return [];
        }

        try {
            return await this.makeRequest<WooCommerceOrder[]>(
                store.storeUrl,
                `orders?per_page=${limit}&orderby=date&order=desc`,
                store.apiKey,
                store.apiSecret,
            );
        } catch (error) {
            this.logger.error(`Failed to fetch orders: ${error}`);
            return [];
        }
    }

    /**
     * Fetch products from WooCommerce
     */
    async getProducts(storeId: string, limit: number = 100): Promise<WooCommerceProduct[]> {
        const store = await this.storeRepository.findOne({ where: { id: storeId } });

        if (!store || !store.apiKey || !store.apiSecret) {
            return [];
        }

        try {
            return await this.makeRequest<WooCommerceProduct[]>(
                store.storeUrl,
                `products?per_page=${limit}`,
                store.apiKey,
                store.apiSecret,
            );
        } catch (error) {
            this.logger.error(`Failed to fetch products: ${error}`);
            return [];
        }
    }

    /**
     * Fetch abandoned carts (pending, on-hold, failed, checkout-draft orders)
     * These represent orders that were started but not completed
     */
    async getAbandonedCarts(storeId: string, limit: number = 100): Promise<any[]> {
        const store = await this.storeRepository.findOne({ where: { id: storeId } });

        if (!store || !store.apiKey || !store.apiSecret) {
            return [];
        }

        try {
            // Fetch orders with statuses that indicate abandonment
            const statuses = ['pending', 'on-hold', 'failed', 'checkout-draft'];
            const allAbandonedOrders: any[] = [];

            for (const status of statuses) {
                try {
                    const orders = await this.makeRequest<any[]>(
                        store.storeUrl,
                        `orders?status=${status}&per_page=${limit}&orderby=date&order=desc`,
                        store.apiKey,
                        store.apiSecret,
                    );
                    allAbandonedOrders.push(...orders);
                } catch (e) {
                    this.logger.warn(`Could not fetch ${status} orders: ${e}`);
                }
            }

            // Sort by date descending
            allAbandonedOrders.sort((a, b) =>
                new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
            );

            return allAbandonedOrders;
        } catch (error) {
            this.logger.error(`Failed to fetch abandoned carts: ${error}`);
            return [];
        }
    }
}

