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
}

// Export singleton instance
export const api = new ApiClient();

// Export types
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
