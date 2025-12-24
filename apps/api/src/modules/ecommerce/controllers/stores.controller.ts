import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { StoresService, ConnectStoreDto } from '../services/stores.service';
import { WooCommerceService } from '../services/woocommerce.service';
import { EcommercePlatform } from '../entities/store.entity';

@ApiTags('E-commerce Stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ecommerce/stores')
export class StoresController {
    constructor(
        private readonly storesService: StoresService,
        private readonly wooCommerceService: WooCommerceService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Connect a new e-commerce store' })
    async connect(
        @CurrentUser() user: any,
        @Body() dto: ConnectStoreDto,
    ) {
        // Connect the store
        const store = await this.storesService.connectStore(user.tenantId, dto);

        // Auto-sync for WooCommerce stores
        if (dto.platform === EcommercePlatform.WOOCOMMERCE || dto.platform === ('woocommerce' as any)) {
            const syncResult = await this.wooCommerceService.syncStore(store.id);
            return {
                ...store,
                syncResult,
            };
        }

        return store;
    }

    @Get()
    @ApiOperation({ summary: 'List all connected stores' })
    async findAll(@CurrentUser() user: any) {
        return this.storesService.findAll(user.tenantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get store by ID' })
    async findById(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.storesService.findById(user.tenantId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update store settings' })
    async update(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() updates: Partial<ConnectStoreDto>,
    ) {
        return this.storesService.updateStore(user.tenantId, id, updates);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Disconnect a store' })
    async disconnect(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        await this.storesService.disconnect(user.tenantId, id);
        return { success: true };
    }

    @Post(':id/sync')
    @ApiOperation({ summary: 'Force sync with store' })
    async sync(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        // Get the store to check platform
        const store = await this.storesService.findById(user.tenantId, id);

        if (store.platform === EcommercePlatform.WOOCOMMERCE) {
            const result = await this.wooCommerceService.syncStore(id);
            return {
                success: result.success,
                productsCount: result.productsCount,
                ordersCount: result.ordersCount,
                message: result.success ? 'Sync completed successfully' : result.error,
                lastSyncAt: new Date().toISOString(),
            };
        }

        // For other platforms, just update timestamp for now
        await this.storesService.updateSyncTimestamp(id);
        return { success: true, message: 'Sync initiated' };
    }

    @Get(':id/products')
    @ApiOperation({ summary: 'Get products from WooCommerce store' })
    async getProducts(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Query('limit') limit: number = 100,
    ) {
        // Verify ownership
        await this.storesService.findById(user.tenantId, id);
        return this.wooCommerceService.getProducts(id, limit);
    }

    @Get(':id/orders')
    @ApiOperation({ summary: 'Get recent orders from WooCommerce store' })
    async getOrders(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Query('limit') limit: number = 10,
    ) {
        // Verify ownership
        await this.storesService.findById(user.tenantId, id);
        return this.wooCommerceService.getRecentOrders(id, limit);
    }

    @Get(':id/abandoned-carts')
    @ApiOperation({ summary: 'Get abandoned carts (pending/failed orders) from WooCommerce store' })
    async getAbandonedCarts(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Query('limit') limit: number = 100,
    ) {
        // Verify ownership
        await this.storesService.findById(user.tenantId, id);
        return this.wooCommerceService.getAbandonedCarts(id, limit);
    }
}

