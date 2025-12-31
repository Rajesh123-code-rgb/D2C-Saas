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
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { WalletService } from '../services/wallet.service';
import { BillingService } from '../services/billing.service';
import { SuperAdminGuard, RequireSuperAdminPermission } from '../guards/super-admin.guard';
import { SuperAdminUser } from '../entities/super-admin-user.entity';
import {
    AddCreditsDto,
    RefundCreditsDto,
    TransactionFilterDto,
    TransactionListResponseDto,
    CreateTopUpPackageDto,
    UpdateTopUpPackageDto,
    TopUpPackageResponseDto,
    CreatePricingDto,
    UpdatePricingDto,
    PricingResponseDto,
    RevenueStatsDto,
    WalletResponseDto,
} from '../dto/billing.dto';

@ApiTags('Admin - Billing & Credits')
@Controller('admin/billing')
@UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
@ApiBearerAuth()
export class BillingAdminController {
    constructor(
        private readonly walletService: WalletService,
        private readonly billingService: BillingService,
    ) { }

    // ==================== WALLET MANAGEMENT ====================

    @Get('wallets/:tenantId')
    @ApiOperation({ summary: 'Get wallet for a tenant' })
    @ApiResponse({ status: 200, description: 'Wallet details' })
    async getWallet(@Param('tenantId') tenantId: string): Promise<WalletResponseDto> {
        return this.walletService.getWallet(tenantId);
    }

    @Post('wallets/:tenantId/credits')
    @RequireSuperAdminPermission('canIssueCredits')
    @ApiOperation({ summary: 'Add credits to tenant wallet (admin)' })
    @ApiResponse({ status: 201, description: 'Credits added successfully' })
    async addCredits(
        @Param('tenantId') tenantId: string,
        @Body() addDto: Omit<AddCreditsDto, 'tenantId'>,
        @Req() req: Request,
    ) {
        const admin = req.admin as SuperAdminUser;
        return this.walletService.addCredits(
            { ...addDto, tenantId },
            admin,
        );
    }

    @Post('refund')
    @RequireSuperAdminPermission('canProcessRefunds')
    @ApiOperation({ summary: 'Process refund for a transaction' })
    @ApiResponse({ status: 201, description: 'Refund processed successfully' })
    async processRefund(
        @Body() refundDto: RefundCreditsDto,
        @Req() req: Request,
    ) {
        const admin = req.admin as SuperAdminUser;
        return this.walletService.refundCredits(refundDto, admin);
    }

    // ==================== TRANSACTIONS ====================

    @Get('transactions')
    @ApiOperation({ summary: 'Get all transactions (with filters)' })
    @ApiResponse({ status: 200, description: 'Transaction list' })
    async getTransactions(
        @Query() filter: TransactionFilterDto,
    ): Promise<TransactionListResponseDto> {
        return this.walletService.getTransactions(filter);
    }

    @Get('transactions/tenant/:tenantId')
    @ApiOperation({ summary: 'Get transactions for a specific tenant' })
    @ApiResponse({ status: 200, description: 'Tenant transaction list' })
    async getTenantTransactions(
        @Param('tenantId') tenantId: string,
        @Query() filter: Omit<TransactionFilterDto, 'tenantId'>,
    ): Promise<TransactionListResponseDto> {
        return this.walletService.getTransactions({ ...filter, tenantId });
    }

    // ==================== TOP-UP PACKAGES ====================

    @Get('packages')
    @ApiOperation({ summary: 'Get all top-up packages' })
    @ApiResponse({ status: 200, description: 'Package list' })
    async getAllPackages(): Promise<TopUpPackageResponseDto[]> {
        return this.billingService.getAllPackages();
    }

    @Get('packages/:id')
    @ApiOperation({ summary: 'Get single package' })
    @ApiResponse({ status: 200, description: 'Package details' })
    async getPackage(@Param('id') id: string): Promise<TopUpPackageResponseDto> {
        return this.billingService.getPackage(id);
    }

    @Post('packages')
    @RequireSuperAdminPermission('canManageTopUpPackages')
    @ApiOperation({ summary: 'Create top-up package' })
    @ApiResponse({ status: 201, description: 'Package created' })
    async createPackage(
        @Body() createDto: CreateTopUpPackageDto,
        @Req() req: Request,
    ): Promise<TopUpPackageResponseDto> {
        const admin = req.admin as SuperAdminUser;
        return this.billingService.createPackage(createDto, admin);
    }

    @Put('packages/:id')
    @RequireSuperAdminPermission('canManageTopUpPackages')
    @ApiOperation({ summary: 'Update top-up package' })
    @ApiResponse({ status: 200, description: 'Package updated' })
    async updatePackage(
        @Param('id') id: string,
        @Body() updateDto: UpdateTopUpPackageDto,
        @Req() req: Request,
    ): Promise<TopUpPackageResponseDto> {
        const admin = req.admin as SuperAdminUser;
        return this.billingService.updatePackage(id, updateDto, admin);
    }

