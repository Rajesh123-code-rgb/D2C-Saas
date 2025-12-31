import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsEnum,
    IsEmail,
    IsBoolean,
    MinLength,
    IsNumber,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// Admin User DTOs
export enum AdminRole {
    PLATFORM_ADMIN = 'PLATFORM_ADMIN',
    SUPPORT = 'SUPPORT',
    VIEWER = 'VIEWER',
}

export enum AdminStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
}

export class AdminUserFilterDto {
    @ApiPropertyOptional({ enum: AdminRole })
    @IsOptional()
    @IsEnum(AdminRole)
    role?: AdminRole;

    @ApiPropertyOptional({ enum: AdminStatus })
    @IsOptional()
    @IsEnum(AdminStatus)
    status?: AdminStatus;

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

export class CreateAdminUserDto {
    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    @MinLength(2)
    firstName: string;

    @ApiProperty()
    @IsString()
    @MinLength(2)
    lastName: string;

    @ApiProperty({ enum: AdminRole })
    @IsEnum(AdminRole)
    role: AdminRole;

    @ApiProperty()
    @IsString()
    @MinLength(8)
    password: string;
}

export class UpdateAdminUserDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    firstName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    lastName?: string;

    @ApiPropertyOptional({ enum: AdminRole })
    @IsOptional()
    @IsEnum(AdminRole)
    role?: AdminRole;
}

export class AdminUserPermissionsDto {
    @ApiProperty()
    canManageTenants: boolean;

    @ApiProperty()
    canManageUsers: boolean;

    @ApiProperty()
    canViewAnalytics: boolean;

    @ApiProperty()
    canManageFeatureFlags: boolean;

    @ApiProperty()
    canIssueCredits: boolean;

    @ApiProperty()
    canProcessRefunds: boolean;
}

export class AdminUserResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    firstName: string;

    @ApiProperty()
    lastName: string;

    @ApiProperty({ enum: AdminRole })
    role: AdminRole;

    @ApiProperty({ enum: AdminStatus })
    status: AdminStatus;

    @ApiPropertyOptional()
    lastLoginAt?: string;

    @ApiProperty()
    twoFactorEnabled: boolean;

    @ApiProperty()
    createdAt: string;

    @ApiProperty({ type: AdminUserPermissionsDto })
    permissions: AdminUserPermissionsDto;
}

export class UpdateStatusDto {
    @ApiProperty({ enum: AdminStatus })
    @IsEnum(AdminStatus)
    status: AdminStatus;
}

export class ResetPasswordDto {
    @ApiProperty()
    @IsString()
    @MinLength(8)
    newPassword: string;
}

export class PaginatedAdminUsersDto {
    @ApiProperty({ type: [AdminUserResponseDto] })
    data: AdminUserResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}
