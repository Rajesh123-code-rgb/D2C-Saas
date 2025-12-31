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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [admin, setAdmin] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);

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

    // Show login page without layout
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900">
                <div className="text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
                    <p className="text-slate-400">Loading Admin Panel...</p>
                </div>
            </div>
        );
    }

    if (!admin) {
        return null;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[#0B0C15]">
            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/5 bg-[#0B0C15]/60 backdrop-blur-xl transition-transform lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Logo */}
                <div className="flex h-16 items-center gap-3 border-b border-white/5 px-6">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-white tracking-wide">Admin Panel</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Super Admin</span>
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
                                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 relative overflow-hidden group',
                                    isActive
                                        ? 'text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                )}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-indigo-500/5 border-l-2 border-indigo-500" />
                                )}
                                <item.icon className={cn("h-5 w-5 relative z-10 transition-colors", isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-300")} />
                                <span className="relative z-10">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Admin User */}
                <div className="border-t border-white/5 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 font-semibold">
                            {admin?.firstName?.[0]}{admin?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {admin?.firstName} {admin?.lastName}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{admin?.role}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full mt-3 justify-start text-slate-300 hover:bg-white/5 hover:text-white"
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
                    className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex flex-1 flex-col lg:pl-64">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/5 bg-[#0B0C15] px-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden text-slate-300 hover:bg-white/5"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>

                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-white">
                            {navigation.find(n => pathname.startsWith(n.href))?.name || 'Admin Panel'}
                        </h1>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative text-slate-300 hover:bg-white/5">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80 bg-[#0B0C15] border-white/10">
                            <div className="px-3 py-2 border-b border-white/10">
                                <p className="text-sm font-medium text-white">Notifications</p>
                            </div>
                            <div className="p-3 text-center text-sm text-slate-400">
                                No new notifications
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden px-6 pt-4 pb-6 bg-[#0B0C15] custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
}
