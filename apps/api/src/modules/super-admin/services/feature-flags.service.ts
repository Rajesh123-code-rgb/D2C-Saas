import { Injectable, NotFoundException, ConflictException, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { FeatureFlag, FeatureFlagType, PlanOverrides } from '../entities/feature-flag.entity';
import { AdminAuditLog, AdminAuditAction } from '../entities/admin-audit-log.entity';
import { SuperAdminUser } from '../entities/super-admin-user.entity';
import {
    CreateFeatureFlagDto,
    UpdateFeatureFlagDto,
    FeatureFlagResponseDto,
    FeatureCheckResponseDto,
} from '../dto/feature-flag.dto';

const CACHE_PREFIX = 'feature_flag:';
const CACHE_TTL = 300; // 5 minutes in seconds
const ALL_FLAGS_CACHE_KEY = 'feature_flags:all';

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
    private readonly logger = new Logger(FeatureFlagsService.name);
    private localCache: Map<string, FeatureFlag> = new Map();

    constructor(
        @InjectRepository(FeatureFlag)
        private featureFlagRepository: Repository<FeatureFlag>,
        @InjectRepository(AdminAuditLog)
        private auditLogRepository: Repository<AdminAuditLog>,
        @Inject(CACHE_MANAGER)
        private cacheManager: Cache,
    ) { }

    async onModuleInit(): Promise<void> {
        // Warm up cache on startup
        await this.warmUpCache();
    }

    /**
     * Create a new feature flag
     */
    async create(
        createDto: CreateFeatureFlagDto,
        admin: SuperAdminUser,
    ): Promise<FeatureFlagResponseDto> {
        // Check if key already exists
        const existing = await this.featureFlagRepository.findOne({
            where: { key: createDto.key },
        });

        if (existing) {
            throw new ConflictException(`Feature flag with key '${createDto.key}' already exists`);
        }

        const flag = this.featureFlagRepository.create({
            ...createDto,
            type: createDto.type || FeatureFlagType.BOOLEAN,
            defaultValue: createDto.defaultValue ?? false,
            rolloutPercentage: createDto.rolloutPercentage ?? 0,
            isActive: createDto.isActive ?? true,
            createdById: admin.id,
            updatedById: admin.id,
        });

        await this.featureFlagRepository.save(flag);

        // Invalidate cache
        await this.invalidateCache(flag.key);

        // Log audit
        await this.createAuditLog({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.fullName,
            action: AdminAuditAction.CREATE,
            resourceType: 'feature_flag',
            resourceId: flag.id,
            resourceName: flag.key,
            newValues: createDto,
            description: `Created feature flag: ${flag.key}`,
            success: true,
        });

        this.logger.log(`Feature flag created: ${flag.key} by ${admin.email}`);
        return this.toResponseDto(flag);
    }

    /**
     * Get all feature flags
     */
    async findAll(): Promise<FeatureFlagResponseDto[]> {
        const flags = await this.featureFlagRepository.find({
            order: { category: 'ASC', key: 'ASC' },
        });
        return flags.map(flag => this.toResponseDto(flag));
    }

    /**
     * Get feature flags grouped by category
     */
    async findAllGrouped(): Promise<Record<string, FeatureFlagResponseDto[]>> {
        const flags = await this.findAll();
        const grouped: Record<string, FeatureFlagResponseDto[]> = {};

        for (const flag of flags) {
            const category = flag.category || 'general';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(flag);
        }

        return grouped;
    }

    /**
     * Get a single feature flag by ID
     */
    async findOne(id: string): Promise<FeatureFlagResponseDto> {
        const flag = await this.featureFlagRepository.findOne({
            where: { id },
        });

        if (!flag) {
            throw new NotFoundException(`Feature flag with ID '${id}' not found`);
        }

        return this.toResponseDto(flag);
    }

    /**
     * Get a feature flag by key
     */
    async findByKey(key: string): Promise<FeatureFlag | null> {
        // Try local cache first
        if (this.localCache.has(key)) {
            return this.localCache.get(key)!;
        }

        // Try Redis cache
        const cached = await this.cacheManager.get<FeatureFlag>(`${CACHE_PREFIX}${key}`);
        if (cached) {
            this.localCache.set(key, cached);
            return cached;
        }

        // Fetch from database
        const flag = await this.featureFlagRepository.findOne({
            where: { key },
        });

        if (flag) {
            // Cache it
            await this.cacheManager.set(`${CACHE_PREFIX}${key}`, flag, CACHE_TTL * 1000);
            this.localCache.set(key, flag);
        }

        return flag;
    }

    /**
     * Update a feature flag
     */
    async update(
        id: string,
        updateDto: UpdateFeatureFlagDto,
        admin: SuperAdminUser,
    ): Promise<FeatureFlagResponseDto> {
        const flag = await this.featureFlagRepository.findOne({
            where: { id },
        });

        if (!flag) {
            throw new NotFoundException(`Feature flag with ID '${id}' not found`);
        }

        const previousValues = {
            name: flag.name,
            description: flag.description,
            type: flag.type,
            defaultValue: flag.defaultValue,
            planOverrides: flag.planOverrides,
            isActive: flag.isActive,
        };

        // Update fields
        Object.assign(flag, updateDto);
        flag.updatedById = admin.id;

        await this.featureFlagRepository.save(flag);

        // Invalidate cache
        await this.invalidateCache(flag.key);

        // Log audit
        await this.createAuditLog({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.fullName,
            action: AdminAuditAction.UPDATE,
            resourceType: 'feature_flag',
            resourceId: flag.id,
            resourceName: flag.key,
            previousValues,
            newValues: updateDto,
            description: `Updated feature flag: ${flag.key}`,
            success: true,
        });

        this.logger.log(`Feature flag updated: ${flag.key} by ${admin.email}`);
        return this.toResponseDto(flag);
    }

    /**
     * Toggle a feature flag on/off
     */
    async toggle(
        id: string,
        isActive: boolean,
        admin: SuperAdminUser,
    ): Promise<FeatureFlagResponseDto> {
        const flag = await this.featureFlagRepository.findOne({
            where: { id },
        });

        if (!flag) {
            throw new NotFoundException(`Feature flag with ID '${id}' not found`);
        }

        const previousValue = flag.isActive;
        flag.isActive = isActive;
        flag.updatedById = admin.id;

        await this.featureFlagRepository.save(flag);

        // Invalidate cache
        await this.invalidateCache(flag.key);

        // Log audit
        await this.createAuditLog({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.fullName,
            action: AdminAuditAction.FEATURE_TOGGLE,
            resourceType: 'feature_flag',
            resourceId: flag.id,
            resourceName: flag.key,
            previousValues: { isActive: previousValue },
            newValues: { isActive },
            description: `${isActive ? 'Enabled' : 'Disabled'} feature flag: ${flag.key}`,
            success: true,
        });

        this.logger.log(`Feature flag toggled: ${flag.key} = ${isActive} by ${admin.email}`);
        return this.toResponseDto(flag);
    }

    /**
     * Delete a feature flag
     */
    async remove(id: string, admin: SuperAdminUser): Promise<void> {
        const flag = await this.featureFlagRepository.findOne({
            where: { id },
        });

        if (!flag) {
            throw new NotFoundException(`Feature flag with ID '${id}' not found`);
        }

        await this.featureFlagRepository.delete(id);

        // Invalidate cache
        await this.invalidateCache(flag.key);

        // Log audit
        await this.createAuditLog({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.fullName,
            action: AdminAuditAction.DELETE,
            resourceType: 'feature_flag',
            resourceId: flag.id,
            resourceName: flag.key,
            previousValues: { key: flag.key, name: flag.name },
            description: `Deleted feature flag: ${flag.key}`,
            success: true,
        });

        this.logger.log(`Feature flag deleted: ${flag.key} by ${admin.email}`);
    }

    /**
     * Check if a feature is enabled for a specific tenant
     */
    async isFeatureEnabled(
        featureKey: string,
        tenantId: string,
        tenantPlan: string,
    ): Promise<FeatureCheckResponseDto> {
        const flag = await this.findByKey(featureKey);

        if (!flag) {
            return {
                featureKey,
                isEnabled: false,
                source: 'disabled',
            };
        }

        if (!flag.isActive) {
            return {
                featureKey,
                isEnabled: false,
                source: 'disabled',
            };
        }

        // Check blacklist first
        if (flag.tenantBlacklist?.includes(tenantId)) {
            return {
                featureKey,
                isEnabled: false,
                source: 'disabled',
            };
        }

        // Check whitelist
        if (flag.type === FeatureFlagType.TENANT_LIST) {
            const isWhitelisted = flag.tenantWhitelist?.includes(tenantId) ?? false;
            return {
                featureKey,
                isEnabled: isWhitelisted,
                source: isWhitelisted ? 'whitelist' : 'disabled',
            };
        }

        // Check plan-based gating
        if (flag.type === FeatureFlagType.PLAN_GATED && flag.planOverrides) {
            const planKey = tenantPlan.toLowerCase() as keyof PlanOverrides;
            const isEnabled = flag.planOverrides[planKey] ?? flag.defaultValue;
            return {
                featureKey,
                isEnabled,
                source: 'plan',
            };
        }

        // Check percentage rollout
        if (flag.type === FeatureFlagType.PERCENTAGE) {
            const hash = this.hashTenantId(tenantId);
            const isEnabled = hash < flag.rolloutPercentage;
            return {
                featureKey,
                isEnabled,
                source: 'percentage',
            };
        }

        // Default boolean check
        return {
            featureKey,
            isEnabled: flag.defaultValue,
            source: 'default',
        };
    }

    /**
     * Check multiple features at once
     */
    async checkMultipleFeatures(
        tenantId: string,
        tenantPlan: string,
        featureKeys: string[],
    ): Promise<Record<string, boolean>> {
        const result: Record<string, boolean> = {};

        await Promise.all(
            featureKeys.map(async (key) => {
                const check = await this.isFeatureEnabled(key, tenantId, tenantPlan);
                result[key] = check.isEnabled;
            }),
        );

        return result;
    }

    /**
     * Get all features for a tenant (for client-side SDK)
     */
    async getAllFeaturesForTenant(
        tenantId: string,
        tenantPlan: string,
    ): Promise<Record<string, boolean>> {
        const flags = await this.featureFlagRepository.find({
            where: { isActive: true },
        });

        const result: Record<string, boolean> = {};

        for (const flag of flags) {
            const check = await this.isFeatureEnabled(flag.key, tenantId, tenantPlan);
            result[flag.key] = check.isEnabled;
        }

        return result;
    }

    /**
     * Warm up cache with all feature flags
     */
    private async warmUpCache(): Promise<void> {
        try {
            const flags = await this.featureFlagRepository.find();

            for (const flag of flags) {
                await this.cacheManager.set(`${CACHE_PREFIX}${flag.key}`, flag, CACHE_TTL * 1000);
                this.localCache.set(flag.key, flag);
            }

            this.logger.log(`Feature flags cache warmed up with ${flags.length} flags`);
        } catch (error) {
            this.logger.error('Failed to warm up feature flags cache', error);
        }
    }

    /**
     * Invalidate cache for a specific flag
     */
    private async invalidateCache(key: string): Promise<void> {
        await this.cacheManager.del(`${CACHE_PREFIX}${key}`);
        await this.cacheManager.del(ALL_FLAGS_CACHE_KEY);
        this.localCache.delete(key);
    }

    /**
     * Generate consistent hash for percentage rollout
     */
    private hashTenantId(tenantId: string): number {
        let hash = 0;
        for (let i = 0; i < tenantId.length; i++) {
            const char = tenantId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) % 100;
    }

    /**
     * Convert entity to response DTO
     */
    private toResponseDto(flag: FeatureFlag): FeatureFlagResponseDto {
        return {
            id: flag.id,
            key: flag.key,
            name: flag.name,
            description: flag.description,
            category: flag.category,
            type: flag.type,
            defaultValue: flag.defaultValue,
            planOverrides: flag.planOverrides,
            rolloutPercentage: flag.rolloutPercentage,
            isActive: flag.isActive,
            createdAt: flag.createdAt,
            updatedAt: flag.updatedAt,
        };
    }

    /**
     * Create audit log entry
     */
    private async createAuditLog(data: Partial<AdminAuditLog>): Promise<void> {
        const log = this.auditLogRepository.create(data);
        await this.auditLogRepository.save(log);
    }
}
