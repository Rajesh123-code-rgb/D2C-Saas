import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsEmail,
    Min,
    Max,
    IsUrl,
} from 'class-validator';

// Platform Settings DTOs
export class GeneralSettingsDto {
    @ApiProperty()
    @IsString()
    platformName: string;

    @ApiProperty()
    @IsEmail()
    supportEmail: string;

    @ApiProperty()
    @IsString()
    defaultTimezone: string;

    @ApiProperty()
    @IsBoolean()
    maintenanceMode: boolean;
}

export class SecuritySettingsDto {
    @ApiProperty()
    @IsBoolean()
    enforceAdmin2FA: boolean;

    @ApiProperty()
    @IsBoolean()
    enforceTenant2FA: boolean;

    @ApiProperty()
    @IsNumber()
    @Min(1)
    @Max(168)
    sessionTimeout: number;

    @ApiProperty()
    @IsNumber()
    @Min(1)
    @Max(10)
    maxLoginAttempts: number;

    @ApiProperty()
    @IsNumber()
    @Min(6)
    @Max(32)
    passwordMinLength: number;
}

export class NotificationSettingsDto {
    @ApiProperty()
    @IsBoolean()
    adminLoginAlert: boolean;

    @ApiProperty()
    @IsBoolean()
    lowCreditAlert: boolean;

    @ApiProperty()
    @IsBoolean()
    tenantSuspensionAlert: boolean;

    @ApiProperty()
    @IsBoolean()
    dailySummary: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUrl()
    webhookUrl?: string;
}

export class PlatformSettingsDto {
    @ApiProperty({ type: GeneralSettingsDto })
    general: GeneralSettingsDto;

    @ApiProperty({ type: SecuritySettingsDto })
    security: SecuritySettingsDto;

    @ApiProperty({ type: NotificationSettingsDto })
    notifications: NotificationSettingsDto;
}

export class UpdatePlatformSettingsDto {
    @ApiPropertyOptional({ type: GeneralSettingsDto })
    @IsOptional()
    general?: Partial<GeneralSettingsDto>;

    @ApiPropertyOptional({ type: SecuritySettingsDto })
    @IsOptional()
    security?: Partial<SecuritySettingsDto>;

    @ApiPropertyOptional({ type: NotificationSettingsDto })
    @IsOptional()
    notifications?: Partial<NotificationSettingsDto>;
}

export class IntegrationSettingsDto {
    @ApiProperty()
    @IsString()
    metaAppId: string;

    @ApiProperty()
    @IsString()
    metaAppSecret: string;

    @ApiProperty()
    @IsString()
    stripePublicKey: string;

    @ApiProperty()
    @IsString()
    stripeSecretKey: string;

    @ApiProperty()
    @IsString()
    sendgridApiKey: string;

    @ApiProperty()
    @IsString()
    openaiApiKey: string;
}

export class UpdateIntegrationSettingsDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    metaAppId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    metaAppSecret?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    stripePublicKey?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    stripeSecretKey?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sendgridApiKey?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    openaiApiKey?: string;
}
