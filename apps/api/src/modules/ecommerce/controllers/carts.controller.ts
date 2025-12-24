import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CartsService } from '../services/carts.service';
import { CartRecoveryStatus } from '../entities/cart.entity';

@ApiTags('Abandoned Carts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ecommerce/carts')
export class CartsController {
    constructor(private readonly cartsService: CartsService) { }

    @Get('abandoned')
    @ApiOperation({ summary: 'List abandoned carts' })
    @ApiQuery({ name: 'storeId', required: false })
    @ApiQuery({ name: 'status', required: false, enum: CartRecoveryStatus })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async findAll(
        @CurrentUser() user: any,
        @Query('storeId') storeId?: string,
        @Query('status') status?: CartRecoveryStatus,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.cartsService.findAll(user.tenantId, {
            storeId,
            status,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20,
        });
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get cart recovery statistics' })
    @ApiQuery({ name: 'storeId', required: false })
    async getStats(
        @CurrentUser() user: any,
        @Query('storeId') storeId?: string,
    ) {
        return this.cartsService.getStats(user.tenantId, storeId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get abandoned cart by ID' })
    async findById(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.cartsService.findById(user.tenantId, id);
    }

    @Post(':id/remind')
    @ApiOperation({ summary: 'Send recovery reminder' })
    async sendReminder(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        // TODO: Trigger reminder automation
        const cart = await this.cartsService.recordReminderSent(id);
        return { success: true, reminderCount: cart.reminderCount };
    }

    @Post(':id/recover')
    @ApiOperation({ summary: 'Mark cart as recovered' })
    async markRecovered(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Query('orderId') orderId: string,
    ) {
        return this.cartsService.markRecovered(id, orderId);
    }
}