    @Delete('packages/:id')
    @RequireSuperAdminPermission('canManageTopUpPackages')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete top-up package' })
    @ApiResponse({ status: 204, description: 'Package deleted' })
    async deletePackage(
        @Param('id') id: string,
        @Req() req: Request,
    ): Promise<void> {
        const admin = req.admin as SuperAdminUser;
        return this.billingService.deletePackage(id, admin);
    }

    // ==================== PRICING CONFIGURATION ====================

    @Get('pricing')
    @ApiOperation({ summary: 'Get all pricing configurations' })
    @ApiResponse({ status: 200, description: 'Pricing list' })
    async getAllPricing(): Promise<PricingResponseDto[]> {
        return this.billingService.getAllPricing();
    }

    @Get('pricing/grouped')
    @ApiOperation({ summary: 'Get pricing grouped by country' })
    @ApiResponse({ status: 200, description: 'Pricing grouped by country' })
    async getPricingByCountry(): Promise<Record<string, PricingResponseDto[]>> {
        return this.billingService.getPricingByCountry();
    }

    @Post('pricing')
    @RequireSuperAdminPermission('canManagePricing')
    @ApiOperation({ summary: 'Create pricing configuration' })
    @ApiResponse({ status: 201, description: 'Pricing created' })
    async createPricing(
        @Body() createDto: CreatePricingDto,
        @Req() req: Request,
    ): Promise<PricingResponseDto> {
        const admin = req.admin as SuperAdminUser;
        return this.billingService.createPricing(createDto, admin);
    }

    @Put('pricing/:id')
    @RequireSuperAdminPermission('canManagePricing')
    @ApiOperation({ summary: 'Update pricing configuration' })
    @ApiResponse({ status: 200, description: 'Pricing updated' })
    async updatePricing(
        @Param('id') id: string,
        @Body() updateDto: UpdatePricingDto,
        @Req() req: Request,
    ): Promise<PricingResponseDto> {
        const admin = req.admin as SuperAdminUser;
        return this.billingService.updatePricing(id, updateDto, admin);
    }

    // ==================== REVENUE ANALYTICS ====================

    @Get('revenue')
    @ApiOperation({ summary: 'Get revenue statistics' })
    @ApiQuery({ name: 'period', enum: ['today', 'week', 'month', 'year'], required: false })
    @ApiResponse({ status: 200, description: 'Revenue stats' })
    async getRevenueStats(
        @Query('period') period: string = 'month',
    ): Promise<RevenueStatsDto> {
        return this.billingService.getRevenueStats(period);
    }

    @Get('usage/:tenantId')
    @ApiOperation({ summary: 'Get usage stats for a tenant' })
    @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year'], required: false })
    @ApiResponse({ status: 200, description: 'Usage stats' })
    async getUsageStats(
        @Param('tenantId') tenantId: string,
        @Query('period') period: string = 'month',
    ) {
        return this.walletService.getUsageStats(tenantId, period);
    }
}

/**
 * Public billing controller (for tenant users)
 */
@ApiTags('Billing - User')
@Controller('billing')
export class BillingUserController {
    constructor(
        private readonly walletService: WalletService,
        private readonly billingService: BillingService,
    ) { }

    @Get('packages')
    @ApiOperation({ summary: 'Get available top-up packages' })
    @ApiResponse({ status: 200, description: 'Active packages' })
    async getActivePackages(): Promise<TopUpPackageResponseDto[]> {
        return this.billingService.getActivePackages();
    }

    @Get('wallet/:tenantId')
    @ApiOperation({ summary: 'Get wallet balance' })
    @ApiResponse({ status: 200, description: 'Wallet details' })
    async getWallet(@Param('tenantId') tenantId: string): Promise<WalletResponseDto> {
        return this.walletService.getWallet(tenantId);
    }

    @Put('wallet/:tenantId/settings')
    @ApiOperation({ summary: 'Update wallet settings (auto-recharge, etc.)' })
    @ApiResponse({ status: 200, description: 'Settings updated' })
    async updateWalletSettings(
        @Param('tenantId') tenantId: string,
        @Body() updateDto: any,
    ): Promise<WalletResponseDto> {
        return this.walletService.updateWalletSettings(tenantId, updateDto);
    }

    @Post('purchase')
    @ApiOperation({ summary: 'Purchase message credits' })
    @ApiResponse({ status: 201, description: 'Credits purchased' })
    async purchaseCredits(@Body() purchaseDto: any) {
        return this.billingService.purchaseCredits(purchaseDto);
    }

    @Get('transactions/:tenantId')
    @ApiOperation({ summary: 'Get transaction history' })
    @ApiResponse({ status: 200, description: 'Transaction list' })
    async getTransactions(
        @Param('tenantId') tenantId: string,
        @Query() filter: any,
    ): Promise<TransactionListResponseDto> {
        return this.walletService.getTransactions({ ...filter, tenantId });
    }

    @Get('usage/:tenantId')
    @ApiOperation({ summary: 'Get usage statistics' })
    @ApiQuery({ name: 'period', enum: ['day', 'week', 'month'], required: false })
    @ApiResponse({ status: 200, description: 'Usage stats' })
    async getUsageStats(
        @Param('tenantId') tenantId: string,
        @Query('period') period: string = 'month',
    ) {
        return this.walletService.getUsageStats(tenantId, period);
    }
}
