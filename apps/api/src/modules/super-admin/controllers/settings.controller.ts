import {
    Controller,
    Get,
    Put,
    Body,
    UseGuards,
    Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import {
    PlatformSettingsDto,
    UpdatePlatformSettingsDto,
    IntegrationSettingsDto,
    UpdateIntegrationSettingsDto,
} from '../dto/settings.dto';
import { AdminAuditLog, AdminAuditAction } from '../entities/admin-audit-log.entity';
import { GlobalSeoSettings } from '../entities/global-seo-settings.entity';

// Platform settings entity (would typically be stored in DB or config)
interface StoredSettings {
    general: {
        platformName: string;
        supportEmail: string;
        defaultTimezone: string;
        maintenanceMode: boolean;
    };
    security: {
        enforceAdmin2FA: boolean;
        enforceTenant2FA: boolean;
        sessionTimeout: number;
        maxLoginAttempts: number;
        passwordMinLength: number;
    };
    notifications: {
        adminLoginAlert: boolean;
        lowCreditAlert: boolean;
        tenantSuspensionAlert: boolean;
        dailySummary: boolean;
        webhookUrl: string;
    };
}

// In-memory store for settings (in production, use database or config service)
let platformSettings: StoredSettings = {
    general: {
        platformName: 'Convoo',
        supportEmail: 'support@convoo.cloud',
        defaultTimezone: 'Asia/Kolkata',
        maintenanceMode: false,
    },
    security: {
        enforceAdmin2FA: true,
        enforceTenant2FA: false,
        sessionTimeout: 24,
        maxLoginAttempts: 5,
        passwordMinLength: 8,
    },
    notifications: {
        adminLoginAlert: true,
        lowCreditAlert: true,
        tenantSuspensionAlert: true,
        dailySummary: false,
        webhookUrl: '',
    },
};

// Integration settings (masked for security)
let integrationSettings = {
    metaAppId: '',
    metaAppSecret: '',
    stripePublicKey: '',
    stripeSecretKey: '',
    sendgridApiKey: '',
    openaiApiKey: '',
};

@ApiTags('Admin Settings')
@Controller('admin/settings')
@UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
@ApiBearerAuth()
export class SettingsController {
    constructor(
        @InjectRepository(AdminAuditLog)
        private readonly auditLogRepository: Repository<AdminAuditLog>,
        @InjectRepository(GlobalSeoSettings)
        private readonly seoSettingsRepository: Repository<GlobalSeoSettings>,
        private readonly configService: ConfigService,
    ) {
        // Initialize integration settings from environment
        this.initializeIntegrationSettings();
    }

    private initializeIntegrationSettings() {
        integrationSettings = {
            metaAppId: this.configService.get('META_APP_ID') || '',
            metaAppSecret: this.maskSecret(this.configService.get('META_APP_SECRET') || ''),
            stripePublicKey: this.configService.get('STRIPE_PUBLIC_KEY') || '',
            stripeSecretKey: this.maskSecret(this.configService.get('STRIPE_SECRET_KEY') || ''),
            sendgridApiKey: this.maskSecret(this.configService.get('SENDGRID_API_KEY') || ''),
            openaiApiKey: this.maskSecret(this.configService.get('OPENAI_API_KEY') || ''),
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get platform settings' })
    @ApiResponse({ status: 200, description: 'Platform settings' })
    async getSettings(): Promise<PlatformSettingsDto> {
        return platformSettings;
    }

    @Put()
    @ApiOperation({ summary: 'Update platform settings' })
    @ApiResponse({ status: 200, description: 'Settings updated' })
    async updateSettings(
        @Body() dto: UpdatePlatformSettingsDto,
        @Req() req: Request,
    ): Promise<PlatformSettingsDto> {
        const previousSettings = { ...platformSettings };

        // Merge updates
        if (dto.general) {
            platformSettings.general = {
                ...platformSettings.general,
                ...dto.general,
            };
        }
        if (dto.security) {
            platformSettings.security = {
                ...platformSettings.security,
                ...dto.security,
            };
        }
        if (dto.notifications) {
            platformSettings.notifications = {
                ...platformSettings.notifications,
                ...dto.notifications,
            };
        }

        // Log the action
        await this.createAuditLog(req, AdminAuditAction.UPDATE, 'system_settings', 'platform', 'Platform Settings', {
            previousValues: previousSettings,
            newValues: platformSettings,
            description: 'Updated platform settings',
        });

        return platformSettings;
    }

    @Get('integrations')
    @ApiOperation({ summary: 'Get integration settings' })
    @ApiResponse({ status: 200, description: 'Integration settings (masked)' })
    async getIntegrations(): Promise<IntegrationSettingsDto> {
        return integrationSettings;
    }

    @Put('integrations')
    @ApiOperation({ summary: 'Update integration settings' })
    @ApiResponse({ status: 200, description: 'Integration settings updated' })
    async updateIntegrations(
        @Body() dto: UpdateIntegrationSettingsDto,
        @Req() req: Request,
    ): Promise<IntegrationSettingsDto> {
        const updatedFields: string[] = [];

        // Only update non-empty values
        if (dto.metaAppId && dto.metaAppId !== integrationSettings.metaAppId) {
            integrationSettings.metaAppId = dto.metaAppId;
            updatedFields.push('metaAppId');
        }
        if (dto.metaAppSecret && !dto.metaAppSecret.includes('*')) {
            integrationSettings.metaAppSecret = this.maskSecret(dto.metaAppSecret);
            updatedFields.push('metaAppSecret');
            // In production, save the actual secret to secure storage
        }
        if (dto.stripePublicKey && dto.stripePublicKey !== integrationSettings.stripePublicKey) {
            integrationSettings.stripePublicKey = dto.stripePublicKey;
            updatedFields.push('stripePublicKey');
        }
        if (dto.stripeSecretKey && !dto.stripeSecretKey.includes('*')) {
            integrationSettings.stripeSecretKey = this.maskSecret(dto.stripeSecretKey);
            updatedFields.push('stripeSecretKey');
        }
        if (dto.sendgridApiKey && !dto.sendgridApiKey.includes('*')) {
            integrationSettings.sendgridApiKey = this.maskSecret(dto.sendgridApiKey);
            updatedFields.push('sendgridApiKey');
        }
        if (dto.openaiApiKey && !dto.openaiApiKey.includes('*')) {
            integrationSettings.openaiApiKey = this.maskSecret(dto.openaiApiKey);
            updatedFields.push('openaiApiKey');
        }

        if (updatedFields.length > 0) {
            // Log the action
            await this.createAuditLog(req, AdminAuditAction.UPDATE, 'system_settings', 'integrations', 'Integration Settings', {
                newValues: { updatedFields },
                description: `Updated integration settings: ${updatedFields.join(', ')}`,
            });
        }

        return integrationSettings;
        return integrationSettings;
    }

    // ==================== SEO SETTINGS ====================

    @Get('seo')
    @ApiOperation({ summary: 'Get SEO settings' })
    @ApiResponse({ status: 200, description: 'SEO settings' })
    async getSeoSettings(): Promise<GlobalSeoSettings> {
        let settings = await this.seoSettingsRepository.findOne({ where: {} });
        if (!settings) {
            settings = this.seoSettingsRepository.create();
            await this.seoSettingsRepository.save(settings);
        }
        return settings;
    }

    @Put('seo')
    @ApiOperation({ summary: 'Update SEO settings' })
    @ApiResponse({ status: 200, description: 'SEO settings updated' })
    async updateSeoSettings(
        @Body() dto: Partial<GlobalSeoSettings>,
        @Req() req: Request,
    ): Promise<GlobalSeoSettings> {
        let settings = await this.seoSettingsRepository.findOne({ where: {} });
        if (!settings) {
            settings = this.seoSettingsRepository.create();
        }

        const previousValues = { ...settings };
        Object.assign(settings, dto);
        await this.seoSettingsRepository.save(settings);

        // Log the action
        await this.createAuditLog(req, AdminAuditAction.UPDATE, 'system_settings', 'seo', 'SEO Settings', {
            previousValues,
            newValues: dto,
            description: 'Updated SEO settings',
        });

        return settings;
    }

    private maskSecret(secret: string): string {
        if (!secret || secret.length < 8) return '***';
        return secret.substring(0, 3) + '***' + secret.substring(secret.length - 3);
    }

    private async createAuditLog(
        req: Request,
        action: AdminAuditAction,
        resourceType: string,
        resourceId: string,
        resourceName: string,
        options: {
            previousValues?: any;
            newValues?: any;
            description: string;
        },
    ) {
        const admin = req.admin!;
        const auditLog = this.auditLogRepository.create({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: `${admin.firstName} ${admin.lastName}`,
            action,
            resourceType: resourceType as any,
            resourceId,
            resourceName,
            previousValues: options.previousValues,
            newValues: options.newValues,
            description: options.description,
            ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || '',
            userAgent: req.headers['user-agent'] || '',
            success: true,
        });

        await this.auditLogRepository.save(auditLog);
    }
}
