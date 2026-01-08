'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2,
    Users,
    CreditCard,
    MessageSquare,
    TrendingUp,
    TrendingDown,
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    DollarSign,
    Zap,
    RefreshCw,
    Loader2,
    Mail,
    Target,
    Beaker,
    ImageIcon,
    Phone,
} from 'lucide-react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { dashboardApi, billingApi, DashboardStats, Transaction, Alert } from '@/lib/admin/api';

// Fallback mock data for when API is unavailable
const mockStats: DashboardStats = {
    organizations: { total: 156, active: 142, trial: 23 },
    users: { total: 1245, active: 890 },
    revenue: { today: 12500, month: 328500, growth: 12.5 },
    messages: { today: 45230, month: 1234567 },
    emails: { today: 12450, month: 345000 },
    conversations: { marketing: 45000, utility: 78000, service: 23000 },
    campaigns: {
        total: 234,
        active: 45,
        abTestCampaigns: 12,
        emailCampaigns: 89,
        whatsappCampaigns: 145,
    },
    channelStats: {
        whatsapp: { messages: 892450, mediaUploads: 15240, conversations: 34560 },
        email: { sent: 456780, opened: 234567, clicked: 45678, openRate: 51.3 },
    },
};

const mockAlerts: Alert[] = [
    { id: '1', type: 'warning', message: 'High message volume detected for Tenant ABC', time: '5 min ago' },
    { id: '2', type: 'success', message: 'Payment received from XYZ Corp - ₹25,000', time: '12 min ago' },
    { id: '3', type: 'info', message: 'New organization signup: TechStart Inc', time: '1 hour ago' },
    { id: '4', type: 'warning', message: 'Low credit balance alert for 3 tenants', time: '2 hours ago' },
];

