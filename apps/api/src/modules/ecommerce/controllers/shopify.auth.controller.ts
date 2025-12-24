import {
    Controller,
    Get,
    Query,
    Res,
    Logger,
    BadRequestException,
    UseGuards,
    Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import * as crypto from 'crypto';
import { ShopifyService } from '../services/shopify.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

// Store OAuth states temporarily (in production, use Redis)
const oauthStates = new Map<string, { tenantId: string; timestamp: number }>();

// Clean up old states every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [state, data] of oauthStates) {
        if (now - data.timestamp > 10 * 60 * 1000) { // 10 minutes expiry
            oauthStates.delete(state);
        }
    }
}, 10 * 60 * 1000);

@ApiTags('Shopify OAuth')
@Controller('shopify/auth')
export class ShopifyAuthController {
    private readonly logger = new Logger(ShopifyAuthController.name);

    constructor(private readonly shopifyService: ShopifyService) { }

    /**
     * Initiate OAuth flow - redirects to Shopify authorization page
     */
    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Initiate Shopify OAuth flow' })
    @ApiQuery({ name: 'shop', required: true, description: 'Shopify shop domain (e.g., mystore.myshopify.com)' })
    async initiateOAuth(
        @Query('shop') shop: string,
        @CurrentUser() user: any,
        @Res() res: Response,
    ): Promise<void> {
        if (!shop) {
            throw new BadRequestException('Shop domain is required');
        }

        // Generate state for CSRF protection
        const state = crypto.randomBytes(16).toString('hex');

        // Store state with tenant ID for callback
        oauthStates.set(state, {
            tenantId: user.tenantId,
            timestamp: Date.now(),
        });

        // Generate authorization URL
        const authUrl = this.shopifyService.getAuthorizationUrl(shop, state);

        this.logger.log(`Initiating OAuth for shop: ${shop}, tenant: ${user.tenantId}`);

        // Redirect to Shopify
        res.redirect(authUrl);
    }

    /**
     * OAuth callback handler - receives authorization code from Shopify
     */
    @Get('callback')
    @ApiOperation({ summary: 'Shopify OAuth callback' })
    async handleCallback(
        @Query() query: Record<string, string>,
        @Res() res: Response,
    ): Promise<void> {
        const { shop, code, state, hmac } = query;

        this.logger.log(`Received OAuth callback for shop: ${shop}`);

        // Validate required parameters
        if (!shop || !code || !state) {
            this.logger.warn('Missing required OAuth parameters');
            return this.redirectWithError(res, 'Missing required parameters');
        }

        // Validate state (CSRF protection)
        const stateData = oauthStates.get(state);
        if (!stateData) {
            this.logger.warn('Invalid or expired OAuth state');
            return this.redirectWithError(res, 'Invalid or expired OAuth session');
        }

        // Remove used state
        oauthStates.delete(state);

        // Validate HMAC signature
        try {
            const isValid = this.shopifyService.validateHmac(query);
            if (!isValid) {
                this.logger.warn('Invalid HMAC signature');
                return this.redirectWithError(res, 'Invalid signature');
            }
        } catch (error) {
            const err = error as Error;
            this.logger.error(`HMAC validation error: ${err.message}`);
            return this.redirectWithError(res, 'Signature validation failed');
        }

        try {
            // Exchange code for access token
            const tokenResponse = await this.shopifyService.exchangeCodeForToken(shop, code);

            // Connect the store
            const store = await this.shopifyService.connectStoreWithOAuth(
                stateData.tenantId,
                shop,
                tokenResponse.access_token,
                tokenResponse.scope,
            );

            this.logger.log(`Successfully connected Shopify store: ${store.storeName}`);

            // Redirect to success page
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/settings/stores?connected=shopify&store=${store.id}`);
        } catch (error) {
            const err = error as Error;
            this.logger.error(`OAuth callback error: ${err.message}`);
            return this.redirectWithError(res, 'Failed to complete OAuth');
        }
    }

    /**
     * Get OAuth URL without redirect (for frontend integration)
     */
    @Get('url')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get Shopify OAuth URL' })
    @ApiQuery({ name: 'shop', required: true })
    async getOAuthUrl(
        @Query('shop') shop: string,
        @CurrentUser() user: any,
    ): Promise<{ url: string; state: string }> {
        if (!shop) {
            throw new BadRequestException('Shop domain is required');
        }

        const state = crypto.randomBytes(16).toString('hex');

        oauthStates.set(state, {
            tenantId: user.tenantId,
            timestamp: Date.now(),
        });

        const url = this.shopifyService.getAuthorizationUrl(shop, state);

        return { url, state };
    }

    /**
     * Sync store data after connection
     */
    @Get(':storeId/sync')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Sync Shopify store data' })
    async syncStore(
        @Param('storeId') storeId: string,
        @CurrentUser() user: any,
    ): Promise<{ products: number; orders: number }> {
        this.logger.log(`Starting sync for store: ${storeId}`);

        const [productsResult, ordersResult] = await Promise.all([
            this.shopifyService.syncProducts(storeId),
            this.shopifyService.syncOrders(storeId),
        ]);

        return {
            products: productsResult.count,
            orders: ordersResult.count,
        };
    }

    /**
     * Helper to redirect with error message
     */
    private redirectWithError(res: Response, message: string): void {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/settings/stores?error=${encodeURIComponent(message)}`);
    }
}
