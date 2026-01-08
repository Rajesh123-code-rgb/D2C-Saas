'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Users,
    CreditCard,
    MessageSquare,
    ArrowLeft,
    ExternalLink,
    Activity,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Wallet,
    Mail,
    Hash,
} from 'lucide-react';
import { CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { organizationsApi, Organization, billingApi } from '@/lib/admin/api';
import { cn } from '@/lib/utils';

export default function OrganizationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orgId = params.id as string;

    const [organization, setOrganization] = useState<Organization | null>(null);
    const [wallet, setWallet] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!orgId) return;

        setLoading(true);
        setError(null);

        try {
            const orgData = await organizationsApi.getById(orgId);
            setOrganization(orgData);
        } catch (err: any) {
            console.error('Failed to fetch organization:', err.message);
            setError('Failed to load organization details');
        }

        try {
            const walletData = await billingApi.getWallet(orgId);
            setWallet(walletData);
        } catch (err: any) {
            console.error('Failed to fetch wallet:', err.message);
        }

        setLoading(false);
    }, [orgId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-neutral-800 text-white border-0"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
            case 'trial':
                return <Badge className="bg-neutral-700 text-white border-0"><Clock className="h-3 w-3 mr-1" /> Trial</Badge>;
            case 'suspended':
                return <Badge className="bg-neutral-600 text-neutral-300 border-0"><XCircle className="h-3 w-3 mr-1" /> Suspended</Badge>;
            default:
                return <Badge className="bg-neutral-800 text-white border-0">{status}</Badge>;
        }
    };

    const getTierBadge = (tier: string) => {
        const tierStyles: Record<string, string> = {
            free: 'bg-neutral-800 text-neutral-400',
            starter: 'bg-neutral-700 text-neutral-300',
            professional: 'bg-neutral-600 text-white',
            pro: 'bg-neutral-600 text-white',
            enterprise: 'bg-white text-black',
        };
        return (
            <Badge className={cn('border-0 capitalize', tierStyles[tier] || 'bg-neutral-800 text-white')}>
                {tier}
            </Badge>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-IN').format(num);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    if (error || !organization) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/admin/organizations')}
                    className="text-neutral-400 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Organizations
                </Button>
                <div className="p-8 text-center">
                    <p className="text-neutral-400">{error || 'Organization not found'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Back Button */}
            <Button
                variant="ghost"
                onClick={() => router.push('/admin/organizations')}
                className="text-neutral-400 hover:text-white"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Organizations
            </Button>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-neutral-800 flex items-center justify-center text-white text-2xl font-bold">
                        {organization.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-white">{organization.name}</h1>
                            {getStatusBadge(organization.status)}
                            {getTierBadge(organization.subscriptionTier)}
                        </div>
                        <p className="text-neutral-400 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {organization.slug}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                        onClick={() => router.push(`/admin/organizations/${orgId}/credits`)}
                    >
                        <Wallet className="h-4 w-4 mr-2" />
                        Manage Credits
                    </Button>
                    <Button
                        className="bg-white hover:bg-neutral-200 text-black font-semibold border-0"
                        onClick={() => alert(`Login as Tenant: ${organization.name} - Feature coming soon`)}
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Login as Tenant
                    </Button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid gap-6 md:grid-cols-4">
                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 rounded-lg bg-neutral-800 text-white group-hover:bg-neutral-700 transition-colors">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{formatNumber(organization.usersCount)}</div>
                        <p className="text-sm text-neutral-400">Total Users</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 rounded-lg bg-neutral-800 text-white group-hover:bg-neutral-700 transition-colors">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{formatNumber(organization.channelsCount)}</div>
                        <p className="text-sm text-neutral-400">Channels</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 rounded-lg bg-neutral-800 text-white group-hover:bg-neutral-700 transition-colors">
                                <CreditCard className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{formatNumber(organization.creditsBalance)}</div>
                        <p className="text-sm text-neutral-400">Credits Balance</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 rounded-lg bg-neutral-800 text-white group-hover:bg-neutral-700 transition-colors">
                                <Mail className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{formatNumber(organization.messagesThisMonth)}</div>
                        <p className="text-sm text-neutral-400">Messages This Month</p>
                    </CardContent>
                </GlassCard>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="details" className="space-y-6">
                <TabsList className="bg-neutral-900 border border-white/10">
                    <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:text-black">
                        Details
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="data-[state=active]:bg-white data-[state=active]:text-black">
                        Activity
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="text-white">Organization Details</CardTitle>
                            <CardDescription className="text-neutral-400">Complete information about this organization</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Organization ID</p>
                                        <p className="text-white font-mono text-sm">{organization.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Slug</p>
                                        <p className="text-white">{organization.slug}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Status</p>
                                        <div className="mt-1">{getStatusBadge(organization.status)}</div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Subscription Tier</p>
                                        <div className="mt-1">{getTierBadge(organization.subscriptionTier)}</div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Created</p>
                                        <p className="text-white flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-neutral-500" />
                                            {formatDate(organization.createdAt)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Last Active</p>
                                        <p className="text-white flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-neutral-500" />
                                            {formatDate(organization.lastActiveAt)}
                                        </p>
                                    </div>
                                    {wallet && (
                                        <>
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Wallet Balance</p>
                                                <p className="text-white font-bold text-lg">{formatNumber(wallet.creditBalance || 0)} credits</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </GlassCard>
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                    <GlassCard>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-white">Recent Activity</CardTitle>
                                <CardDescription className="text-neutral-400">Audit logs for this organization</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                                onClick={() => router.push(`/admin/audit-logs?tenant=${orgId}`)}
                            >
                                <Activity className="h-4 w-4 mr-2" />
                                View All Activity
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <p className="text-neutral-400 text-center py-8">
                                Click "View All Activity" to see detailed audit logs for this organization.
                            </p>
                        </CardContent>
                    </GlassCard>
                </TabsContent>
            </Tabs>
        </div>
    );
}