export default function AdminDashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>(mockStats);
    const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch stats
            const statsData = await dashboardApi.getStats();
            setStats(statsData);
        } catch (err: any) {
            console.warn('Could not fetch dashboard stats, using mock data:', err.message);
            // Keep using mock data
        }

        try {
            // Fetch alerts
            const alertsData = await dashboardApi.getRecentAlerts();
            setAlerts(alertsData);
        } catch (err: any) {
            console.warn('Could not fetch alerts, using mock data');
        }

        try {
            // Fetch transactions
            const txData = await billingApi.getTransactions({ limit: 5 });
            if (txData.data) {
                setTransactions(txData.data);
            }
        } catch (err: any) {
            console.error('Failed to fetch transactions:', err.message);
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-IN').format(num);
    };

    const getTimeDiff = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
                    <p className="text-neutral-400 mt-2 text-lg">Platform metrics and key performance indicators</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white backdrop-blur-sm"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                    </Button>
                    <Button
                        className="bg-white hover:bg-neutral-200 text-black font-semibold border-0"
                        onClick={() => router.push('/admin/analytics')}
                    >
                        View Analytics
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-neutral-800 border border-neutral-600/20 rounded-xl text-neutral-300 text-sm backdrop-blur-md">
                    {error}
                </div>
            )}


            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <GlassCard className="glass-card-hover group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">
                            Organizations
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-neutral-300 transition-colors">
                            <Building2 className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white mb-1 group-hover:text-neutral-100 transition-colors">{stats.organizations.total}</div>
                        <p className="text-xs text-neutral-400 flex items-center gap-2">
                            <span className="flex items-center text-neutral-300 bg-neutral-800 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide">
                                {stats.organizations.active} Active
                            </span>
                            <span className="w-1 h-1 rounded-full bg-neutral-600" />
                            <span className="text-neutral-400">{stats.organizations.trial} Trial</span>
                        </p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">
                            Total Users
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-neutral-300 transition-colors">
                            <Users className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white mb-1 group-hover:text-neutral-100 transition-colors">{formatNumber(stats.users.total)}</div>
                        <p className="text-xs text-neutral-400">
                            <span className="text-neutral-300 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {stats.users.active} active today
                            </span>
                        </p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">
                            Revenue (Month)
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-neutral-800 text-neutral-300 group-hover:bg-neutral-700 group-hover:text-neutral-300 transition-colors">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 mb-1">
                            {formatCurrency(stats.revenue.month)}
                        </div>
                        <p className="text-xs text-neutral-300 flex items-center bg-neutral-400/5 w-fit px-1.5 py-0.5 rounded">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {stats.revenue.growth}% from last month
                        </p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">
                            Messages Today
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-neutral-300 transition-colors">
                            <MessageSquare className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white mb-1 group-hover:text-purple-100 transition-colors">{formatNumber(stats.messages.today)}</div>
                        <p className="text-xs text-neutral-400">
                            {formatNumber(stats.messages.month)} total this month
                        </p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">
                            Emails Today
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-neutral-300 transition-colors">
                            <Mail className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white mb-1 group-hover:text-orange-100 transition-colors">{formatNumber(stats.emails?.today || 0)}</div>
                        <p className="text-xs text-neutral-400">
                            {formatNumber(stats.emails?.month || 0)} total this month
                        </p>
                    </CardContent>
                </GlassCard>
            </div>

            {/* Campaign Metrics */}
            {stats.campaigns && (
                <>
                    <h2 className="text-lg font-semibold text-white/90 px-1">Campaign Metrics</h2>
                    <div className="grid gap-6 md:grid-cols-4">
                        <GlassCard className="glass-card-hover group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Active Campaigns
                                </CardTitle>
                                <div className="p-2 rounded-lg bg-neutral-800 text-neutral-400">
                                    <Target className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white mb-1">{stats.campaigns.active}</div>
                                <p className="text-xs text-neutral-400">{stats.campaigns.total} total campaigns</p>
                            </CardContent>
                        </GlassCard>

                        <GlassCard className="glass-card-hover group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    A/B Test Campaigns
                                </CardTitle>
                                <div className="p-2 rounded-lg bg-neutral-800 text-neutral-400">
                                    <Beaker className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-1">
                                    {stats.campaigns.abTestCampaigns}
                                </div>
                                <p className="text-xs text-neutral-400">Running A/B tests</p>
                            </CardContent>
                        </GlassCard>

                        <GlassCard className="glass-card-hover group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    WhatsApp Campaigns
                                </CardTitle>
                                <div className="p-2 rounded-lg bg-neutral-800 text-neutral-300">
                                    <Phone className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white mb-1">{stats.campaigns.whatsappCampaigns}</div>
                                <p className="text-xs text-neutral-400">Template-based</p>
                            </CardContent>
                        </GlassCard>

                        <GlassCard className="glass-card-hover group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-neutral-400">
                                    Email Campaigns
                                </CardTitle>
                                <div className="p-2 rounded-lg bg-neutral-800 text-neutral-400">
                                    <Mail className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white mb-1">{stats.campaigns.emailCampaigns}</div>
                                <p className="text-xs text-neutral-400">Direct send</p>
                            </CardContent>
                        </GlassCard>
                    </div>
                </>
            )}

            {/* Channel Comparison */}
            {stats.channelStats && (
                <>
                    <h2 className="text-lg font-semibold text-white/90 px-1">Channel Performance</h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-neutral-400/20 text-neutral-300">
                                        <Phone className="h-5 w-5" />
                                    </div>
                                    WhatsApp Channel
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-neutral-400">Total Messages</span>
                                        <span className="text-white font-semibold">{formatNumber(stats.channelStats.whatsapp.messages)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-neutral-400 flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4" />
                                            Media Uploads
                                        </span>
                                        <span className="text-white font-semibold">{formatNumber(stats.channelStats.whatsapp.mediaUploads)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-neutral-400">Active Conversations</span>
                                        <span className="text-white font-semibold">{formatNumber(stats.channelStats.whatsapp.conversations)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </GlassCard>

                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-neutral-500/20 text-neutral-400">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    Email Channel
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-neutral-400">Emails Sent</span>
                                        <span className="text-white font-semibold">{formatNumber(stats.channelStats.email.sent)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-neutral-400">Open Rate</span>
                                        <span className="text-neutral-300 font-semibold">{stats.channelStats.email.openRate}%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-neutral-400">Clicked</span>
                                        <span className="text-white font-semibold">{formatNumber(stats.channelStats.email.clicked)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </GlassCard>
                    </div>
                </>
            )}

            {/* Conversation Categories */}
            <h2 className="text-lg font-semibold text-white/90 px-1">Conversation Metrics</h2>
            <div className="grid gap-6 md:grid-cols-3">
                <GlassCard className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Zap className="w-24 h-24 text-purple-500 rotate-12" />
                    </div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            Marketing
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold text-white mb-3">{formatNumber(stats.conversations.marketing)}</div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: '35%' }} />
                        </div>
                    </CardContent>
                </GlassCard>

                <GlassCard className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <CheckCircle className="w-24 h-24 text-blue-500 rotate-12" />
                    </div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-neutral-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            Utility
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold text-white mb-3">{formatNumber(stats.conversations.utility)}</div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: '55%' }} />
                        </div>
                    </CardContent>
                </GlassCard>

                <GlassCard className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <MessageSquare className="w-24 h-24 text-green-500 rotate-12" />
                    </div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-neutral-400 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            Service
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold text-white mb-3">{formatNumber(stats.conversations.service)}</div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: '20%' }} />
                        </div>
                    </CardContent>
                </GlassCard>
            </div>

            {/* Alerts & Transactions */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Alerts */}
                <GlassCard>
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-indigo-500/20 text-neutral-400">
                                <Activity className="h-5 w-5" />
                            </div>
                            System Alerts
                        </CardTitle>
                        <CardDescription className="text-neutral-400">
                            Recent platform notifications and alerts
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="flex items-start gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                                >
                                    {alert.type === 'warning' && (
                                        <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                                    )}
                                    {alert.type === 'success' && (
                                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                    )}
                                    {(alert.type === 'info' || alert.type === 'error') && (
                                        <div className="h-5 w-5 rounded-full border-2 border-blue-500/50 flex items-center justify-center shrink-0 mt-0.5">
                                            <div className="h-2 w-2 rounded-full bg-neutral-500" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium">{alert.message}</p>
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-mono">
                                            <Clock className="h-3 w-3" />
                                            {alert.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </GlassCard>

                {/* Recent Transactions */}
                <GlassCard>
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-neutral-400/20 text-neutral-300">
                                <CreditCard className="h-5 w-5" />
                            </div>
                            Recent Transactions
                        </CardTitle>
                        <CardDescription className="text-neutral-400">
                            Latest credit purchases and usage
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center border transition-all ${tx.creditsAmount > 0
                                            ? 'bg-neutral-800 border-green-500/20 text-neutral-300 group-hover:border-green-500/40'
                                            : 'bg-neutral-800 border-neutral-600/20 text-neutral-300 group-hover:border-red-500/40'
                                            }`}>
                                            {tx.creditsAmount > 0 ? (
                                                <TrendingUp className="h-5 w-5" />
                                            ) : (
                                                <TrendingDown className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white group-hover:text-indigo-200 transition-colors">{tx.tenantName || tx.tenantId}</p>
                                            <p className="text-xs text-slate-500 font-mono">{getTimeDiff(tx.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-bold ${tx.currencyAmount > 0 ? 'text-neutral-300' : 'text-neutral-300'}`}>
                                            {tx.currencyAmount > 0 ? '+' : ''}{formatCurrency(tx.currencyAmount)}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {tx.creditsAmount > 0 ? '+' : ''}{formatNumber(tx.creditsAmount)} credits
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full mt-4 text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
                            onClick={() => router.push('/admin/billing')}
                        >
                            View All Transactions
                        </Button>
                    </CardContent>
                </GlassCard>
            </div>
        </div>
    );
}
