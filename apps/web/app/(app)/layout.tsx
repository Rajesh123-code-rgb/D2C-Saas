'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Inbox,
    Users,
    Zap,
    MessageSquare,
    Settings,
    BarChart3,
    Menu,
    X,
    Bell,
    Search,
    ShoppingBag,
    ShoppingCart,
    Store,
    Target,
    FileText,
    Radio,
    Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Inbox', href: '/inbox', icon: Inbox },
    { name: 'Contacts', href: '/contacts', icon: Users },
    { name: 'Segments', href: '/segments', icon: Target },
    { name: 'Orders', href: '/orders', icon: ShoppingBag },
    { name: 'Abandoned Carts', href: '/abandoned-carts', icon: ShoppingCart },
    { name: 'Stores', href: '/settings/stores', icon: Store },
    { name: 'Channels', href: '/channels', icon: Radio },
    { name: 'Campaigns', href: '/campaigns', icon: MessageSquare },
    { name: 'Templates', href: '/templates', icon: FileText },
    { name: 'Automations', href: '/automations', icon: Zap },
    { name: 'Chatbots', href: '/chatbots', icon: Bot },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [tenant, setTenant] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load user and tenant data from cookies (if available)
        // Middleware already checked auth, so we just need to populate state
        const userCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('user='))
            ?.split('=')[1];

        const tenantCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('tenant='))
            ?.split('=')[1];

        let userLoaded = false;

        if (userCookie) {
            try {
                setUser(JSON.parse(decodeURIComponent(userCookie)));
                userLoaded = true;
            } catch (e) {
                console.error('Error parsing user cookie:', e);
            }
        }

        if (tenantCookie) {
            try {
                setTenant(JSON.parse(decodeURIComponent(tenantCookie)));
            } catch (e) {
                console.error('Error parsing tenant cookie:', e);
            }
        }

        // If no user cookie found, clear cookies and redirect to login
        if (!userLoaded) {
            // Give a small delay to ensure we've checked properly
            setTimeout(async () => {
                // Double-check if user was set in the meantime
                if (!userCookie) {
                    console.log('No user data found, clearing session and redirecting...');
                    // Clear cookies via API
                    await fetch('/api/auth/cookies', { method: 'DELETE' }).catch(() => { });
                    router.push('/login');
                }
                setIsLoading(false);
            }, 500);
        } else {
            setIsLoading(false);
        }
    }, [router]);

    const handleLogout = async () => {
        // Clear cookies via API
        await fetch('/api/auth/cookies', { method: 'DELETE' });
        router.push('/login');
    };

    if (isLoading || !user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Logo */}
                <div className="flex h-16 items-center gap-2 border-b px-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                        <MessageSquare className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">{tenant?.name || 'OmniChannel'}</span>
                        <span className="text-xs text-muted-foreground">{tenant?.subscriptionTier || 'Free'}</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-3 py-4">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                {/* User */}
                <div className="border-t p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full mt-2 justify-start"
                        size="sm"
                        onClick={handleLogout}
                    >
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex flex-1 flex-col lg:pl-64">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>

                    <div className="flex-1">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search conversations, contacts..."
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <Button variant="ghost" size="icon">
                        <Bell className="h-5 w-5" />
                    </Button>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}
