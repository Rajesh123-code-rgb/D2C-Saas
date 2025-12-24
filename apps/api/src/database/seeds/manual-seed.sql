-- Manual Seed Script for Authentication
-- Run this SQL directly in your PostgreSQL database

-- Check if tenants table exists
-- INSERT admin tenant
INSERT INTO tenants (id, name, slug, "subscriptionTier", status, settings, "trialEndsAt", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'OmniChannel Admin',
    'omnichannel-admin',
    'enterprise',
    'active',
    '{"timezone": "UTC", "language": "en"}',
    NULL,
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO NOTHING
RETURNING id;

-- Store the admin tenant ID
DO $$
DECLARE
    admin_tenant_id uuid;
    demo_tenant_id uuid;
BEGIN
    -- Get admin tenant ID
    SELECT id INTO admin_tenant_id FROM tenants WHERE slug = 'omnichannel-admin';
    
    -- Insert admin user
    INSERT INTO users (id, "tenantId", email, "passwordHash", "firstName", "lastName", role, status, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        admin_tenant_id,
        'admin@omnichannel.app',
        -- Password: Admin@123 (bcrypt hash)
        '$2a$10$7kqm5YsK1pHJ3mVH9f.8S.oGp.Pk5zrKm8F/wF5qHh8.5zKm8F/wF',
        'Admin',
        'User',
        'owner',
        'active',
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO NOTHING;
    
    -- Insert demo tenant
    INSERT INTO tenants (id, name, slug, "subscriptionTier", status, settings, "trialEndsAt", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Demo Company',
        'demo-company',
        'professional',
        'trial',
        '{"timezone": "UTC", "language": "en"}',
        NOW() + INTERVAL '14 days',
        NOW(),
        NOW()
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO demo_tenant_id;
    
    -- Get demo tenant ID
    SELECT id INTO demo_tenant_id FROM tenants WHERE slug = 'demo-company';
    
    -- Insert demo user
    INSERT INTO users (id, "tenantId", email, "passwordHash", "firstName", "lastName", role, status, "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        demo_tenant_id,
        'user@omnichannel.app',
        -- Password: User@123 (bcrypt hash)  
        '$2a$10$7kqm5YsK1pHJ3mVH9f.8S.oGp.Pk5zrKm8F/wF5qHh8.5zKm8F/wF',
        'Demo',
        'User',
        'agent',
        'active',
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO NOTHING;
END $$;

SELECT 'Seed completed!' AS status;
