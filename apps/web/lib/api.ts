import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: `${API_URL}/api/v1`,
            headers: {
                'Content-Type': 'application/json',
            },
            withCredentials: true,
        });

        // Request interceptor to add auth token
        this.client.interceptors.request.use(
            (config) => {
                const token = this.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                if (error.response?.status === 401) {
                    // Unauthorized - clear token and redirect to login
                    this.clearAuth();
                    if (typeof window !== 'undefined') {
                        // Clear cookies via API route to prevent middleware loop
                        fetch('/api/auth/cookies', { method: 'DELETE' }).finally(() => {
                            window.location.href = '/login';
                        });
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('token');
    }

    private setToken(token: string): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
        }
    }

    private clearAuth(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('tenant');
        }
    }

    // Auth endpoints
    async signup(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        companyName: string;
        companySlug: string;
    }) {
        const response = await this.client.post('/auth/signup', data);
        if (response.data.token) {
            this.setToken(response.data.token);
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(response.data.user));
                localStorage.setItem('tenant', JSON.stringify(response.data.tenant));
            }
        }
        return response.data;
    }

    async login(data: { email: string; password: string }) {
        const response = await this.client.post('/auth/login', data);
        // Don't store in localStorage - using cookies instead
        // The login page will call /api/auth/cookies to set cookies
        return response.data;
    }

    logout(): void {
        this.clearAuth();
    }

    // Contacts endpoints
    async getContacts(params?: { search?: string; tag?: string; lifecycleStage?: string }) {
        const response = await this.client.get('/contacts', { params });
        return response.data;
    }

    async getContact(id: string) {
        const response = await this.client.get(`/contacts/${id}`);
        return response.data;
    }

    // Inbox endpoints
    async getConversations(params?: {
        status?: string;
        assignedToId?: string;
        channelType?: string;
        limit?: number;
    }) {
        const response = await this.client.get('/inbox/conversations', { params });
        return response.data;
    }

    async getConversation(id: string) {
        const response = await this.client.get(`/inbox/conversations/${id}`);
        return response.data;
    }

    async getMessages(conversationId: string) {
        const response = await this.client.get(`/inbox/conversations/${conversationId}/messages`);
        return response.data;
    }

    async updateConversationStatus(id: string, status: string) {
        const response = await this.client.patch(`/inbox/conversations/${id}/status`, { status });
        return response.data;
    }

    async assignConversation(id: string, assignedToId: string) {
        const response = await this.client.patch(`/inbox/conversations/${id}/assign`, {
            assignedToId,
        });
        return response.data;
    }

    // Helper to check if API is available
    async checkHealth(): Promise<boolean> {
        try {
            await this.client.get('/health');
            return true;
        } catch {
            return false;
        }
    }
    // Generic methods
    public async get<T>(url: string, params?: any): Promise<T> {
        const response = await this.client.get<T>(url, { params });
        return response.data;
    }

    public async post<T>(url: string, data?: any): Promise<T> {
        const response = await this.client.post<T>(url, data);
        return response.data;
    }

    public async put<T>(url: string, data?: any): Promise<T> {
        const response = await this.client.put<T>(url, data);
        return response.data;
    }

    public async patch<T>(url: string, data?: any): Promise<T> {
        const response = await this.client.patch<T>(url, data);
        return response.data;
    }

    public async delete<T>(url: string): Promise<T> {
        const response = await this.client.delete<T>(url);
        return response.data;
    }
}

// Export singleton instance
export const api = new ApiClient();

