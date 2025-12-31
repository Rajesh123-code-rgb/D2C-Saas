import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsEnum,
    IsNumber,
    IsBoolean,
    IsObject,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// Organization DTOs
export enum OrganizationStatus {
    ACTIVE = 'active',
    TRIAL = 'trial',
    SUSPENDED = 'suspended',
    CANCELLED = 'cancelled',
}

export enum SubscriptionTier {
    FREE = 'free',
    STARTER = 'starter',
    PRO = 'pro',
    ENTERPRISE = 'enterprise',
}

export class OrganizationFilterDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: OrganizationStatus })
    @IsOptional()
    @IsEnum(OrganizationStatus)
    status?: OrganizationStatus;

    @ApiPropertyOptional({ enum: SubscriptionTier })
    @IsOptional()
    @IsEnum(SubscriptionTier)
    tier?: SubscriptionTier;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 10 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    @Max(100)
    limit?: number = 10;
}

export class OrganizationResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    slug: string;

    @ApiProperty({ enum: OrganizationStatus })
    status: OrganizationStatus;

    @ApiProperty({ enum: SubscriptionTier })
    subscriptionTier: SubscriptionTier;

    @ApiProperty()
    usersCount: number;

    @ApiProperty()
    channelsCount: number;

    @ApiProperty()
    creditsBalance: number;

    @ApiProperty()
    messagesThisMonth: number;

    @ApiProperty()
    createdAt: string;

    @ApiProperty()
    lastActiveAt: string;
}

export class SuspendOrganizationDto {
    @ApiProperty()
    @IsString()
    reason: string;
}

export class UpdateOrganizationPlanDto {
    @ApiProperty({ enum: SubscriptionTier })
    @IsEnum(SubscriptionTier)
    tier: SubscriptionTier;
}

export class PaginatedOrganizationsDto {
    @ApiProperty({ type: [OrganizationResponseDto] })
    data: OrganizationResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}
