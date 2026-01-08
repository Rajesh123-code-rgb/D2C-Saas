import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

// Entities
import { SuperAdminUser } from './entities/super-admin-user.entity';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { FeatureFlag } from './entities/feature-flag.entity';
import { AutomationPolicy } from './entities/automation-policy.entity';
import { WhatsAppTemplatePolicy } from './entities/whatsapp-template-policy.entity';
import { EmailTemplatePolicy } from './entities/email-template-policy.entity';
import { MessageWallet } from './entities/message-wallet.entity';
import { MessageTransaction } from './entities/message-transaction.entity';
import { TopUpPackage } from './entities/topup-package.entity';
import { ConversationPricing } from './entities/conversation-pricing.entity';
import { WhatsAppConversation } from './entities/whatsapp-conversation.entity';
import { AutomationTemplate } from './entities/automation-template.entity';
import { PremadeWhatsAppTemplate } from './entities/premade-whatsapp-template.entity';
import { PremadeEmailTemplate } from './entities/premade-email-template.entity';
import { GlobalSeoSettings } from './entities/global-seo-settings.entity';

// External Entities
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { Channel } from '../channels/channel.entity';
import { AutomationRule } from '../automations/automation-rule.entity';
import { WhatsAppTemplate } from '../channels/whatsapp/entities/whatsapp-template.entity';

// Guards
import { SuperAdminGuard } from './guards/super-admin.guard';
import { SuperAdminJwtStrategy } from './guards/super-admin-jwt.strategy';
import { FeatureGuard, FeaturesGuard } from './guards/feature.guard';

// Services
import { SuperAdminAuthService } from './services/super-admin-auth.service';
import { FeatureFlagsService } from './services/feature-flags.service';
import { WalletService } from './services/wallet.service';
import { BillingService } from './services/billing.service';
import { AutomationGovernanceService } from './services/automation-governance.service';
import { TemplateGovernanceService } from './services/template-governance.service';
import { EmailGovernanceService } from './services/email-governance.service';
import { SystemUsageService } from './services/system-usage.service';
import { TemplateBuildersService } from './services/template-builders.service';

// Controllers
import { SuperAdminAuthController } from './controllers/super-admin-auth.controller';
import { FeatureFlagsController, FeatureFlagsPublicController } from './controllers/feature-flags.controller';
import { BillingAdminController, BillingUserController } from './controllers/billing.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { OrganizationsController } from './controllers/organizations.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminAuditLogsController } from './controllers/admin-audit-logs.controller';
import { SettingsController } from './controllers/settings.controller';
import { AutomationGovernanceController } from './controllers/automation-governance.controller';
import { TemplateGovernanceController } from './controllers/template-governance.controller';
import { EmailGovernanceController } from './controllers/email-governance.controller';
import { SystemUsageController } from './controllers/system-usage.controller';
import { TemplateBuildersController, TemplateLibraryController } from './controllers/template-builders.controller';
import { PublicSettingsController } from './controllers/public-settings.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            // Super Admin entities
            SuperAdminUser,
            AdminAuditLog,
            FeatureFlag,
            AutomationPolicy,
            WhatsAppTemplatePolicy,
            EmailTemplatePolicy,
            MessageWallet,
            MessageTransaction,
            TopUpPackage,
            ConversationPricing,
            WhatsAppConversation,
            AutomationTemplate,
            PremadeWhatsAppTemplate,
            PremadeEmailTemplate,
            GlobalSeoSettings,
            // External entities for dashboard/organizations
            Tenant,
            User,
            Channel,
            AutomationRule,
            WhatsAppTemplate,
        ]),
        PassportModule.register({ defaultStrategy: 'super-admin-jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('ADMIN_JWT_SECRET') ||
                    configService.get<string>('JWT_SECRET') ||
                    'super-admin-secret-key-dev',
                signOptions: { expiresIn: '24h' },
            }),
            inject: [ConfigService],
        }),
        // Cache module for feature flags (in-memory by default)
        // For production with multiple instances, configure Redis in .env
        CacheModule.register({
            ttl: 300, // 5 minutes default
            max: 100, // Maximum number of items in cache
        }),
        ConfigModule,
    ],
    controllers: [
        SuperAdminAuthController,
        FeatureFlagsController,
        FeatureFlagsPublicController,
        BillingAdminController,
        BillingUserController,
        DashboardController,
        OrganizationsController,
        AdminUsersController,
        AdminAuditLogsController,
        AdminAuditLogsController,
        SettingsController,
        PublicSettingsController,
        AutomationGovernanceController,
        TemplateGovernanceController,
        EmailGovernanceController,
        SystemUsageController,
        TemplateBuildersController,
        TemplateLibraryController,
    ],
    providers: [
        SuperAdminAuthService,
        FeatureFlagsService,
        WalletService,
        BillingService,
        AutomationGovernanceService,
        TemplateGovernanceService,
        EmailGovernanceService,
        SystemUsageService,
        TemplateBuildersService,
        SuperAdminJwtStrategy,
        SuperAdminGuard,
        FeatureGuard,
        FeaturesGuard,
    ],
    exports: [
        SuperAdminAuthService,
        FeatureFlagsService,
        WalletService,
        BillingService,
        AutomationGovernanceService,
        TemplateGovernanceService,
        EmailGovernanceService,
        SystemUsageService,
        TemplateBuildersService,
        SuperAdminGuard,
        FeatureGuard,
        FeaturesGuard,
        TypeOrmModule,
    ],
})
export class SuperAdminModule { }
