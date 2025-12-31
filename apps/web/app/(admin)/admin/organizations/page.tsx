'use client';

import { useState, useCallback, useEffect } from 'react';
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
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

// Fallback mock data
const mockOrganizations: Organization[] = [
    {
        id: '1',
        name: 'ABC Corporation',
        slug: 'abc-corp',
        status: 'active',
        subscriptionTier: 'pro',
        usersCount: 12,
        channelsCount: 3,
        creditsBalance: 4500,
        messagesThisMonth: 12500,
        createdAt: '2024-06-15',
        lastActiveAt: '2024-12-27T10:30:00',
    },
    {
        id: '2',
        name: 'XYZ Ltd',
        slug: 'xyz-ltd',
        status: 'active',
        subscriptionTier: 'enterprise',
        usersCount: 35,
        channelsCount: 5,
        creditsBalance: 45000,
        messagesThisMonth: 89000,
        createdAt: '2024-03-10',
        lastActiveAt: '2024-12-27T11:00:00',
    },
    {
        id: '3',
        name: 'TechStart Inc',
        slug: 'techstart',
        status: 'trial',
        subscriptionTier: 'starter',
        usersCount: 3,
        channelsCount: 1,
        creditsBalance: 500,
        messagesThisMonth: 250,
        createdAt: '2024-12-15',
        lastActiveAt: '2024-12-27T09:00:00',
    },
    {
        id: '4',
        name: 'Demo Company',
        slug: 'demo-company',
        status: 'suspended',
        subscriptionTier: 'starter',
        usersCount: 5,
        channelsCount: 2,
        creditsBalance: 0,
        messagesThisMonth: 0,
        createdAt: '2024-01-01',
        lastActiveAt: '2024-12-01T15:00:00',
    },
];

export default function OrganizationsPage() {
    const [organizations, setOrganizations] = useState<Organization[]>(mockOrganizations);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [tierFilter, setTierFilter] = useState('all');
    const [page] = useState(1);
    const [stats, setStats] = useState({ total: 156, active: 142, trial: 23, suspended: 5 });

    const fetchOrganizations = useCallback(async () => {
        setLoading(true);
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
                total: response.total || mockOrganizations.length,
                active: activeCount,
                trial: trialCount,
                suspended: suspendedCount,
            });
        } catch (err: any) {
            console.warn('Could not fetch organizations, using mock data:', err.message);
            const filtered = mockOrganizations.filter((org) => {
                const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    org.slug.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
                const matchesTier = tierFilter === 'all' || org.subscriptionTier === tierFilter;
                return matchesSearch && matchesStatus && matchesTier;
            });
            setOrganizations(filtered);
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
        try {
            await organizationsApi.reactivate(org.id);
            setOrganizations(prev =>
                prev.map(o => o.id === org.id ? { ...o, status: 'active' as const } : o)
            );
        } catch (err: any) {
            setOrganizations(prev =>
                prev.map(o => o.id === org.id ? { ...o, status: 'active' as const } : o)
            );
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-IN').format(num);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'bg-green-500/10 text-green-400',
            trial: 'bg-blue-500/10 text-blue-400',
            suspended: 'bg-red-500/10 text-red-400',
            cancelled: 'bg-slate-500/10 text-slate-400',
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
            free: 'bg-slate-500/10 text-slate-400',
            starter: 'bg-blue-500/10 text-blue-400',
            pro: 'bg-purple-500/10 text-purple-400',
            enterprise: 'bg-amber-500/10 text-amber-400',
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
                    <p className="text-slate-400 mt-2 text-lg">Manage all tenant organizations on the platform</p>
                </div>
                <Button
                    variant="outline"
                    className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white backdrop-blur-md"
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

            {/* Stats */}
            <div className="grid gap-6 md:grid-cols-4">
                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <Badge className="bg-indigo-500/10 text-indigo-400 border-0">Total</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.total}</p>
                        <p className="text-sm text-slate-400 mt-1">Total Organizations</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-green-500/10 text-green-400 group-hover:bg-green-500/20 transition-colors">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <Badge className="bg-green-500/10 text-green-400 border-0">Active</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.active}</p>
                        <p className="text-sm text-slate-400 mt-1">Active Accounts</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                <Clock className="h-6 w-6" />
                            </div>
                            <Badge className="bg-blue-500/10 text-blue-400 border-0">Trial</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.trial}</p>
                        <p className="text-sm text-slate-400 mt-1">In Trial Period</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-red-500/10 text-red-400 group-hover:bg-red-500/20 transition-colors">
                                <Ban className="h-6 w-6" />
                            </div>
                            <Badge className="bg-red-500/10 text-red-400 border-0">Blocked</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.suspended}</p>
                        <p className="text-sm text-slate-400 mt-1">Suspended</p>
                    </CardContent>
                </GlassCard>
            </div>

            {/* Main Content */}
            <GlassCard>
                <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search organizations by name or slug..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0B0C15] border-white/10 text-white">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={tierFilter} onValueChange={setTierFilter}>
                            <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                                <CreditCard className="h-4 w-4 mr-2 text-slate-400" />
                                <SelectValue placeholder="Plan" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0B0C15] border-white/10 text-white">
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
                                <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
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
                                        <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
                                            Loading organizations...
                                        </td>
                                    </tr>
                                ) : organizations.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                            <Building2 className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                                            <p>No organizations found matching your criteria</p>
                                        </td>
                                    </tr>
                                ) : (
                                    organizations.map((org) => (
                                        <tr key={org.id} className="hover:bg-white/5 transition-colors text-sm">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                                                        {org.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{org.name}</p>
                                                        <p className="text-xs text-slate-400">/{org.slug}</p>
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
                                                <div className="flex items-center gap-1 text-slate-300">
                                                    <Users className="h-4 w-4 text-slate-400" />
                                                    {org.usersCount}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    'font-medium',
                                                    org.creditsBalance > 1000 ? 'text-green-400' :
                                                        org.creditsBalance > 100 ? 'text-yellow-400' : 'text-red-400'
                                                )}>
                                                    {formatNumber(org.creditsBalance)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                {formatNumber(org.messagesThisMonth)}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {new Date(org.lastActiveAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-[#0B0C15] border-white/10 text-white shadow-xl shadow-black/50">
                                                        <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                                                            <ExternalLink className="h-4 w-4 mr-2" />
                                                            Login as Tenant
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                                                            <CreditCard className="h-4 w-4 mr-2" />
                                                            Manage Credits
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                                                            <Activity className="h-4 w-4 mr-2" />
                                                            View Activity
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-white/10" />
                                                        {org.status !== 'suspended' ? (
                                                            <DropdownMenuItem
                                                                className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                                                                onClick={() => handleSuspend(org)}
                                                            >
                                                                <Ban className="h-4 w-4 mr-2" />
                                                                Suspend Organization
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                className="text-green-400 hover:bg-green-500/10 cursor-pointer"
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
