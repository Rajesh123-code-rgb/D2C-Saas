'use client';

import { useState, useEffect } from 'react';

interface UserInfo {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
}

interface UseAuthReturn {
    user: UserInfo | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

/**
 * Hook to read user info from the 'user' cookie (JSON format)
 */
export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const getUserFromCookie = (): UserInfo | null => {
            if (typeof document === 'undefined') return null;

            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
                const [name, ...valueParts] = cookie.trim().split('=');
                if (name === 'user') {
                    try {
                        // Decode URI component and parse JSON
                        const jsonStr = decodeURIComponent(valueParts.join('='));
                        const userData = JSON.parse(jsonStr);
                        console.log('[useAuth] Found user cookie:', userData);
                        return {
                            userId: userData.id,
                            email: userData.email,
                            tenantId: userData.tenantId,
                            role: userData.role,
                        };
                    } catch (error) {
                        console.error('[useAuth] Failed to parse user cookie:', error);
                        return null;
                    }
                }
            }
            console.log('[useAuth] User cookie not found');
            return null;
        };

        const userData = getUserFromCookie();
        if (userData) {
            setUser(userData);
        }

        setIsLoading(false);
    }, []);

    return {
        user,
        isLoading,
        isAuthenticated: !!user,
    };
}

export default useAuth;

