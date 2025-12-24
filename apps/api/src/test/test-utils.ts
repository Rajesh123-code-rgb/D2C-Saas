import { User, UserRole, UserStatus } from '../modules/users/user.entity';
import { Tenant, TenantStatus, SubscriptionTier } from '../modules/tenants/tenant.entity';

/**
 * Test Utilities for creating mock entities and data
 */

export const mockTenant = (overrides: Partial<Tenant> = {}): Tenant => ({
    id: 'test-tenant-id',
    name: 'Test Company',
    slug: 'test-company',
    subscriptionTier: SubscriptionTier.FREE,
    status: TenantStatus.ACTIVE,
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    settings: { timezone: 'UTC', language: 'en' },
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
    contacts: [],
    channels: [],
    ...overrides,
} as Tenant);

export const mockUser = (overrides: Partial<User> = {}): User => ({
    id: 'test-user-id',
    tenantId: 'test-tenant-id',
    email: 'test@example.com',
    passwordHash: '$2a$10$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    avatarUrl: null,
    settings: {},
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: mockTenant(),
    assignedConversations: [],
    get fullName() { return `${this.firstName} ${this.lastName}`; },
    ...overrides,
} as User);

export const mockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        getManyAndCount: jest.fn(),
    })),
});

export const mockJwtService = () => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
    decode: jest.fn(),
});

export const mockConfigService = () => ({
    get: jest.fn((key: string) => {
        const config: Record<string, any> = {
            JWT_SECRET: 'test-secret',
            JWT_EXPIRES_IN: '7d',
            NODE_ENV: 'test',
        };
        return config[key];
    }),
});
