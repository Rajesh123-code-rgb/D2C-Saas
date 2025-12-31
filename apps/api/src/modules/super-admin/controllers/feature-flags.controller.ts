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
import { FeatureFlagsService } from '../services/feature-flags.service';
import { SuperAdminGuard, RequireSuperAdminPermission } from '../guards/super-admin.guard';
import { SuperAdminUser } from '../entities/super-admin-user.entity';
import {
    CreateFeatureFlagDto,
    UpdateFeatureFlagDto,
    ToggleFeatureFlagDto,
    CheckFeatureDto,
    BulkFeatureCheckDto,
    FeatureFlagResponseDto,
    FeatureCheckResponseDto,
    BulkFeatureCheckResponseDto,
} from '../dto/feature-flag.dto';

@ApiTags('Admin - Feature Flags')
@Controller('admin/features')
@UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
@ApiBearerAuth()
export class FeatureFlagsController {
    constructor(private readonly featureFlagsService: FeatureFlagsService) { }

    @Post()
    @RequireSuperAdminPermission('canManageFeatureFlags')
    @ApiOperation({ summary: 'Create a new feature flag' })
    @ApiResponse({ status: 201, description: 'Feature flag created successfully' })
    @ApiResponse({ status: 409, description: 'Feature flag with this key already exists' })
    async create(
        @Body() createDto: CreateFeatureFlagDto,
        @Req() req: Request,
    ): Promise<FeatureFlagResponseDto> {
        const admin = req.admin as SuperAdminUser;
        return this.featureFlagsService.create(createDto, admin);
    }

    @Get()
    @ApiOperation({ summary: 'Get all feature flags' })
    @ApiResponse({ status: 200, description: 'List of all feature flags' })
    async findAll(): Promise<FeatureFlagResponseDto[]> {
        return this.featureFlagsService.findAll();
    }

    @Get('grouped')
    @ApiOperation({ summary: 'Get all feature flags grouped by category' })
    @ApiResponse({ status: 200, description: 'Feature flags grouped by category' })
    async findAllGrouped(): Promise<Record<string, FeatureFlagResponseDto[]>> {
        return this.featureFlagsService.findAllGrouped();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a feature flag by ID' })
    @ApiResponse({ status: 200, description: 'Feature flag details' })
    @ApiResponse({ status: 404, description: 'Feature flag not found' })
    async findOne(@Param('id') id: string): Promise<FeatureFlagResponseDto> {
        return this.featureFlagsService.findOne(id);
    }

    @Put(':id')
    @RequireSuperAdminPermission('canManageFeatureFlags')
    @ApiOperation({ summary: 'Update a feature flag' })
    @ApiResponse({ status: 200, description: 'Feature flag updated successfully' })
    @ApiResponse({ status: 404, description: 'Feature flag not found' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateFeatureFlagDto,
        @Req() req: Request,
    ): Promise<FeatureFlagResponseDto> {
        const admin = req.admin as SuperAdminUser;
        return this.featureFlagsService.update(id, updateDto, admin);
    }

    @Put(':id/toggle')
    @RequireSuperAdminPermission('canManageFeatureFlags')
    @ApiOperation({ summary: 'Toggle a feature flag on/off' })
    @ApiResponse({ status: 200, description: 'Feature flag toggled successfully' })
    @ApiResponse({ status: 404, description: 'Feature flag not found' })
    async toggle(
        @Param('id') id: string,
        @Body() toggleDto: ToggleFeatureFlagDto,
        @Req() req: Request,
    ): Promise<FeatureFlagResponseDto> {
        const admin = req.admin as SuperAdminUser;
        return this.featureFlagsService.toggle(id, toggleDto.isActive, admin);
    }

    @Delete(':id')
    @RequireSuperAdminPermission('canManageFeatureFlags')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a feature flag' })
    @ApiResponse({ status: 204, description: 'Feature flag deleted successfully' })
    @ApiResponse({ status: 404, description: 'Feature flag not found' })
    async remove(
        @Param('id') id: string,
        @Req() req: Request,
    ): Promise<void> {
        const admin = req.admin as SuperAdminUser;
        return this.featureFlagsService.remove(id, admin);
    }
}

/**
 * Public controller for tenant feature checks (no admin auth required)
 * This is used by the tenant-facing API to check feature access
 */
@ApiTags('Feature Flags - Public')
@Controller('features')
export class FeatureFlagsPublicController {
    constructor(private readonly featureFlagsService: FeatureFlagsService) { }

    @Post('check')
    @ApiOperation({ summary: 'Check if a feature is enabled for a tenant' })
    @ApiResponse({ status: 200, description: 'Feature check result' })
    async checkFeature(
        @Body() checkDto: CheckFeatureDto,
    ): Promise<FeatureCheckResponseDto> {
        return this.featureFlagsService.isFeatureEnabled(
            checkDto.featureKey,
            checkDto.tenantId,
            checkDto.tenantPlan,
        );
    }

    @Post('check/bulk')
    @ApiOperation({ summary: 'Check multiple features at once' })
    @ApiResponse({ status: 200, description: 'Bulk feature check results' })
    async checkBulkFeatures(
        @Body() bulkDto: BulkFeatureCheckDto,
    ): Promise<BulkFeatureCheckResponseDto> {
        const features = await this.featureFlagsService.checkMultipleFeatures(
            bulkDto.tenantId,
            bulkDto.tenantPlan,
            bulkDto.featureKeys,
        );
        return { features };
    }

    @Get('tenant/:tenantId')
    @ApiOperation({ summary: 'Get all feature flags for a tenant' })
    @ApiQuery({ name: 'plan', required: true, description: 'Tenant subscription plan' })
    @ApiResponse({ status: 200, description: 'All features for tenant' })
    async getAllForTenant(
        @Param('tenantId') tenantId: string,
        @Query('plan') plan: string,
    ): Promise<Record<string, boolean>> {
        return this.featureFlagsService.getAllFeaturesForTenant(tenantId, plan);
    }
}
