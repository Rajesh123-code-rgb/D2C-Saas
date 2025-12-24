import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../../modules/users/user.entity';
import { Tenant, TenantStatus, SubscriptionTier } from '../../modules/tenants/tenant.entity';

export async function seedAuth(dataSource: DataSource) {
    const tenantRepo = dataSource.getRepository(Tenant);
    const userRepo = dataSource.getRepository(User);

    console.log('🌱 Seeding authentication data...');

    // Create Admin Tenant
    let adminTenant = await tenantRepo.findOne({ where: { slug: 'omnichannel-admin' } });
    if (!adminTenant) {
        adminTenant = tenantRepo.create({
            name: 'OmniChannel Admin',
            slug: 'omnichannel-admin',
            subscriptionTier: SubscriptionTier.ENTERPRISE,
            status: TenantStatus.ACTIVE,
            settings: {
                timezone: 'UTC',
                language: 'en',
            },
        });
        await tenantRepo.save(adminTenant);
        console.log('✅ Created admin tenant');
    }

    // Create Admin User
    let adminUser = await userRepo.findOne({ where: { email: 'admin@omnichannel.app' } });
    if (!adminUser) {
        const passwordHash = await bcrypt.hash('Admin@123', 10);
        adminUser = userRepo.create({
            tenantId: adminTenant.id,
            email: 'admin@omnichannel.app',
            passwordHash,
            firstName: 'Admin',
            lastName: 'User',
            role: UserRole.OWNER,
            status: UserStatus.ACTIVE,
        });
        await userRepo.save(adminUser);
        console.log('✅ Created admin user (admin@omnichannel.app / Admin@123)');
    }

    // Create Demo Tenant
    let demoTenant = await tenantRepo.findOne({ where: { slug: 'demo-company' } });
    if (!demoTenant) {
        demoTenant = tenantRepo.create({
            name: 'Demo Company',
            slug: 'demo-company',
            subscriptionTier: SubscriptionTier.PROFESSIONAL,
            status: TenantStatus.TRIAL,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            settings: {
                timezone: 'UTC',
                language: 'en',
            },
        });
        await tenantRepo.save(demoTenant);
        console.log('✅ Created demo tenant');
    }

    // Create Demo User
    let demoUser = await userRepo.findOne({ where: { email: 'user@omnichannel.app' } });
    if (!demoUser) {
        const passwordHash = await bcrypt.hash('User@123', 10);
        demoUser = userRepo.create({
            tenantId: demoTenant.id,
            email: 'user@omnichannel.app',
            passwordHash,
            firstName: 'Demo',
            lastName: 'User',
            role: UserRole.AGENT,
            status: UserStatus.ACTIVE,
        });
        await userRepo.save(demoUser);
        console.log('✅ Created demo user (user@omnichannel.app / User@123)');
    }

    console.log('🎉 Auth seeding completed!');
}
