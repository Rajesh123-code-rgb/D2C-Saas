'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface AdminThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Get saved theme from localStorage
        const savedTheme = localStorage.getItem('admin_theme') as Theme;
        if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
            setThemeState(savedTheme);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Apply theme class to document
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('admin-light');
            root.classList.remove('admin-dark');
        } else {
            root.classList.add('admin-dark');
            root.classList.remove('admin-light');
        }

        // Save to localStorage
        localStorage.setItem('admin_theme', theme);
    }, [theme, mounted]);

    const toggleTheme = () => {
        setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    // Prevent hydration mismatch
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <AdminThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </AdminThemeContext.Provider>
    );
}

export function useAdminTheme() {
    const context = useContext(AdminThemeContext);
    // Return safe defaults if used outside provider (e.g., login page)
    if (context === undefined) {
        return {
            theme: 'dark' as const,
            toggleTheme: () => { },
            setTheme: () => { },
        };
    }
    return context;
}