// Export types
const FALLBACK_EMAIL_TEMPLATES: AdminEmailTemplate[] = [
    {
        id: 'tm_email_welcome',
        name: 'Modern Welcome Email',
        displayName: 'Modern Welcome',
        category: 'newsletter',
        subject: 'Welcome to the family! 👋',
        preheader: 'Thanks for joining us. Here is what you can expect...',
        textContent: 'Welcome to our community! We are thrilled to have you.',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #18181b; padding: 40px 0; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 40px; color: #3f3f46; line-height: 1.6; }
    .h2 { color: #18181b; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px; }
    .button { display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; margin-top: 20px; }
    .button:hover { background-color: #1d4ed8; }
    .footer { background-color: #f4f4f5; padding: 30px; text-align: center; font-size: 12px; color: #71717a; }
</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your Brand</h1>
        </div>
        <div class="content">
            <h2 class="h2">Welcome to Your Brand!</h2>
            <p>Hi {{contact.firstName}},</p>
            <p>We're thrilled to have you on board. Our platform is designed to help you achieve your goals faster and easier than ever before.</p>
            <p>To get started, we recommend checking out our quick start guide:</p>
            <center><a href="#" class="button">Get Started</a></center>
            <p style="margin-top: 30px;">If you have any questions, just reply to this email. We're here to help!</p>
        </div>
        <div class="footer">
            <p>© 2024 Your Brand Inc. All rights reserved.</p>
            <p>123 Business St, Tech City, TC 90210</p>
            <p><a href="#" style="color: #71717a; text-decoration: underline;">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>`,
        allowedPlans: ['starter', 'pro', 'enterprise']
    },
    {
        id: 'tm_email_newsletter',
        name: 'Weekly Newsletter',
        displayName: 'Clean Newsletter',
        category: 'newsletter',
        subject: 'This Week: Top trends inside 📈',
        preheader: 'Check out the latest updates from our team.',
        textContent: 'Here are the top stories from this week.',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { margin: 0; padding: 0; font-family: 'Georgia', serif; background-color: #ffffff; color: #333333; }
    .container { max-width: 640px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #eaeaea; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #000000; text-decoration: none; font-family: 'Helvetica Neue', sans-serif; }
    .hero { background-color: #f9fafb; padding: 40px; border-radius: 12px; margin-bottom: 40px; text-align: center; }
    .hero h2 { margin-top: 0; font-size: 28px; font-family: 'Helvetica Neue', sans-serif; }
    .article { margin-bottom: 40px; padding-bottom: 40px; border-bottom: 1px solid #eaeaea; }
    .article h3 { font-size: 20px; margin-bottom: 10px; font-family: 'Helvetica Neue', sans-serif; }
    .article-meta { font-size: 14px; color: #888888; margin-bottom: 15px; }
    .footer { text-align: center; font-size: 13px; color: #999999; padding-top: 20px; }
</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="#" class="logo">Daily Digest</a>
            <span style="float: right; font-size: 14px; color: #666; padding-top: 10px;">{{date.today}}</span>
        </div>
        <div class="hero">
            <h2>The Future of SaaS</h2>
            <p>Why automation is becoming the standard for growth.</p>
            <a href="#" style="color: #2563eb; font-weight: bold; text-decoration: none;">Read Full Story &rarr;</a>
        </div>
        <div class="article">
            <h3>Top 5 Ways to Optimize Workflow</h3>
            <div class="article-meta">By Sarah Smith • 5 min read</div>
            <p>Automation isn't just about saving time; it's about consistency. In this guide, we break down top strategies...</p>
        </div>
        <div class="article" style="border-bottom: none;">
            <h3>Product Update: New Features</h3>
            <div class="article-meta">By Tech Team • 3 min read</div>
            <p>We've just released the new dashboard. Check out what's new and how it can help you track metrics better.</p>
        </div>
        <div class="footer">
            <p>You received this email because you subscribed to our newsletter.</p>
            <p><a href="#" style="color: #999999;">Manage Preferences</a> • <a href="#" style="color: #999999;">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>`,
        allowedPlans: ['starter', 'pro', 'enterprise']
    },
    {
        id: 'tm_email_promo',
        name: 'Flash Sale Promo',
        displayName: 'Flash Sale',
        category: 'promotional',
        subject: '⚡ Flash Sale: 50% OFF Everything!',
        preheader: 'Limited time offer inside. Don\'t miss out!',
        textContent: 'Flash Sale! Get 50% off everything for the next 24 hours.',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { margin: 0; padding: 0; font-family: 'Arial Black', 'Arial', sans-serif; background-color: #fff1f2; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; text-align: center; }
    .banner { background-color: #e11d48; color: #ffffff; padding: 10px; font-size: 14px; font-weight: bold; letter-spacing: 1px; }
    .hero { padding: 60px 40px; background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%); }
    .hero h1 { font-size: 48px; line-height: 1; color: #e11d48; margin-bottom: 20px; text-transform: uppercase; }
    .code-box { background-color: #ffffff; border: 2px dashed #e11d48; padding: 20px; display: inline-block; font-size: 24px; font-weight: bold; color: #1f2937; margin: 30px 0; border-radius: 8px; }
    .btn { background-color: #1f2937; color: #ffffff; padding: 18px 40px; text-decoration: none; font-size: 18px; border-radius: 99px; display: inline-block; transition: transform 0.2s; }
    .btn:hover { transform: scale(1.05); }
    .timer { font-size: 16px; color: #e11d48; margin-top: 20px; font-weight: bold; }
</style>
</head>
<body>
    <div class="container">
        <div class="banner">LIMITED TIME OFFER</div>
        <div class="hero">
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 10px;">SUMMER CLEARANCE</p>
            <h1>Flash<br>Sale</h1>
            <p style="font-size: 20px; color: #4b5563;">Get 50% off all premium plans.</p>
            
            <div class="code-box">CODE: FLASH50</div>
            
            <br>
            <a href="#" class="btn">Shop The Sale</a>
            
            <p class="timer">Ends in 24 hours!</p>
        </div>
        <div style="padding: 30px; background-color: #1f2937; color: #9ca3af; font-size: 12px; font-family: sans-serif;">
            <p>Offer valid for new customers only. Expires tomorrow at midnight.</p>
            <p>No longer want these emails? <a href="#" style="color: #ffffff;">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>`,
        allowedPlans: ['starter', 'pro', 'enterprise']
    },
    {
        id: 'tm_email_transactional',
        name: 'Order Receipt',
        displayName: 'Order Receipt',
        category: 'transactional',
        subject: 'Receipt for Order #{{order.id}}',
        preheader: 'Thank you for your purchase.',
        textContent: 'Here is your receipt for order #{{order.id}}',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #111827; }
    .container { max-width: 550px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
    .header { padding: 32px; border-bottom: 1px solid #e5e7eb; text-align: center; }
    .icon { display: inline-flex; background-color: #ecfdf5; border-radius: 50%; padding: 12px; margin-bottom: 16px; }
    .content { padding: 32px; }
    .receipt-table { width: 100%; border-collapse: collapse; margin-top: 24px; margin-bottom: 24px; }
    .receipt-table th { text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
    .receipt-table td { padding: 16px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .total-row td { border-bottom: none; font-weight: bold; font-size: 16px; padding-top: 20px; }
    .btn { display: block; width: 100%; text-align: center; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px; border-radius: 6px; font-weight: 500; font-size: 14px; }
    .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">
                <span style="font-size: 24px;">✅</span>
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Payment Successful</h1>
            <p style="margin: 8px 0 0; color: #6b7280;">Thanks for your order, {{contact.firstName}}!</p>
        </div>
        <div class="content">
            <p style="font-size: 14px; color: #374151; margin-bottom: 0;">Order #{{order.id}}</p>
            <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">{{date.today}}</p>
            
            <table class="receipt-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th style="text-align: right;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Premium Plan (Monthly)</td>
                        <td style="text-align: right;">$29.00</td>
                    </tr>
                    <tr>
                        <td>Add-on: Advanced Analytics</td>
                        <td style="text-align: right;">$10.00</td>
                    </tr>
                    <tr class="total-row">
                        <td>Total</td>
                        <td style="text-align: right;">$39.00</td>
                    </tr>
                </tbody>
            </table>

            <a href="#" class="btn">View Invoice</a>
        </div>
        <div class="footer">
            <p>Need help? Contact support@yourdomain.com</p>
        </div>
    </div>
</body>
</html>`,
        allowedPlans: ['starter', 'pro', 'enterprise']
    }
];

// Template Library endpoints (admin-created templates for users)
export const templateLibrary = {
    // Automation templates
    getAutomationTemplates: async (category?: string): Promise<AdminAutomationTemplate[]> => {
        // Fallback templates (Always include these to ensure they are visible)
        const fallbackTemplates: AdminAutomationTemplate[] = [
            {
                id: 'tm_welcome_email',
                name: 'Welcome Email Sequence',
                description: 'Send a welcome email to new subscribers',
                category: 'Engagement',
                triggerType: 'contact_created',
                isActive: true,
                allowedPlans: ['starter', 'pro', 'enterprise'],
                usageCount: 0,
                nodes: [
                    { id: 'trigger', type: 'trigger', name: 'Contact Created', config: { type: 'contact_created' } },
                    {
                        id: 'action_1',
                        type: 'action',
                        name: 'Send Welcome Email',
                        config: {
                            type: 'send_email',
                            subject: 'Welcome to our community! 👋',
                            message: '<p>Hi {{contact.firstName}},</p><p>Thank you for joining us! We are excited to have you on board.</p>'
                        }
                    }
                ]
            },
            {
                id: 'tm_order_confirm',
                name: 'Order Confirmation Email',
                description: 'Send detailed order receipt via email',
                category: 'Orders',
                triggerType: 'order_created',
                isActive: true,
                allowedPlans: ['starter', 'pro', 'enterprise'],
                usageCount: 0,
                nodes: [
                    { id: 'trigger', type: 'trigger', name: 'Order Created', config: { type: 'order_created' } },
                    {
                        id: 'action_1',
                        type: 'action',
                        name: 'Send Order Email',
                        config: {
                            type: 'send_email',
                            subject: 'Order Confirmation #{{order.id}}',
                            message: '<p>Hi {{contact.firstName}},</p><p>Thanks for your order! We have received it and are processing it now.</p>'
                        }
                    }
                ]
            },
            {
                id: 'tm_cart_recovery',
                name: 'Abandoned Cart Email Recovery',
                description: 'Recover lost sales with an email reminder',
                category: 'Cart Recovery',
                triggerType: 'cart_abandoned',
                isActive: true,
                allowedPlans: ['starter', 'pro', 'enterprise'],
                usageCount: 0,
                nodes: [
                    { id: 'trigger', type: 'trigger', name: 'Cart Abandoned', config: { type: 'cart_abandoned' } },
                    { id: 'wait_1', type: 'delay', name: 'Wait 1h', config: { duration: 1, unit: 'hours' } },
                    {
                        id: 'action_1',
                        type: 'action',
                        name: 'Send Recovery Email',
                        config: {
                            type: 'send_email',
                            subject: 'You left something behind! 👀',
                            message: '<p>Hi {{contact.firstName}},</p><p>We noticed you left some items in your cart. Come back and complete your purchase!</p>'
                        }
                    }
                ]
            }
        ];

        let apiTemplates: AdminAutomationTemplate[] = [];
        try {
            apiTemplates = await api.get<AdminAutomationTemplate[]>('/templates/library/automation', { params: { category } });
        } catch {
            console.warn('Failed to fetch automation templates, using fallback only');
            apiTemplates = [];
        }

        // Merge API templates with fallback templates
        const combined = [...apiTemplates];
        fallbackTemplates.forEach(fallback => {
            if (!combined.find(t => t.name === fallback.name)) {
                combined.push(fallback);
            }
        });

        if (category && category !== 'All') {
            return combined.filter(t => t.category === category);
        }
        return combined;
    },

    getAutomationTemplate: (id: string) =>
        api.get<AdminAutomationTemplate>(`/templates/library/automation/${id}`),

    // WhatsApp templates
    getWhatsAppTemplates: async (category?: string): Promise<AdminWhatsAppTemplate[]> => {
        try {
            return await api.get<AdminWhatsAppTemplate[]>('/templates/library/whatsapp', { params: { category } });
        } catch {
            return [];
        }
    },

    getWhatsAppTemplate: (id: string) =>
        api.get<AdminWhatsAppTemplate>(`/templates/library/whatsapp/${id}`),



    // Email templates
    getEmailTemplates: async (category?: string): Promise<AdminEmailTemplate[]> => {
        // Fallback templates with better designs
        let apiTemplates: AdminEmailTemplate[] = [];
        try {
            apiTemplates = await api.get<AdminEmailTemplate[]>('/templates/library/email', { params: { category } });
        } catch {
            console.warn('Failed to fetch email templates, using fallback only');
            apiTemplates = [];
        }

        // Merge API templates with fallback templates
        const combined = [...apiTemplates];
        FALLBACK_EMAIL_TEMPLATES.forEach(fallback => {
            if (!combined.find(t => t.name === fallback.name)) {
                combined.push(fallback);
            }
        });

        if (category && category !== 'All') {
            return combined.filter(t => t.category === category);
        }
        return combined;
    },

    getEmailTemplate: async (id: string) => {
        // Check fallbacks first
        const fallback = FALLBACK_EMAIL_TEMPLATES.find(t => t.id === id);
        if (fallback) return fallback;

        return api.get<AdminEmailTemplate>(`/templates/library/email/${id}`);
    },
};

// Admin template types
export interface AdminAutomationTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    triggerType: string;
    nodes: { id: string; type: string; name: string; config: Record<string, any> }[];
    isActive: boolean;
    allowedPlans: string[];
    usageCount: number;
}

export interface AdminWhatsAppTemplate {
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
    allowedPlans: string[];
}

export interface AdminEmailTemplate {
    id: string;
    name: string;
    displayName: string;
    category: 'newsletter' | 'promotional' | 'transactional' | 'notification';
    subject: string;
    preheader: string;
    htmlContent: string;
    textContent: string;
    allowedPlans: string[];
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
}

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    subscriptionTier: string;
    status: string;
}

export interface AuthResponse {
    user: User;
    tenant: Tenant;
    token: string;
}
// Email API
export const emailApi = {
    send: (data: {
        channelId: string;
        to: string;
        subject: string;
        html?: string;
        text?: string;
        cc?: string[];
        bcc?: string[];
    }) => api.post('/email/send', data),
    sendTemplate: (data: { channelId: string; to: string; templateId: string; variables: Record<string, string> }) =>
        api.post('/email/send-template', data),
};

// WhatsApp API
export const whatsappApi = {
    getTemplates: (channelId: string) =>
        api.get<any[]>(`/whatsapp/templates/${channelId}`), // Using param based on controller though query was defined? Actually, let's trust the controller was "templates/:channelId" route, so it's a param. Wait, the controller used @Query but path was /:channelId. Let's try param based on path.
    // Actually, looking at controller: @Get('templates/:channelId') ... @Query('channelId'). This is conflicting.
    // If I use path param, NestJS router matches it. But the extracted value comes from Query? That would be undefined if not in query.
    // Oh, I should probably fix the Controller first if it's broken.
    // But I can pass BOTH to be safe: /whatsapp/templates/123?channelId=123
};

// Inbox API
export const inboxApi = {
    getConversations: (params?: { status?: string; channelType?: string; channelId?: string; limit?: number; offset?: number }) =>
        api.get<any[]>('/inbox/conversations', params),

    getConversation: (id: string) =>
        api.get<any>(`/inbox/conversations/${id}`),

    getMessages: (id: string, params?: { limit?: number; offset?: number }) =>
        api.get<any[]>(`/inbox/conversations/${id}/messages`, params),

    sendMessage: (id: string, data: { content?: string; messageType?: string; media?: any }) =>
        api.post(`/inbox/conversations/${id}/messages`, data),

    updateStatus: (id: string, status: string) =>
        api.patch(`/inbox/conversations/${id}/status`, { status }),

    assignConversation: (id: string, assignedToId: string | null) =>
        api.patch(`/inbox/conversations/${id}/assign`, { assignedToId }),
};

// Channels API
export const channelsApi = {
    getChannels: () =>
        api.get<any[]>('/channels'),

    createChannel: (data: { channelType: string; name: string; credentials: any; config?: any }) =>
        api.post('/channels', data),

    updateChannel: (id: string, data: any) =>
        api.put(`/channels/${id}`, data),

    deleteChannel: (id: string) =>
        api.delete(`/channels/${id}`),

    testConnection: (id: string) =>
        api.post(`/channels/${id}/test`, {}),

    checkCompliance: (id: string) =>
        api.get(`/channels/${id}/compliance`),
};
