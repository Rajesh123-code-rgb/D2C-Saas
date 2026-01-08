import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsEnum,
    IsNumber,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// Audit Log DTOs
export enum AdminAuditAction {
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    FEATURE_TOGGLE = 'FEATURE_TOGGLE',
    CREDIT_ISSUE = 'CREDIT_ISSUE',
    REFUND = 'REFUND',
    SUSPEND = 'SUSPEND',
    REACTIVATE = 'REACTIVATE',
    PRICING_CHANGE = 'PRICING_CHANGE',
    SETTINGS_UPDATE = 'SETTINGS_UPDATE',
    IMPERSONATE = 'IMPERSONATE',
}

export enum AdminResourceType {
    TENANT = 'tenant',
    ADMIN_USER = 'admin_user',
    FEATURE_FLAG = 'feature_flag',
    MESSAGE_WALLET = 'message_wallet',
    TOPUP_PACKAGE = 'topup_package',
    CONVERSATION_PRICING = 'conversation_pricing',
    PLATFORM_SETTINGS = 'platform_settings',
    SESSION = 'session',
}

export class AdminAuditLogFilterDto {
    @ApiPropertyOptional({ enum: AdminAuditAction })
    @IsOptional()
    @IsEnum(AdminAuditAction)
    action?: AdminAuditAction;

    @ApiPropertyOptional({ enum: AdminResourceType })
    @IsOptional()
    @IsEnum(AdminResourceType)
    resourceType?: AdminResourceType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    adminId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Filter by tenant/organization ID' })
    @IsOptional()
    @IsString()
    tenantId?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    @Max(100)
    limit?: number = 20;
}

export class AdminAuditLogResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    adminId: string;

    @ApiProperty()
    adminEmail: string;

    @ApiProperty()
    adminName: string;

    @ApiProperty({ enum: AdminAuditAction })
    action: AdminAuditAction;

    @ApiProperty({ enum: AdminResourceType })
    resourceType: AdminResourceType;

    @ApiProperty()
    resourceId: string;

    @ApiProperty()
    resourceName: string;

    @ApiPropertyOptional()
    targetTenantId?: string;

    @ApiPropertyOptional()
    targetTenantName?: string;

    @ApiPropertyOptional()
    previousValues?: Record<string, any>;

    @ApiPropertyOptional()
    newValues?: Record<string, any>;

    @ApiProperty()
    description: string;

    @ApiProperty()
    ipAddress: string;

    @ApiProperty()
    success: boolean;

    @ApiProperty()
    createdAt: string;
}

export class PaginatedAdminAuditLogsDto {
    @ApiProperty({ type: [AdminAuditLogResponseDto] })
    data: AdminAuditLogResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}
