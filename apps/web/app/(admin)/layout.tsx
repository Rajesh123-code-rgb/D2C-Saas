'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Building2,
    Users,
    Flag,
    Zap,
    Settings,
    CreditCard,
    BarChart3,
    Menu,
    X,
    Bell,
    Shield,
    FileText,
    Activity,
    DollarSign,
    Package,
    LogOut,
    Mail,
    Sun,
    Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminThemeProvider, useAdminTheme } from './contexts/admin-theme-context';
import './admin-theme.css';

const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Organizations', href: '/admin/organizations', icon: Building2 },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Feature Flags', href: '/admin/features', icon: Flag },
    // Builders
    { name: 'Automation Builder', href: '/admin/builders/automation', icon: Zap },
    { name: 'WhatsApp Builder', href: '/admin/builders/whatsapp', icon: FileText },
    { name: 'Email Builder', href: '/admin/builders/email', icon: Mail },
    // Governance
    { name: 'Governance', href: '/admin/governance', icon: Shield },
    // Billing
    { name: 'Billing & Credits', href: '/admin/billing', icon: CreditCard },
    { name: 'Usage & Limits', href: '/admin/usage', icon: Activity },
    { name: 'Pricing', href: '/admin/pricing', icon: DollarSign },
    { name: 'Packages', href: '/admin/packages', icon: Package },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: Activity },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [admin, setAdmin] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const { theme, toggleTheme } = useAdminTheme();

    const isDark = theme === 'dark';

    useEffect(() => {
        // Check if admin is authenticated
        const adminToken = localStorage.getItem('admin_token');
        const adminData = localStorage.getItem('admin_user');

        if (!adminToken || !adminData) {
            // Not authenticated, redirect to admin login
            if (pathname !== '/admin/login') {
                router.push('/admin/login');
            }
            setLoading(false);
            return;
        }

        try {
            setAdmin(JSON.parse(adminData));
        } catch (e) {
            console.error('Error parsing admin data:', e);
            router.push('/admin/login');
        }
        setLoading(false);
    }, [pathname, router]);

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        router.push('/admin/login');
    };

    if (loading) {
        return (
            <div className={cn("flex h-screen items-center justify-center", isDark ? "bg-black" : "bg-gray-50")}>
                <div className="text-center">
                    <div className={cn("mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent mx-auto", isDark ? "border-white" : "border-gray-900")} />
                    <p className={cn(isDark ? "text-neutral-400" : "text-gray-500")}>Loading Admin Panel...</p>
                </div>
            </div>
        );
    }

    if (!admin) {
        return null;
    }

    return (
        <div className={cn("flex h-screen overflow-hidden", isDark ? "bg-black" : "bg-gray-50")} data-admin-theme>
            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r transition-transform lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                    isDark ? 'border-neutral-800 bg-black' : 'border-gray-200 bg-white'
                )}
            >
                {/* Logo */}
                <div className={cn("flex h-16 items-center gap-3 border-b px-6", isDark ? "border-neutral-800" : "border-gray-200")}>
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", isDark ? "bg-white" : "bg-gray-900")}>
                        <Shield className={cn("h-5 w-5", isDark ? "text-black" : "text-white")} />
                    </div>
                    <div className="flex flex-col">
                        <span className={cn("font-bold tracking-wide", isDark ? "text-white" : "text-gray-900")}>Admin Panel</span>
                        <span className={cn("text-[10px] uppercase tracking-wider font-semibold", isDark ? "text-neutral-500" : "text-gray-500")}>Super Admin</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto no-scrollbar">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative overflow-hidden group',
                                    isActive
                                        ? isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
                                        : isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                )}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5 transition-colors",
                                    isActive
                                        ? isDark ? "text-black" : "text-white"
                                        : isDark ? "text-neutral-500 group-hover:text-white" : "text-gray-400 group-hover:text-gray-900"
                                )} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Admin User */}
                <div className={cn("border-t p-4", isDark ? "border-neutral-800" : "border-gray-200")}>
                    <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full font-semibold", isDark ? "bg-neutral-800 text-white" : "bg-gray-200 text-gray-900")}>
                            {admin?.firstName?.[0]}{admin?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium truncate", isDark ? "text-white" : "text-gray-900")}>
                                {admin?.firstName} {admin?.lastName}
                            </p>
                            <p className={cn("text-xs truncate", isDark ? "text-neutral-500" : "text-gray-500")}>{admin?.role}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className={cn("w-full mt-3 justify-start", isDark ? "text-neutral-400 hover:bg-neutral-900 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")}
                        size="sm"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className={cn("fixed inset-0 z-40 backdrop-blur-sm lg:hidden", isDark ? "bg-black/80" : "bg-black/50")}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex flex-1 flex-col lg:pl-64">
                {/* Top Bar */}
                <header className={cn("sticky top-0 z-30 flex h-16 items-center gap-4 border-b px-6", isDark ? "border-neutral-800 bg-black" : "border-gray-200 bg-white")}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("lg:hidden", isDark ? "text-neutral-400 hover:bg-neutral-900" : "text-gray-600 hover:bg-gray-100")}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>

                    <div className="flex-1">
                        <h1 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-900")}>
                            {navigation.find(n => pathname.startsWith(n.href))?.name || 'Admin Panel'}
                        </h1>
                    </div>

                    {/* Theme Toggle Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className={cn("relative", isDark ? "text-neutral-400 hover:bg-neutral-900 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")}
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className={cn("relative", isDark ? "text-neutral-400 hover:bg-neutral-900" : "text-gray-600 hover:bg-gray-100")}>
                                <Bell className="h-5 w-5" />
                                <span className={cn("absolute top-1 right-1 h-2 w-2 rounded-full", isDark ? "bg-white" : "bg-gray-900")} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className={cn("w-80", isDark ? "bg-black border-neutral-800" : "bg-white border-gray-200")}>
                            <div className={cn("px-3 py-2 border-b", isDark ? "border-neutral-800" : "border-gray-200")}>
                                <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>Notifications</p>
                            </div>
                            <div className={cn("p-3 text-center text-sm", isDark ? "text-neutral-500" : "text-gray-500")}>
                                No new notifications
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* Page Content */}
                <main className={cn("flex-1 overflow-y-auto overflow-x-hidden px-6 pt-4 pb-6 custom-scrollbar", isDark ? "bg-black" : "bg-gray-50")}>
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Login page doesn't need the theme provider or layout
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    return (
        <AdminThemeProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminThemeProvider>
    );
}
