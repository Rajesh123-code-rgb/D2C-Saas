import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, IsArray, Min, Max } from 'class-validator';
import { FeatureFlagType, PlanOverrides } from '../entities/feature-flag.entity';

export class CreateFeatureFlagDto {
    @IsString()
    key: string;

    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsEnum(FeatureFlagType)
    @IsOptional()
    type?: FeatureFlagType;

    @IsBoolean()
    @IsOptional()
    defaultValue?: boolean;

    @IsOptional()
    planOverrides?: PlanOverrides;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    rolloutPercentage?: number;

    @IsArray()
    @IsOptional()
    tenantWhitelist?: string[];

    @IsArray()
    @IsOptional()
    tenantBlacklist?: string[];

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdateFeatureFlagDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsEnum(FeatureFlagType)
    @IsOptional()
    type?: FeatureFlagType;

    @IsBoolean()
    @IsOptional()
    defaultValue?: boolean;

    @IsOptional()
    planOverrides?: PlanOverrides;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    rolloutPercentage?: number;

    @IsArray()
    @IsOptional()
    tenantWhitelist?: string[];

    @IsArray()
    @IsOptional()
    tenantBlacklist?: string[];

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class ToggleFeatureFlagDto {
    @IsBoolean()
    isActive: boolean;
}

export class CheckFeatureDto {
    @IsString()
    tenantId: string;

    @IsString()
    tenantPlan: string;

    @IsString()
    featureKey: string;
}

export class FeatureFlagResponseDto {
    id: string;
    key: string;
    name: string;
    description?: string;
    category?: string;
    type: FeatureFlagType;
    defaultValue: boolean;
    planOverrides?: PlanOverrides;
    rolloutPercentage: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class FeatureCheckResponseDto {
    featureKey: string;
    isEnabled: boolean;
    source: 'default' | 'plan' | 'whitelist' | 'percentage' | 'disabled';
}

export class BulkFeatureCheckDto {
    @IsString()
    tenantId: string;

    @IsString()
    tenantPlan: string;

    @IsArray()
    @IsString({ each: true })
    featureKeys: string[];
}

export class BulkFeatureCheckResponseDto {
    features: Record<string, boolean>;
}
