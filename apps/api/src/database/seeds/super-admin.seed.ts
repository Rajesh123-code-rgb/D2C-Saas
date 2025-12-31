import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { SuperAdminUser, SuperAdminRole, SuperAdminStatus, DEFAULT_PERMISSIONS } from '../../modules/super-admin/entities/super-admin-user.entity';
import { FeatureFlag, DEFAULT_FEATURE_FLAGS, FeatureFlagType } from '../../modules/super-admin/entities/feature-flag.entity';
import { AutomationPolicy, DEFAULT_AUTOMATION_POLICY } from '../../modules/super-admin/entities/automation-policy.entity';
import { WhatsAppTemplatePolicy, DEFAULT_WHATSAPP_TEMPLATE_POLICY } from '../../modules/super-admin/entities/whatsapp-template-policy.entity';
import { TopUpPackage, DEFAULT_TOPUP_PACKAGES } from '../../modules/super-admin/entities/topup-package.entity';
import { ConversationPricing, DEFAULT_CONVERSATION_PRICING } from '../../modules/super-admin/entities/conversation-pricing.entity';

export async function seedSuperAdmin(dataSource: DataSource): Promise<void> {
    console.log('🌱 Starting Super Admin seeding...');

    const adminRepo = dataSource.getRepository(SuperAdminUser);
    const featureFlagRepo = dataSource.getRepository(FeatureFlag);
    const automationPolicyRepo = dataSource.getRepository(AutomationPolicy);
    const whatsappPolicyRepo = dataSource.getRepository(WhatsAppTemplatePolicy);
    const topUpPackageRepo = dataSource.getRepository(TopUpPackage);
    const conversationPricingRepo = dataSource.getRepository(ConversationPricing);

    // 1. Seed Default Super Admin
    console.log('  📧 Creating default Super Admin...');
    const existingAdmin = await adminRepo.findOne({
        where: { email: 'admin@convoo.cloud' },
    });

    if (!existingAdmin) {
        const passwordHash = await bcrypt.hash('Admin@123456', 10);
        const admin = adminRepo.create({
            email: 'admin@convoo.cloud',
            passwordHash,
            firstName: 'Platform',
            lastName: 'Admin',
            role: SuperAdminRole.PLATFORM_ADMIN,
            status: SuperAdminStatus.ACTIVE,
            permissions: DEFAULT_PERMISSIONS[SuperAdminRole.PLATFORM_ADMIN],
        });
        await adminRepo.save(admin);
        console.log('  ✅ Default Super Admin created: admin@convoo.cloud');
    } else {
        console.log('  ⏭️  Super Admin already exists, skipping...');
    }

    // 2. Seed Feature Flags
    console.log('  🚩 Seeding feature flags...');
    for (const flagData of DEFAULT_FEATURE_FLAGS) {
        const existingFlag = await featureFlagRepo.findOne({
            where: { key: flagData.key },
        });

        if (!existingFlag) {
            const flag = featureFlagRepo.create({
                ...flagData,
                isActive: true,
            } as FeatureFlag);
            await featureFlagRepo.save(flag);
            console.log(`    ✅ Created feature flag: ${flagData.key}`);
        }
    }

    // 3. Seed Automation Policy
    console.log('  ⚙️  Seeding automation policy...');
    const existingPolicy = await automationPolicyRepo.findOne({
        where: { name: 'default' },
    });

    if (!existingPolicy) {
        const policy = automationPolicyRepo.create(DEFAULT_AUTOMATION_POLICY as AutomationPolicy);
        await automationPolicyRepo.save(policy);
        console.log('  ✅ Default automation policy created');
    } else {
        console.log('  ⏭️  Automation policy already exists, skipping...');
    }

    // 4. Seed WhatsApp Template Policy
    console.log('  📱 Seeding WhatsApp template policy...');
    const existingWhatsAppPolicy = await whatsappPolicyRepo.findOne({
        where: { name: 'default' },
    });

    if (!existingWhatsAppPolicy) {
        const policy = whatsappPolicyRepo.create(DEFAULT_WHATSAPP_TEMPLATE_POLICY as WhatsAppTemplatePolicy);
        await whatsappPolicyRepo.save(policy);
        console.log('  ✅ Default WhatsApp template policy created');
    } else {
        console.log('  ⏭️  WhatsApp template policy already exists, skipping...');
    }

    // 5. Seed Top-Up Packages
    console.log('  💰 Seeding top-up packages...');
    const existingPackages = await topUpPackageRepo.count();

    if (existingPackages === 0) {
        for (const packageData of DEFAULT_TOPUP_PACKAGES) {
            const pkg = topUpPackageRepo.create(packageData as TopUpPackage);
            await topUpPackageRepo.save(pkg);
            console.log(`    ✅ Created package: ${packageData.name}`);
        }
    } else {
        console.log('  ⏭️  Top-up packages already exist, skipping...');
    }

    // 6. Seed Conversation Pricing
    console.log('  💵 Seeding conversation pricing...');
    const existingPricing = await conversationPricingRepo.count();

    if (existingPricing === 0) {
        for (const pricingData of DEFAULT_CONVERSATION_PRICING) {
            const pricing = conversationPricingRepo.create(pricingData as ConversationPricing);
            await conversationPricingRepo.save(pricing);
            console.log(`    ✅ Created pricing: ${pricingData.countryCode} - ${pricingData.category}`);
        }
    } else {
        console.log('  ⏭️  Conversation pricing already exists, skipping...');
    }

    console.log('🎉 Super Admin seeding completed!');
}

// Helper to run seed directly
export async function runSeed(): Promise<void> {
    // This would be called from a CLI command
    console.log('Starting seed process...');
}
