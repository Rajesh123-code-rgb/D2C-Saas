import { api } from './api';

export interface TopUpPackage {
    id: string;
    name: string;
    description: string;
    credits: number;
    bonusCredits: number;
    totalCredits: number;
    price: number;
    currency: string;
    isPopular: boolean;
    isBestValue: boolean;
}

export interface MessageWallet {
    id: string;
    tenantId: string;
    creditBalance: number;
    currencyBalance: number;
    currency: string;
    autoRechargeEnabled: boolean;
    autoRechargeThreshold: number;
    autoRechargeAmount: number;
    status: 'active' | 'suspended';
}

export interface MessageTransaction {
    id: string;
    type: 'credit' | 'debit' | 'refund';
    creditsAmount: number;
    currencyAmount: number;
    description: string;
    status: 'pending' | 'completed' | 'failed';
    createdAt: string;
}

export const billingApi = {
    getWallet: async (tenantId: string): Promise<MessageWallet> => {
        return api.get<MessageWallet>(`/billing/wallet/${tenantId}`);
    },

    getPackages: async (): Promise<TopUpPackage[]> => {
        return api.get<TopUpPackage[]>('/billing/packages');
    },

    getTransactions: async (tenantId: string, params?: any): Promise<{ data: MessageTransaction[]; total: number }> => {
        return api.get(`/billing/transactions/${tenantId}`, params);
    },

    purchaseCredits: async (data: {
        tenantId: string;
        packageId?: string;
        amount?: number;
        paymentMethodId?: string;
    }) => {
        return api.post('/billing/purchase', data);
    },

    updateWalletSettings: async (tenantId: string, settings: Partial<MessageWallet>) => {
        return api.put(`/billing/wallet/${tenantId}/settings`, settings);
    },
};
