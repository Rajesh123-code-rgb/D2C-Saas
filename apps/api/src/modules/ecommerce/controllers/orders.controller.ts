import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Query,
    UseGuards,
    Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { OrdersService } from '../services/orders.service';
import { OrderStatus } from '../entities/order.entity';

@ApiTags('E-commerce Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ecommerce/orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get()
    @ApiOperation({ summary: 'List all orders' })
    @ApiQuery({ name: 'storeId', required: false })
    @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async findAll(
        @CurrentUser() user: any,
        @Query('storeId') storeId?: string,
        @Query('status') status?: OrderStatus,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.ordersService.findAll(user.tenantId, {
            storeId,
            status,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20,
        });
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get order statistics' })
    @ApiQuery({ name: 'storeId', required: false })
    async getStats(
        @CurrentUser() user: any,
        @Query('storeId') storeId?: string,
    ) {
        return this.ordersService.getStats(user.tenantId, storeId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order by ID' })
    async findById(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.ordersService.findById(user.tenantId, id);
    }

    @Put(':id/status')
    @ApiOperation({ summary: 'Update order status' })
    async updateStatus(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() body: { status: OrderStatus },
    ) {
        return this.ordersService.updateOrderStatus(user.tenantId, id, body.status);
    }

    @Put(':id/shipping')
    @ApiOperation({ summary: 'Update shipping information' })
    async updateShipping(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() body: {
            trackingNumber: string;
            carrier: string;
            trackingUrl?: string;
        },
    ) {
        return this.ordersService.updateShipping(
            user.tenantId,
            id,
            body.trackingNumber,
            body.carrier,
            body.trackingUrl,
        );
    }

    @Get('contact/:contactId')
    @ApiOperation({ summary: 'Get orders for a contact' })
    async getContactOrders(
        @CurrentUser() user: any,
        @Param('contactId') contactId: string,
    ) {
        return this.ordersService.getContactOrders(user.tenantId, contactId);
    }
}
