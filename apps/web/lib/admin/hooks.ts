/**
 * Admin Dashboard Custom Hooks
 * React hooks for data fetching with SWR-like behavior
 */

import { useState, useEffect, useCallback } from 'react';
import {
    dashboardApi,
    organizationsApi,
    usersApi,
    featureFlagsApi,
    billingApi,
    auditLogsApi,
    settingsApi,
    DashboardStats,
    Organization,
    AdminUser,
    FeatureFlag,
    Wallet,
    Transaction,
    RevenueStats,
    AuditLog,
    PlatformSettings,
    PaginatedResponse,
} from './api';

// Generic fetch hook
function useApi<T>(
    fetchFn: () => Promise<T>,
    deps: any[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchFn();
            setData(result);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data');
            console.error('API Error:', err);
        } finally {
            setLoading(false);
        }
    }, deps);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { data, loading, error, refetch: fetch };
}

// ============ Dashboard Hooks ============
export function useDashboardStats() {
    return useApi<DashboardStats>(() => dashboardApi.getStats());
}

// ============ Organizations Hooks ============
export function useOrganizations(params?: {
    page?: number;
    limit?: number;
    status?: string;
    tier?: string;
    search?: string;
}) {
    const [filters, setFilters] = useState(params || {});

    const result = useApi<PaginatedResponse<Organization>>(
        () => organizationsApi.getAll(filters),
        [JSON.stringify(filters)]
    );

    const updateFilters = useCallback((newFilters: typeof filters) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    }, []);

    return { ...result, filters, updateFilters };
}

export function useOrganization(id: string) {
    return useApi<Organization>(() => organizationsApi.getById(id), [id]);
}

// ============ Users Hooks ============
export function useAdminUsers(params?: { page?: number; limit?: number; role?: string }) {
    const [filters, setFilters] = useState(params || {});

    const result = useApi<PaginatedResponse<AdminUser>>(
        () => usersApi.getAll(filters),
        [JSON.stringify(filters)]
    );

    const updateFilters = useCallback((newFilters: typeof filters) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    }, []);

    return { ...result, filters, updateFilters };
}

// ============ Feature Flags Hooks ============
export function useFeatureFlags(category?: string) {
    return useApi<FeatureFlag[]>(
        () => featureFlagsApi.getAll(category ? { category } : undefined),
        [category]
    );
}

// ============ Billing Hooks ============
export function useWallets(params?: { page?: number; limit?: number; search?: string }) {
    const [filters, setFilters] = useState(params || {});

    const result = useApi<PaginatedResponse<Wallet>>(
        () => billingApi.getWallets(filters),
        [JSON.stringify(filters)]
    );

    const updateFilters = useCallback((newFilters: typeof filters) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    }, []);

    return { ...result, filters, updateFilters };
}

export function useTransactions(params?: {
    page?: number;
    limit?: number;
    tenantId?: string;
    type?: string;
}) {
    const [filters, setFilters] = useState(params || {});

    const result = useApi<PaginatedResponse<Transaction>>(
        () => billingApi.getTransactions(filters),
        [JSON.stringify(filters)]
    );

    const updateFilters = useCallback((newFilters: typeof filters) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    }, []);

    return { ...result, filters, updateFilters };
}

export function useRevenueStats(period = 'month') {
    return useApi<RevenueStats>(() => billingApi.getRevenueStats(period), [period]);
}

// ============ Audit Logs Hooks ============
export function useAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    resourceType?: string;
}) {
    const [filters, setFilters] = useState(params || {});

    const result = useApi<PaginatedResponse<AuditLog>>(
        () => auditLogsApi.getAll(filters),
        [JSON.stringify(filters)]
    );

    const updateFilters = useCallback((newFilters: typeof filters) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    }, []);

    return { ...result, filters, updateFilters };
}

// ============ Settings Hooks ============
export function usePlatformSettings() {
    return useApi<PlatformSettings>(() => settingsApi.get());
}

// ============ Mutation Helpers ============
export function useMutation<T, P>(
    mutationFn: (params: P) => Promise<T>
) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(async (params: P): Promise<T | null> => {
        setLoading(true);
        setError(null);
        try {
            const result = await mutationFn(params);
            return result;
        } catch (err: any) {
            setError(err.message || 'Operation failed');
            console.error('Mutation Error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [mutationFn]);

    return { mutate, loading, error };
}
