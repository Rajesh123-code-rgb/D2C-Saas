/**
 * Admin API Client
 * Handles all API calls to the admin backend with proper authentication
 */

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api/v1';

interface FetchOptions extends RequestInit {
    params?: Record<string, string | number | boolean | undefined>;
}

class AdminApiClient {
    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('admin_token');
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
        const url = new URL(`${API_BASE_URL}${endpoint}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.append(key, String(value));
                }
            });
        }
        return url.toString();
    }

    async fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
        const { params, ...fetchOptions } = options;
        const url = this.buildUrl(endpoint, params);

        const response = await fetch(url, {
            ...fetchOptions,
            headers: {
                ...this.getHeaders(),
                ...fetchOptions.headers,
            },
        });

        if (response.status === 401) {
            // Token expired or invalid, redirect to login
            if (typeof window !== 'undefined') {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
                window.location.href = '/admin/login';
            }
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || 'Request failed');
        }

        return response.json();
    }

    // GET request
    async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
        return this.fetch<T>(endpoint, { method: 'GET', params });
    }

    // POST request
    async post<T>(endpoint: string, data?: any): Promise<T> {
        return this.fetch<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    // PUT request
    async put<T>(endpoint: string, data?: any): Promise<T> {
        return this.fetch<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    // PATCH request
    async patch<T>(endpoint: string, data?: any): Promise<T> {
        return this.fetch<T>(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    // DELETE request
    async delete<T>(endpoint: string): Promise<T> {
        return this.fetch<T>(endpoint, { method: 'DELETE' });
    }
}

export const adminApi = new AdminApiClient();

// ============ Dashboard APIs ============
export const dashboardApi = {
    getStats: () => adminApi.get<DashboardStats>('/admin/dashboard/stats'),
    getRecentAlerts: () => adminApi.get<Alert[]>('/admin/dashboard/alerts'),
    getRecentTransactions: (limit = 5) =>
        adminApi.get<Transaction[]>('/admin/billing/transactions', { limit }),
};

// ============ Organizations APIs ============
export const organizationsApi = {
    getAll: (params?: { page?: number; limit?: number; status?: string; tier?: string; search?: string }) =>
        adminApi.get<PaginatedResponse<Organization>>('/admin/organizations', params),
    getById: (id: string) => adminApi.get<Organization>(`/admin/organizations/${id}`),
    suspend: (id: string, reason: string) => adminApi.post(`/admin/organizations/${id}/suspend`, { reason }),
    reactivate: (id: string) => adminApi.post(`/admin/organizations/${id}/reactivate`),
    updatePlan: (id: string, data: { planId: string }) =>
        adminApi.put<Organization>(`/admin/organizations/${id}/plan`, data),
    impersonate: (id: string) =>
        adminApi.post<{ accessToken: string; user: any; tenant: any }>(`/admin/organizations/${id}/impersonate`, {}),
};

// ============ Users APIs ============
export const usersApi = {
    getAll: (params?: { page?: number; limit?: number; role?: string }) =>
        adminApi.get<PaginatedResponse<AdminUser>>('/admin/users', params),
    getById: (id: string) => adminApi.get<AdminUser>(`/admin/users/${id}`),
    create: (data: CreateAdminUserDto) => adminApi.post<AdminUser>('/admin/users', data),
    update: (id: string, data: Partial<AdminUser>) => adminApi.put<AdminUser>(`/admin/users/${id}`, data),
    delete: (id: string) => adminApi.delete(`/admin/users/${id}`),
    resetPassword: (id: string) => adminApi.post(`/admin/users/${id}/reset-password`),
    toggleStatus: (id: string, status: 'active' | 'suspended') =>
        adminApi.patch(`/admin/users/${id}/status`, { status }),
};

// ============ Feature Flags APIs ============
export const featureFlagsApi = {
    getAll: (params?: { category?: string }) =>
        adminApi.get<FeatureFlag[]>('/admin/features', params),
    getById: (id: string) => adminApi.get<FeatureFlag>(`/admin/features/${id}`),
    create: (data: CreateFeatureFlagDto) => adminApi.post<FeatureFlag>('/admin/features', data),
    update: (id: string, data: Partial<FeatureFlag>) => adminApi.put<FeatureFlag>(`/admin/features/${id}`, data),
    toggle: (id: string, isActive: boolean) => adminApi.patch(`/admin/features/${id}/toggle`, { isActive }),
    delete: (id: string) => adminApi.delete(`/admin/features/${id}`),
};

// ============ Billing APIs ============
export const billingApi = {
    // Wallets
    getWallets: (params?: { page?: number; limit?: number; search?: string }) =>
        adminApi.get<PaginatedResponse<Wallet>>('/admin/billing/wallets', params),
    getWallet: (tenantId: string) => adminApi.get<Wallet>(`/admin/billing/wallets/${tenantId}`),
    addCredits: (tenantId: string, data: { credits: number; reason: string }) =>
        adminApi.post(`/admin/billing/wallets/${tenantId}/credits`, data),

    // Transactions
    getTransactions: (params?: { page?: number; limit?: number; tenantId?: string; type?: string }) =>
        adminApi.get<PaginatedResponse<Transaction>>('/admin/billing/transactions', params),
    getTenantTransactions: (tenantId: string, params?: { page?: number; limit?: number; type?: string }) =>
        adminApi.get<PaginatedResponse<Transaction>>(`/admin/billing/transactions/tenant/${tenantId}`, params),

    // Revenue
    getRevenueStats: (period?: string) =>
        adminApi.get<RevenueStats>('/admin/billing/revenue', { period }),

    // Refunds
    processRefund: (data: { transactionId: string; amount?: number; reason: string }) =>
        adminApi.post('/admin/billing/refund', data),
};

// ============ Packages APIs ============
export const packagesApi = {
    getAll: () => adminApi.get<TopUpPackage[]>('/admin/billing/packages'),
    getById: (id: string) => adminApi.get<TopUpPackage>(`/admin/billing/packages/${id}`),
    create: (data: CreatePackageDto) => adminApi.post<TopUpPackage>('/admin/billing/packages', data),
    update: (id: string, data: Partial<TopUpPackage>) =>
        adminApi.put<TopUpPackage>(`/admin/billing/packages/${id}`, data),
    delete: (id: string) => adminApi.delete(`/admin/billing/packages/${id}`),
};

// ============ Pricing APIs ============
export const pricingApi = {
    getAll: () => adminApi.get<ConversationPricing[]>('/admin/billing/pricing'),
    getByCountry: () => adminApi.get<Record<string, ConversationPricing[]>>('/admin/billing/pricing/grouped'),
    create: (data: CreatePricingDto) => adminApi.post<ConversationPricing>('/admin/billing/pricing', data),
    update: (id: string, data: Partial<ConversationPricing>) =>
        adminApi.put<ConversationPricing>(`/admin/billing/pricing/${id}`, data),
};

// ============ Audit Logs APIs ============
export const auditLogsApi = {
    getAll: (params?: {
        page?: number;
        limit?: number;
        action?: string;
        resourceType?: string;
        adminId?: string;
        startDate?: string;
        endDate?: string;
        tenantId?: string;
    }) => adminApi.get<PaginatedResponse<AuditLog>>('/admin/audit-logs', params),
    getById: (id: string) => adminApi.get<AuditLog>(`/admin/audit-logs/${id}`),
    export: (params?: { startDate?: string; endDate?: string }) =>
        adminApi.get<{ url: string }>('/admin/audit-logs/export', params),
};

// ============ Settings APIs ============
export const settingsApi = {
    get: () => adminApi.get<PlatformSettings>('/admin/settings'),
    update: (data: Partial<PlatformSettings>) => adminApi.put<PlatformSettings>('/admin/settings', data),
    getIntegrations: () => adminApi.get<IntegrationSettings>('/admin/settings/integrations'),
    updateIntegrations: (data: Partial<IntegrationSettings>) =>
        adminApi.put<IntegrationSettings>('/admin/settings/integrations', data),
    getSeoSettings: () => adminApi.get<GlobalSeoSettings>('/admin/settings/seo'),
    updateSeoSettings: (data: Partial<GlobalSeoSettings>) =>
        adminApi.put<GlobalSeoSettings>('/admin/settings/seo', data),
};

// ============ Governance APIs ============
export const governanceApi = {
    getAutomationPolicy: () => adminApi.get<AutomationPolicy>('/admin/governance/automation'),
    updateAutomationPolicy: (data: Partial<AutomationPolicy>) =>
        adminApi.put<AutomationPolicy>('/admin/governance/automation', data),
    validateAutomation: (tenantId: string, automation: any) =>
        adminApi.post('/admin/governance/automation/validate', { tenantId, automation }),
    getTemplatePolicy: () => adminApi.get<WhatsAppTemplatePolicy>('/admin/governance/templates/policy'),
    updateTemplatePolicy: (data: Partial<WhatsAppTemplatePolicy>) =>
        adminApi.put<WhatsAppTemplatePolicy>('/admin/governance/templates/policy', data),
    validateTemplate: (tenantId: string, template: any) =>
        adminApi.post('/admin/governance/templates/validate', { tenantId, template }),
    getMonitoringTemplates: (params?: { tenantId?: string; status?: string; category?: string; limit?: number; offset?: number }) =>
        adminApi.get<{ templates: any[]; total: number }>('/admin/governance/templates/monitoring', params),
    getEmailPolicy: () => adminApi.get<EmailTemplatePolicy>('/admin/governance/email'),
    updateEmailPolicy: (data: Partial<EmailTemplatePolicy>) =>
        adminApi.put<EmailTemplatePolicy>('/admin/governance/email', data),
    validateEmail: (tenantId: string, email: any) =>
        adminApi.post('/admin/governance/email/validate', { tenantId, email }),
};

// ============ System Usage APIs ============
export const systemUsageApi = {
    getOverview: () => adminApi.get<SystemUsageOverview>('/admin/system-usage/overview'),
    getDatabaseStats: () => adminApi.get<DatabaseStats>('/admin/system-usage/database'),
};

// ============ Template Builders APIs ============
export const buildersApi = {
    // Stats
    getStats: () => adminApi.get<BuilderStats>('/super-admin/builders/stats'),

    // Automation Templates
    getAutomationTemplates: (params?: { category?: string; isActive?: boolean }) =>
        adminApi.get<AutomationTemplateDto[]>('/super-admin/builders/automation', params),
    getAutomationTemplate: (id: string) =>
        adminApi.get<AutomationTemplateDto>(`/super-admin/builders/automation/${id}`),
    createAutomationTemplate: (data: Partial<AutomationTemplateDto>) =>
        adminApi.post<AutomationTemplateDto>('/super-admin/builders/automation', data),
    updateAutomationTemplate: (id: string, data: Partial<AutomationTemplateDto>) =>
        adminApi.put<AutomationTemplateDto>(`/super-admin/builders/automation/${id}`, data),
    deleteAutomationTemplate: (id: string) =>
        adminApi.delete(`/super-admin/builders/automation/${id}`),

    // WhatsApp Templates
    getWhatsAppTemplates: (params?: { category?: string; status?: string }) =>
        adminApi.get<WhatsAppTemplateDto[]>('/super-admin/builders/whatsapp', params),
    getWhatsAppTemplate: (id: string) =>
        adminApi.get<WhatsAppTemplateDto>(`/super-admin/builders/whatsapp/${id}`),
    createWhatsAppTemplate: (data: Partial<WhatsAppTemplateDto>) =>
        adminApi.post<WhatsAppTemplateDto>('/super-admin/builders/whatsapp', data),
    updateWhatsAppTemplate: (id: string, data: Partial<WhatsAppTemplateDto>) =>
        adminApi.put<WhatsAppTemplateDto>(`/super-admin/builders/whatsapp/${id}`, data),
    deleteWhatsAppTemplate: (id: string) =>
        adminApi.delete(`/super-admin/builders/whatsapp/${id}`),

    // Email Templates
    getEmailTemplates: (params?: { category?: string; status?: string }) =>
        adminApi.get<EmailTemplateDto[]>('/super-admin/builders/email', params),
    getEmailTemplate: (id: string) =>
        adminApi.get<EmailTemplateDto>(`/super-admin/builders/email/${id}`),
    createEmailTemplate: (data: Partial<EmailTemplateDto>) =>
        adminApi.post<EmailTemplateDto>('/super-admin/builders/email', data),
    updateEmailTemplate: (id: string, data: Partial<EmailTemplateDto>) =>
        adminApi.put<EmailTemplateDto>(`/super-admin/builders/email/${id}`, data),
    deleteEmailTemplate: (id: string) =>
        adminApi.delete(`/super-admin/builders/email/${id}`),
};

// Builder Types
export interface BuilderStats {
    automation: { total: number; active: number };
    whatsapp: { total: number; active: number };
    email: { total: number; active: number };
}

export interface AutomationTemplateDto {
    id: string;
    name: string;
    description: string;
    category: string;
    triggerType: string;
    nodes: { id: string; type: string; name: string; config: Record<string, any> }[];
    isActive: boolean;
    allowedPlans: string[];
    usageCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface WhatsAppTemplateDto {
    id: string;
    name: string;
    displayName: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;
    headerType: 'none' | 'text' | 'image' | 'video' | 'document';
    headerContent: string;
    bodyText: string;
    footerText: string;
    buttons: { type: string; text: string; value?: string }[];
    status: 'draft' | 'active' | 'archived';
    allowedPlans: string[];
    usageCount: number;
    createdAt: string;
}

export interface EmailTemplateDto {
    id: string;
    name: string;
    displayName: string;
    category: 'newsletter' | 'promotional' | 'transactional' | 'notification';
    subject: string;
    preheader: string;
    htmlContent: string;
    textContent: string;
    status: 'draft' | 'active' | 'archived';
    allowedPlans: string[];
    usageCount: number;
    createdAt: string;
}

export interface SystemUsageOverview {
    system: {
        tenants: { total: number; active: number };
        users: { total: number };
        automations: { total: number };
        messages: { total: number };
        conversations: { total: number };
    };
    activity: {
        date: string;
        activeUsers: number;
        messagesSent: number;
    }[];
}

export interface DatabaseStats {
    sizeBytes: number;
    tableStats: {
        tableName: string;
        rowCount: number;
    }[];
}

export interface WhatsAppTemplatePolicy {
    id: string;
    isGlobal: boolean;
    allowedCategories: {
        free: { MARKETING: boolean; UTILITY: boolean; AUTHENTICATION: boolean };
        starter: { MARKETING: boolean; UTILITY: boolean; AUTHENTICATION: boolean };
        pro: { MARKETING: boolean; UTILITY: boolean; AUTHENTICATION: boolean };
        enterprise: { MARKETING: boolean; UTILITY: boolean; AUTHENTICATION: boolean };
    };
    maxTemplatesPerDay: {
        free: number;
        starter: number;
        pro: number;
        enterprise: number;
    };
    prohibitedKeywords: string[];
    requireManualReview: boolean;
    autoRejectProhibited: boolean;
    updatedAt: string;
}

export interface EmailTemplatePolicy {
    id: string;
    isGlobal: boolean;
    maxDailyEmails: {
        free: number;
        starter: number;
        pro: number;
        enterprise: number;
    };
    prohibitedKeywords: string[];
    requireDomainVerification: boolean;
    allowedAttachmentTypes: string[];
    maxAttachmentSize: number;
    updatedAt: string;
}

// ============ Type Definitions ============
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface DashboardStats {
    organizations: { total: number; active: number; trial: number };
    users: { total: number; active: number };
    revenue: { today: number; month: number; growth: number };
    messages: { today: number; month: number };
    emails: { today: number; month: number };
    conversations: { marketing: number; utility: number; service: number };
    campaigns?: {
        total: number;
        active: number;
        abTestCampaigns: number;
        emailCampaigns: number;
        whatsappCampaigns: number;
    };
    channelStats?: {
        whatsapp: { messages: number; mediaUploads: number; conversations: number };
        email: { sent: number; opened: number; clicked: number; openRate: number };
    };
}

export interface Alert {
    id: string;
    type: 'warning' | 'success' | 'info' | 'error';
    message: string;
    time: string;
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
    status: 'active' | 'trial' | 'suspended' | 'cancelled';
    subscriptionTier: 'free' | 'starter' | 'pro' | 'enterprise';
    usersCount: number;
    channelsCount: number;
    creditsBalance: number;
    messagesThisMonth: number;
    createdAt: string;
    lastActiveAt: string;
}

export interface AdminUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'PLATFORM_ADMIN' | 'SUPPORT' | 'VIEWER';
    status: 'active' | 'inactive' | 'suspended';
    lastLoginAt: string | null;
    twoFactorEnabled: boolean;
    createdAt: string;
    permissions: Record<string, boolean>;
}

export interface CreateAdminUserDto {
    email: string;
    firstName: string;
    lastName: string;
    role: 'PLATFORM_ADMIN' | 'SUPPORT' | 'VIEWER';
    password: string;
}

export interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description: string;
    category: string;
    type: 'boolean' | 'plan_gated' | 'percentage' | 'tenant_list';
    defaultValue: boolean;
    planOverrides?: Record<string, boolean>;
    rolloutPercentage: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFeatureFlagDto {
    key: string;
    name: string;
    description: string;
    category: string;
    type: 'boolean' | 'plan_gated' | 'percentage' | 'tenant_list';
    defaultValue: boolean;
    planOverrides?: Record<string, boolean>;
}

export interface Wallet {
    id: string;
    tenantId: string;
    tenantName?: string;
    creditBalance: number;
    currencyBalance: number;
    currency: string;
    status: 'active' | 'suspended' | 'depleted';
    autoRechargeEnabled: boolean;
    lastTransactionAt: string;
}

export interface Transaction {
    id: string;
    tenantId: string;
    tenantName?: string;
    type: 'credit' | 'debit' | 'refund' | 'adjustment' | 'plan_allocation';
    creditsAmount: number;
    currencyAmount: number;
    description: string;
    status: string;
    createdAt: string;
}

export interface RevenueStats {
    today: { revenue: number; transactions: number };
    week: { revenue: number; transactions: number };
    month: { revenue: number; transactions: number };
    metaCost: number;
    grossMargin: number;
    topTenants: { tenantId: string; tenantName: string; revenue: number }[];
}

export interface TopUpPackage {
    id: string;
    name: string;
    description: string;
    credits: number;
    bonusCredits: number;
    price: number;
    currency: string;
    isActive: boolean;
    isPopular: boolean;
    sortOrder: number;
}

export interface CreatePackageDto {
    name: string;
    description: string;
    credits: number;
    bonusCredits?: number;
    price: number;
    currency?: string;
}

export interface ConversationPricing {
    id: string;
    countryCode: string;
    countryName: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'SERVICE';
    metaCostUsd: number;
    platformCredits: number;
    platformCurrencyAmount: number;
    isActive: boolean;
}

export interface CreatePricingDto {
    countryCode: string;
    countryName: string;
    category: string;
    metaCostUsd: number;
    platformCredits: number;
    platformCurrencyAmount: number;
}

export interface AuditLog {
    id: string;
    adminId: string;
    adminEmail: string;
    adminName: string;
    action: string;
    resourceType: string;
    resourceId: string;
    resourceName: string;
    targetTenantId?: string;
    targetTenantName?: string;
    previousValues?: Record<string, any>;
    newValues?: Record<string, any>;
    description: string;
    ipAddress: string;
    success: boolean;
    createdAt: string;
}

export interface PlatformSettings {
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

export interface IntegrationSettings {
    metaAppId: string;
    metaAppSecret: string;
    stripePublicKey: string;
    stripeSecretKey: string;
    sendgridApiKey: string;
    openaiApiKey: string;
}

export interface GlobalSeoSettings {
    id: string;
    siteTitle: string;
    siteDescription: string;
    keywords: string[];
    ogImageUrl: string;
    twitterHandle: string;
    googleAnalyticsId: string;
    faviconUrl?: string;
    robotsTxt?: string;
    sitemapUrl?: string;
    updatedAt: string;
}

export interface AutomationPolicy {
    id: string;
    name: string;
    description: string;
    globalKillSwitch: boolean;
    globalEnabled: boolean;
    allowedTriggers: {
        free: string[];
        starter: string[];
        pro: string[];
        enterprise: string[];
    };
    allowedActions: {
        free: string[];
        starter: string[];
        pro: string[];
        enterprise: string[];
    };
    planLimits: {
        free: { maxAutomations: number; maxStepsPerAutomation: number; maxExecutionsPerDay: number };
        starter: { maxAutomations: number; maxStepsPerAutomation: number; maxExecutionsPerDay: number };
        pro: { maxAutomations: number; maxStepsPerAutomation: number; maxExecutionsPerDay: number };
        enterprise: { maxAutomations: number; maxStepsPerAutomation: number; maxExecutionsPerDay: number };
    };
    blockSettings: {
        conditionalBranching: { enabled: boolean; allowedPlans: string[] };
        delaySteps: { enabled: boolean; allowedPlans: string[] };
        webhookCalls: { enabled: boolean; allowedPlans: string[] };
        aiActions: { enabled: boolean; allowedPlans: string[] };
    };
    updatedAt: string;
}
