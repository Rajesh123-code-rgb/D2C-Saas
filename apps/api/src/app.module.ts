import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { WhatsAppModule } from './modules/channels/whatsapp/whatsapp.module';
import { InstagramModule } from './modules/channels/instagram/instagram.module';
import { EmailModule } from './modules/channels/email/email.module';
import { EcommerceModule } from './modules/ecommerce/ecommerce.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { SegmentsModule } from './modules/segments/segments.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AIModule } from './modules/ai/ai.module';
import { AuditModule } from './modules/audit/audit.module';
import { BillingModule } from './modules/billing/billing.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { GdprModule } from './modules/gdpr/gdpr.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { ChatbotsModule } from './modules/chatbots/chatbots.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // Rate Limiting - Global config (100 requests per minute)
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),


        // Database
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DATABASE_HOST') || 'localhost',
                port: parseInt(configService.get('DATABASE_PORT') || '5432'),
                username: configService.get('DATABASE_USER') || 'postgres',
                password: configService.get('DATABASE_PASSWORD') || 'postgres',
                database: configService.get('DATABASE_NAME') || 'omnichannel',
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: process.env.NODE_ENV === 'development', // Only in dev!
                logging: process.env.NODE_ENV === 'development',
                autoLoadEntities: true,
            }),
            inject: [ConfigService],
        }),

        // Redis & BullMQ
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    host: configService.get('REDIS_HOST') || 'localhost',
                    port: parseInt(configService.get('REDIS_PORT') || '6379'),
                },
            }),
            inject: [ConfigService],
        }),

        // Enterprise Modules
        AuditModule,
        BillingModule,
        IntegrationsModule,
        GdprModule,

        // Feature Modules
        AuthModule,
        TenantsModule,
        UsersModule,
        ContactsModule,
        ChannelsModule,
        InboxModule,
        WhatsAppModule,
        InstagramModule,
        EmailModule,
        EcommerceModule,
        AutomationsModule,
        SegmentsModule,
        CampaignsModule,
        AIModule,
        ChatbotsModule,
        AnalyticsModule,
        OnboardingModule,
    ],
})
export class AppModule { }

