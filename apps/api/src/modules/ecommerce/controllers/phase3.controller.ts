import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ShipmentsService, CreateShipmentDto } from '../services/shipments.service';
import { CustomerHealthService } from '../services/customer-health.service';
import { RecommendationsService } from '../services/recommendations.service';
import { CarrierType, ShipmentStatus } from '../entities/shipment.entity';

@ApiTags('Shipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ecommerce/shipments')
export class ShipmentsController {
    constructor(private readonly shipmentsService: ShipmentsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a shipment' })
    async createShipment(
        @CurrentUser() user: any,
        @Body() dto: CreateShipmentDto,
    ) {
        return this.shipmentsService.createShipment(user.tenantId, dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get shipment by ID' })
    async getShipment(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.shipmentsService.getShipment(user.tenantId, id);
    }

    @Get('order/:orderId')
    @ApiOperation({ summary: 'Get shipments for an order' })
    async getOrderShipments(
        @CurrentUser() user: any,
        @Param('orderId') orderId: string,
    ) {
        return this.shipmentsService.getOrderShipments(user.tenantId, orderId);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get shipment statistics' })
    async getStats(@CurrentUser() user: any) {
        return this.shipmentsService.getShipmentStats(user.tenantId);
    }
}

@ApiTags('Carriers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ecommerce/carriers')
export class CarriersController {
    constructor(private readonly shipmentsService: ShipmentsService) { }

    @Post()
    @ApiOperation({ summary: 'Connect a carrier' })
    async connectCarrier(
        @CurrentUser() user: any,
        @Body() body: {
            carrier: CarrierType;
            name: string;
            apiKey?: string;
            apiSecret?: string;
            accountId?: string;
        },
    ) {
        return this.shipmentsService.connectCarrier(user.tenantId, body);
    }

    @Get()
    @ApiOperation({ summary: 'List connected carriers' })
    async getCarriers(@CurrentUser() user: any) {
        return this.shipmentsService.getCarriers(user.tenantId);
    }

    @Post(':id/default')
    @ApiOperation({ summary: 'Set default carrier' })
    async setDefault(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        await this.shipmentsService.setDefaultCarrier(user.tenantId, id);
        return { success: true };
    }
}

@ApiTags('Customer Health')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ecommerce/health')
export class CustomerHealthController {
    constructor(private readonly healthService: CustomerHealthService) { }

    @Get('contact/:contactId')
    @ApiOperation({ summary: 'Get customer health score' })
    async getHealthScore(
        @CurrentUser() user: any,
        @Param('contactId') contactId: string,
    ) {
        return this.healthService.calculateHealthScore(user.tenantId, contactId);
    }

    @Get('win-back')
    @ApiOperation({ summary: 'Get win-back eligible customers' })
    async getWinBackCandidates(
        @CurrentUser() user: any,
        @Query('tier') tier?: '30_day' | '60_day' | '90_day' | '120_day',
    ) {
        return this.healthService.getWinBackCandidates(user.tenantId, tier);
    }

    @Get('at-risk')
    @ApiOperation({ summary: 'Get at-risk customers' })
    async getAtRiskCustomers(@CurrentUser() user: any) {
        return this.healthService.getAtRiskCustomers(user.tenantId);
    }

    @Get('cod-risky')
    @ApiOperation({ summary: 'Get COD risky customers' })
    async getCODRiskyCustomers(
        @CurrentUser() user: any,
        @Query('maxScore') maxScore?: number,
    ) {
        return this.healthService.getCODRiskyCustomers(user.tenantId, maxScore || 40);
    }
}

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ecommerce/recommendations')
export class RecommendationsController {
    constructor(private readonly recommendationsService: RecommendationsService) { }

    @Get('upsell/:productId')
    @ApiOperation({ summary: 'Get upsell recommendations' })
    async getUpsells(
        @CurrentUser() user: any,
        @Param('productId') productId: string,
        @Query('limit') limit?: number,
    ) {
        return this.recommendationsService.getUpsells(user.tenantId, productId, limit || 4);
    }

    @Post('cross-sell')
    @ApiOperation({ summary: 'Get cross-sell recommendations for order' })
    async getCrossSells(
        @CurrentUser() user: any,
        @Body() body: { items: Array<{ productId: string; category?: string }> },
        @Query('limit') limit?: number,
    ) {
        return this.recommendationsService.getCrossSells(user.tenantId, body.items, limit || 4);
    }

    @Get('frequently-bought/:productId')
    @ApiOperation({ summary: 'Get frequently bought together' })
    async getFrequentlyBoughtTogether(
        @CurrentUser() user: any,
        @Param('productId') productId: string,
    ) {
        return this.recommendationsService.getFrequentlyBoughtTogether(user.tenantId, productId);
    }

    @Post(':id/impression')
    @ApiOperation({ summary: 'Track recommendation impression' })
    async trackImpression(@Param('id') id: string) {
        await this.recommendationsService.trackImpression(id);
        return { success: true };
    }

    @Post(':id/click')
    @ApiOperation({ summary: 'Track recommendation click' })
    async trackClick(@Param('id') id: string) {
        await this.recommendationsService.trackClick(id);
        return { success: true };
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get recommendation stats' })
    async getStats(@CurrentUser() user: any) {
        return this.recommendationsService.getRecommendationStats(user.tenantId);
    }

    @Get('reorder/due')
    @ApiOperation({ summary: 'Get due reorder reminders' })
    async getDueReminders(@CurrentUser() user: any) {
        return this.recommendationsService.getDueReminders(user.tenantId);
    }

    @Get('reorder/contact/:contactId')
    @ApiOperation({ summary: 'Get reminders for contact' })
    async getContactReminders(
        @CurrentUser() user: any,
        @Param('contactId') contactId: string,
    ) {
        return this.recommendationsService.getContactReminders(user.tenantId, contactId);
    }

    @Post('reorder/:id/snooze')
    @ApiOperation({ summary: 'Snooze a reorder reminder' })
    async snoozeReminder(
        @Param('id') id: string,
        @Body() body: { days: number },
    ) {
        await this.recommendationsService.snoozeReminder(id, body.days);
        return { success: true };
    }
}
