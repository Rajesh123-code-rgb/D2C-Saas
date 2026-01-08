'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    MessageSquare,
    Users,
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Loader2,
    RefreshCw,
    Rocket,
    X,
} from 'lucide-react';
import { WalletOverview } from '@/components/dashboard/wallet-overview';
import { api } from '@/lib/api';

interface DashboardMetrics {
    conversations: {
        total: number;
        open: number;
        pending: number;
        resolved: number;
        change: number;
    };
    contacts: {
        total: number;
        newThisPeriod: number;
        change: number;
    };
    messages: {
        total: number;
        inbound: number;
        outbound: number;
        change: number;
    };
    revenue: {
        total: number;
        thisMonth: number;
        lastMonth: number;
        change: number;
    };
    orders: {
        total: number;
        thisMonth: number;
        pending: number;
        completed: number;
    };
    avgResponseTime: number;
    resolutionRate: number;
    emailOpenRate: number;
}

interface OnboardingStatus {
    completed: boolean;
    skipped: boolean;
    currentStep: number;
    stepsCompleted: string[];
    stepsSkipped: string[];
    currentStepName: string;
    isComplete: boolean;
}

export default function DashboardPage() {
    const router = useRouter();
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
    const [onboardingDismissed, setOnboardingDismissed] = useState(false);

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await api.get<DashboardMetrics>('/analytics/dashboard');
            setMetrics(data);
        } catch (err) {
            console.error('Error fetching metrics:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchOnboardingStatus = useCallback(async () => {
        try {
            const data = await api.get<OnboardingStatus>('/onboarding/status');
            setOnboarding(data);
        } catch (err) {
            console.error('Error fetching onboarding status:', err);
        }
    }, []);

    const handleDismissOnboarding = async () => {
        try {
            await api.post('/onboarding/skip-all');
            setOnboardingDismissed(true);
        } catch (err) {
            console.error('Error dismissing onboarding:', err);
        }
    };

    useEffect(() => {
        fetchMetrics();
        fetchOnboardingStatus();
    }, [fetchMetrics, fetchOnboardingStatus]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatChange = (change: number) => {
        const isPositive = change >= 0;
        return (
            <div className="flex items-center text-xs">
                {isPositive ? (
                    <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                ) : (
                    <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                )}
                <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                    {isPositive ? '+' : ''}{change}%
                </span>
                <span className="ml-1 text-muted-foreground">vs last month</span>
            </div>
        );
    };

    if (loading && !metrics) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
                </div>
                <Button variant="outline" onClick={fetchMetrics} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Onboarding Banner */}
            {onboarding && !onboarding.isComplete && !onboardingDismissed && (
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                <Rocket className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Complete Your Setup</h3>
                                <p className="text-sm text-muted-foreground">
                                    {onboarding.stepsCompleted.length} of 4 steps completed
                                    {onboarding.stepsSkipped.length > 0 && ` • ${onboarding.stepsSkipped.length} skipped`}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    {['welcome', 'connect-store', 'connect-channel', 'invite-team'].map((step) => (
                                        <div
                                            key={step}
                                            className={`w-2 h-2 rounded-full ${onboarding.stepsCompleted.includes(step)
                                                ? 'bg-green-500'
                                                : onboarding.stepsSkipped.includes(step)
                                                    ? 'bg-yellow-500'
                                                    : 'bg-muted'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDismissOnboarding}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Dismiss
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => router.push('/onboarding')}
                            >
                                Continue Setup
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <WalletOverview />
                <Card className="bg-gradient-to-br from-violet-500/10 via-transparent to-transparent border-violet-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 text-violet-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-violet-700">{metrics?.conversations?.total || 0}</div>
                        {metrics?.conversations?.change !== undefined && formatChange(metrics.conversations.change)}
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 via-transparent to-transparent border-blue-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{metrics?.contacts?.total || 0}</div>
                        {metrics?.contacts?.change !== undefined && formatChange(metrics.contacts.change)}
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border-emerald-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">{formatCurrency(metrics?.revenue?.thisMonth || 0)}</div>
                        {metrics?.revenue?.change !== undefined && formatChange(metrics.revenue.change)}
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 via-transparent to-transparent border-orange-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orders This Month</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <ShoppingCart className="h-4 w-4 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700">{metrics?.orders?.thisMonth || 0}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {metrics?.orders?.pending || 0} pending, {metrics?.orders?.completed || 0} completed
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-orange-500/5 via-transparent to-transparent border-orange-200/30 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Conversations</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-orange-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{metrics?.conversations?.open || 0}</div>
                        <p className="text-xs text-muted-foreground">Needs attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.avgResponseTime || '--'} min</div>
                        <p className="text-xs text-muted-foreground">Average first response</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/5 via-transparent to-transparent border-green-200/30 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{metrics?.resolutionRate || 0}%</div>
                        <p className="text-xs text-muted-foreground">Conversations resolved</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent border-emerald-200/30 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">{formatCurrency(metrics?.revenue?.total || 0)}</div>
                        <p className="text-xs text-muted-foreground">All time revenue</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/5 via-transparent to-transparent border-blue-200/30 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Email Open Rate</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{metrics?.emailOpenRate || 0}%</div>
                        <p className="text-xs text-muted-foreground">Last 30 days avg</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Conversation Summary</CardTitle>
                        <CardDescription>Breakdown of conversation statuses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span>Resolved</span>
                                </div>
                                <span className="font-semibold">{metrics?.conversations?.resolved || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                                    <span>Open</span>
                                </div>
                                <span className="font-semibold">{metrics?.conversations?.open || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <span>Pending</span>
                                </div>
                                <span className="font-semibold">{metrics?.conversations?.pending || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Messages Overview</CardTitle>
                        <CardDescription>Inbound vs Outbound messages</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span>Total Messages</span>
                                <span className="font-semibold">{metrics?.messages?.total || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span>Inbound</span>
                                </div>
                                <span className="font-semibold">{metrics?.messages?.inbound || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                                    <span>Outbound</span>
                                </div>
                                <span className="font-semibold">{metrics?.messages?.outbound || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Commonly used features</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <a href="/channels" className="block rounded-lg border p-3 text-left hover:bg-accent transition-colors">
                            <h4 className="font-medium">Connect Channel</h4>
                            <p className="text-sm text-muted-foreground">Set up WhatsApp, Instagram, or Email</p>
                        </a>
                        <a href="/campaigns" className="block rounded-lg border p-3 text-left hover:bg-accent transition-colors">
                            <h4 className="font-medium">Create Campaign</h4>
                            <p className="text-sm text-muted-foreground">Send messages to your audience</p>
                        </a>
                        <a href="/automations" className="block rounded-lg border p-3 text-left hover:bg-accent transition-colors">
                            <h4 className="font-medium">Build Automation</h4>
                            <p className="text-sm text-muted-foreground">Automate your workflows</p>
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
