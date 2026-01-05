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
                        window.location.href = '/login';
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
// Template Library endpoints (admin-created templates for users)
export const templateLibrary = {
    // Automation templates
    getAutomationTemplates: async (category?: string): Promise<AdminAutomationTemplate[]> => {
        try {
            return await api.get<AdminAutomationTemplate[]>('/templates/library/automation', { params: { category } });
        } catch {
            return [];
        }
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
        try {
            return await api.get<AdminEmailTemplate[]>('/templates/library/email', { params: { category } });
        } catch {
            return [];
        }
    },

    getEmailTemplate: (id: string) =>
        api.get<AdminEmailTemplate>(`/templates/library/email/${id}`),
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
    send: (data: { channelId: string; to: string; subject: string; html?: string; text?: string }) =>
        api.post('/email/send', data),
    sendTemplate: (data: { channelId: string; to: string; templateId: string; variables: Record<string, string> }) =>
        api.post('/email/send-template', data),
};

// Inbox API
export const inboxApi = {
    getConversations: (params?: { status?: string; channelType?: string; limit?: number; offset?: number }) =>
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
