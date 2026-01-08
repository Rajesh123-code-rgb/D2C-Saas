'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2,
    Search,
    MoreHorizontal,
    Users,
    CreditCard,
    Activity,
    ExternalLink,
    Ban,
    CheckCircle,
    Clock,
    Eye,
    Loader2,
    RefreshCw,
    Filter,
} from 'lucide-react';
import { CardHeader, CardContent } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { organizationsApi, Organization } from '@/lib/admin/api';

export default function OrganizationsPage() {
    const router = useRouter();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [tierFilter, setTierFilter] = useState('all');
    const [page] = useState(1);
    const [stats, setStats] = useState({ total: 0, active: 0, trial: 0, suspended: 0 });

    const fetchOrganizations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, any> = { page, limit: 10 };
            if (searchQuery) params.search = searchQuery;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (tierFilter !== 'all') params.tier = tierFilter;

            const response = await organizationsApi.getAll(params);
            setOrganizations(response.data);

            const activeCount = response.data.filter(o => o.status === 'active').length;
            const trialCount = response.data.filter(o => o.status === 'trial').length;
            const suspendedCount = response.data.filter(o => o.status === 'suspended').length;
            setStats({
                total: response.total || response.data.length,
                active: activeCount,
                trial: trialCount,
                suspended: suspendedCount,
            });
        } catch (err: any) {
            console.error('Failed to fetch organizations:', err.message);
            setError('Failed to load organizations');
        } finally {
            setLoading(false);
        }
    }, [page, searchQuery, statusFilter, tierFilter]);

    useEffect(() => {
        fetchOrganizations();
    }, [fetchOrganizations]);

    const handleSuspend = async (org: Organization) => {
        try {
            await organizationsApi.suspend(org.id, 'Admin action');
            setOrganizations(prev =>
                prev.map(o => o.id === org.id ? { ...o, status: 'suspended' as const } : o)
            );
        } catch (err: any) {
            setOrganizations(prev =>
                prev.map(o => o.id === org.id ? { ...o, status: 'suspended' as const } : o)
            );
        }
    };

    const handleReactivate = async (org: Organization) => {
        if (!confirm('Are you sure you want to reactivate this organization?')) return;

        try {
            await organizationsApi.reactivate(org.id);
            fetchOrganizations();
        } catch (err: any) {
            setError('Failed to reactivate organization');
        }
    };

    const handleLoginAsTenant = async (orgId: string) => {
        try {
            const { accessToken } = await organizationsApi.impersonate(orgId);
            // Open new window with token in query param
            window.open(`/?token=${accessToken}`, '_blank');
        } catch (err: any) {
            console.error('Failed to impersonate:', err.message);
            setError('Failed to login as tenant: ' + err.message);
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-IN').format(num);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'bg-neutral-800 text-neutral-300',
            trial: 'bg-neutral-800 text-white',
            suspended: 'bg-neutral-800 text-neutral-400',
            cancelled: 'bg-neutral-500/10 text-neutral-400',
        };
        const icons: Record<string, React.ReactNode> = {
            active: <CheckCircle className="h-3 w-3" />,
            trial: <Clock className="h-3 w-3" />,
            suspended: <Ban className="h-3 w-3" />,
        };
        return (
            <Badge className={cn('capitalize gap-1.5 border-0 font-medium', styles[status] || styles.active)}>
                {icons[status]}
                {status}
            </Badge>
        );
    };

    const getTierBadge = (tier: string) => {
        const styles: Record<string, string> = {
            free: 'bg-neutral-500/10 text-neutral-400',
            starter: 'bg-neutral-800 text-white',
            pro: 'bg-neutral-800 text-white',
            enterprise: 'bg-neutral-800 text-white',
        };
        return (
            <Badge className={cn('capitalize border-0 font-medium', styles[tier] || styles.free)}>
                {tier}
            </Badge>
        );
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Organizations</h1>
                    <p className="text-neutral-400 mt-2 text-lg">Manage all tenant organizations on the platform</p>
                </div>
                <Button
                    variant="outline"
                    className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white backdrop-blur-md"
                    onClick={fetchOrganizations}
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-neutral-800 border border-neutral-600/20 rounded-xl text-neutral-300 text-sm backdrop-blur-md">
                    {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid gap-6 md:grid-cols-4">
                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-neutral-800 text-white group-hover:bg-neutral-700 transition-colors">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <Badge className="bg-neutral-800 text-white border-0">Total</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.total}</p>
                        <p className="text-sm text-neutral-400 mt-1">Total Organizations</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-neutral-800 text-neutral-300 group-hover:bg-neutral-700 transition-colors">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <Badge className="bg-neutral-800 text-neutral-300 border-0">Active</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.active}</p>
                        <p className="text-sm text-neutral-400 mt-1">Active Accounts</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-neutral-800 text-white group-hover:bg-neutral-700 transition-colors">
                                <Clock className="h-6 w-6" />
                            </div>
                            <Badge className="bg-neutral-800 text-white border-0">Trial</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.trial}</p>
                        <p className="text-sm text-neutral-400 mt-1">In Trial Period</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-neutral-800 text-neutral-400 group-hover:bg-red-500/20 transition-colors">
                                <Ban className="h-6 w-6" />
                            </div>
                            <Badge className="bg-neutral-800 text-neutral-400 border-0">Blocked</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.suspended}</p>
                        <p className="text-sm text-neutral-400 mt-1">Suspended</p>
                    </CardContent>
                </GlassCard>
            </div>

            {/* Main Content */}
            <GlassCard>
                <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                            <Input
                                placeholder="Search organizations by name or slug..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-white"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                                <Filter className="h-4 w-4 mr-2 text-neutral-400" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white/10 text-white">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={tierFilter} onValueChange={setTierFilter}>
                            <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                                <CreditCard className="h-4 w-4 mr-2 text-neutral-400" />
                                <SelectValue placeholder="Plan" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white/10 text-white">
                                <SelectItem value="all">All Plans</SelectItem>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="starter">Starter</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs text-neutral-400 uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 font-medium">Organization</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Plan</th>
                                    <th className="px-6 py-4 font-medium">Users</th>
                                    <th className="px-6 py-4 font-medium">Credits</th>
                                    <th className="px-6 py-4 font-medium">Messages (Mo)</th>
                                    <th className="px-6 py-4 font-medium">Last Active</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-neutral-400">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-white" />
                                            Loading organizations...
                                        </td>
                                    </tr>
                                ) : organizations.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-neutral-400">
                                            <Building2 className="h-10 w-10 mx-auto mb-3 text-neutral-600" />
                                            <p>No organizations found matching your criteria</p>
                                        </td>
                                    </tr>
                                ) : (
                                    organizations.map((org) => (
                                        <tr key={org.id} className="hover:bg-white/5 transition-colors text-sm">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center text-white font-bold shadow-lg shadow-black/30">
                                                        {org.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{org.name}</p>
                                                        <p className="text-xs text-neutral-400">/{org.slug}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(org.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getTierBadge(org.subscriptionTier)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-neutral-300">
                                                    <Users className="h-4 w-4 text-neutral-400" />
                                                    {org.usersCount}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    'font-medium',
                                                    org.creditsBalance > 1000 ? 'text-neutral-300' :
                                                        org.creditsBalance > 100 ? 'text-neutral-400' : 'text-neutral-400'
                                                )}>
                                                    {formatNumber(org.creditsBalance)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-300">
                                                {formatNumber(org.messagesThisMonth)}
                                            </td>
                                            <td className="px-6 py-4 text-neutral-400">
                                                {new Date(org.lastActiveAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/10">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-black border-white/10 text-white shadow-xl shadow-black/50">
                                                        <DropdownMenuItem
                                                            className="hover:bg-white/5 cursor-pointer"
                                                            onClick={() => router.push(`/admin/organizations/${org.id}`)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="hover:bg-white/5 cursor-pointer"
                                                            onClick={() => handleLoginAsTenant(org.id)}
                                                        >
                                                            <ExternalLink className="h-4 w-4 mr-2" />
                                                            Login as Tenant
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="hover:bg-white/5 cursor-pointer"
                                                            onClick={() => router.push(`/admin/billing?tenant=${org.id}`)}
                                                        >
                                                            <CreditCard className="h-4 w-4 mr-2" />
                                                            Manage Credits
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="hover:bg-white/5 cursor-pointer"
                                                            onClick={() => router.push(`/admin/audit-logs?tenant=${org.id}`)}
                                                        >
                                                            <Activity className="h-4 w-4 mr-2" />
                                                            View Activity
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-white/10" />
                                                        {org.status !== 'suspended' ? (
                                                            <DropdownMenuItem
                                                                className="text-neutral-400 hover:bg-neutral-800 cursor-pointer"
                                                                onClick={() => handleSuspend(org)}
                                                            >
                                                                <Ban className="h-4 w-4 mr-2" />
                                                                Suspend Organization
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                className="text-neutral-300 hover:bg-neutral-800 cursor-pointer"
                                                                onClick={() => handleReactivate(org)}
                                                            >
                                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                                Reactivate
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </GlassCard>
        </div>
    );
}
