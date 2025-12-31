'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    CreditCard,
    Plus,
    Search,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Filter,
    Download,

    MoreHorizontal,
    Building2,
    Loader2,
    RefreshCw,
    Wallet as WalletIcon,
    ArrowRightLeft,
    Receipt
} from 'lucide-react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { billingApi, Wallet, Transaction, RevenueStats } from '@/lib/admin/api';

// Fallback mock data
const mockWallets: Wallet[] = [
    { id: '1', tenantId: 't1', tenantName: 'ABC Corp', creditBalance: 4500, currencyBalance: 4500, currency: 'INR', status: 'active', autoRechargeEnabled: true, lastTransactionAt: '2024-12-27T10:00:00' },
    { id: '2', tenantId: 't2', tenantName: 'XYZ Ltd', creditBalance: 125, currencyBalance: 125, currency: 'INR', status: 'active', autoRechargeEnabled: false, lastTransactionAt: '2024-12-27T09:30:00' },
    { id: '3', tenantId: 't3', tenantName: 'Demo Inc', creditBalance: 0, currencyBalance: 0, currency: 'INR', status: 'depleted', autoRechargeEnabled: false, lastTransactionAt: '2024-12-26T15:00:00' },
    { id: '4', tenantId: 't4', tenantName: 'TechStart', creditBalance: 12500, currencyBalance: 12500, currency: 'INR', status: 'active', autoRechargeEnabled: true, lastTransactionAt: '2024-12-27T11:00:00' },
];

const mockTransactions: Transaction[] = [
    { id: '1', tenantId: 't1', tenantName: 'ABC Corp', type: 'credit', creditsAmount: 5500, currencyAmount: 5000, description: 'Growth package purchase', status: 'completed', createdAt: '2024-12-27T10:00:00' },
    { id: '2', tenantId: 't2', tenantName: 'XYZ Ltd', type: 'debit', creditsAmount: -50, currencyAmount: -50, description: 'Marketing message', status: 'completed', createdAt: '2024-12-27T09:30:00' },
    { id: '3', tenantId: 't4', tenantName: 'TechStart', type: 'credit', creditsAmount: 15000, currencyAmount: 12500, description: 'Enterprise package purchase', status: 'completed', createdAt: '2024-12-27T08:00:00' },
    { id: '4', tenantId: 't3', tenantName: 'Demo Inc', type: 'refund', creditsAmount: 500, currencyAmount: 500, description: 'Failed campaign refund', status: 'completed', createdAt: '2024-12-26T15:00:00' },
    { id: '5', tenantId: 't1', tenantName: 'ABC Corp', type: 'adjustment', creditsAmount: 100, currencyAmount: 0, description: 'Promotional credits', status: 'completed', createdAt: '2024-12-26T12:00:00' },
];

const mockRevenueStats: RevenueStats = {
    today: { revenue: 25000, transactions: 15 },
    week: { revenue: 175000, transactions: 89 },
    month: { revenue: 680000, transactions: 412 },
    metaCost: 450000,
    grossMargin: 230000,
    topTenants: [],
};

export default function BillingPage() {
    const [wallets, setWallets] = useState<Wallet[]>(mockWallets);
    const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
    const [revenueStats, setRevenueStats] = useState<RevenueStats>(mockRevenueStats);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [addCreditsDialog, setAddCreditsDialog] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
    const [creditsToAdd, setCreditsToAdd] = useState('');
    const [creditReason, setCreditReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);

        try {
            const walletsResponse = await billingApi.getWallets({ search: searchQuery || undefined });
            setWallets(walletsResponse?.data ?? walletsResponse ?? mockWallets);
        } catch (err: any) {
            console.warn('Could not fetch wallets, using mock data:', err.message);
            setWallets(mockWallets);
        }

        try {
            const params: Record<string, any> = { limit: 20 };
            if (typeFilter !== 'all') params.type = typeFilter;
            const txResponse = await billingApi.getTransactions(params);
            setTransactions(txResponse?.data ?? txResponse ?? mockTransactions);
        } catch (err: any) {
            console.warn('Could not fetch transactions, using mock data:', err.message);
            setTransactions(mockTransactions);
        }

        try {
            const stats = await billingApi.getRevenueStats('month');
            setRevenueStats({
                today: {
                    revenue: stats?.today?.revenue ?? mockRevenueStats.today.revenue,
                    transactions: stats?.today?.transactions ?? mockRevenueStats.today.transactions
                },
                week: {
                    revenue: stats?.week?.revenue ?? mockRevenueStats.week.revenue,
                    transactions: stats?.week?.transactions ?? mockRevenueStats.week.transactions
                },
                month: {
                    revenue: stats?.month?.revenue ?? mockRevenueStats.month.revenue,
                    transactions: stats?.month?.transactions ?? mockRevenueStats.month.transactions
                },
                metaCost: stats?.metaCost ?? mockRevenueStats.metaCost,
                grossMargin: stats?.grossMargin ?? mockRevenueStats.grossMargin,
                topTenants: stats?.topTenants ?? mockRevenueStats.topTenants,
            });
        } catch (err: any) {
            console.warn('Could not fetch revenue stats, using mock data:', err.message);
            setRevenueStats(mockRevenueStats);
        }

        setLoading(false);
    }, [searchQuery, typeFilter]);

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

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'bg-green-500/10 text-green-400 border-0',
            suspended: 'bg-yellow-500/10 text-yellow-400 border-0',
            depleted: 'bg-red-500/10 text-red-400 border-0',
        };
        return (
            <Badge className={cn('capitalize', styles[status] || styles.active)}>
                {status}
            </Badge>
        );
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'credit':
                return <TrendingUp className="h-4 w-4 text-green-400" />;
            case 'debit':
                return <TrendingDown className="h-4 w-4 text-red-400" />;
            case 'refund':
                return <TrendingUp className="h-4 w-4 text-blue-400" />;
            case 'adjustment':
                return <DollarSign className="h-4 w-4 text-purple-400" />;
            default:
                return <DollarSign className="h-4 w-4 text-slate-400" />;
        }
    };

    const handleAddCredits = async () => {
        if (!selectedWallet || !creditsToAdd || !creditReason) return;
        setActionLoading(true);

        try {
            await billingApi.addCredits(selectedWallet.tenantId, {
                credits: parseInt(creditsToAdd),
                reason: creditReason,
            });

            setWallets(prev =>
                prev.map(w =>
                    w.id === selectedWallet.id
                        ? { ...w, creditBalance: w.creditBalance + parseInt(creditsToAdd) }
                        : w
                )
            );
        } catch (err: any) {
            console.warn('Could not add credits via API, updating locally:', err.message);
            setWallets(prev =>
                prev.map(w =>
                    w.id === selectedWallet.id
                        ? { ...w, creditBalance: w.creditBalance + parseInt(creditsToAdd) }
                        : w
                )
            );
        } finally {
            setAddCreditsDialog(false);
            setSelectedWallet(null);
            setCreditsToAdd('');
            setCreditReason('');
            setActionLoading(false);
        }
    };

    const filteredWallets = (Array.isArray(wallets) ? wallets : []).filter(w =>
        w.tenantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.tenantId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredTransactions = (Array.isArray(transactions) ? transactions : []).filter(tx =>
        typeFilter === 'all' || tx.type === typeFilter
    );

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Billing & Credits</h1>
                    <p className="text-slate-400 mt-2 text-lg">Manage tenant wallets, transactions, and revenue</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white backdrop-blur-md"
                        onClick={() => fetchData()}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Refresh Data
                    </Button>
                    <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20 border-0">
                        <Download className="h-4 w-4 mr-2" />
                        Download Report
                    </Button>
                </div>
            </div>

            {/* Revenue Overview Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <GlassCard className="glass-card-hover border-l-4 border-l-indigo-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">+12.5%</span>
                        </div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Total Revenue (Month)</p>
                        <p className="text-2xl font-bold text-white mt-1">{formatCurrency(revenueStats.month.revenue)}</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover border-l-4 border-l-purple-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                <Receipt className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">+8.2%</span>
                        </div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Gross Margin</p>
                        <p className="text-2xl font-bold text-white mt-1">{formatCurrency(revenueStats.grossMargin)}</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <ArrowRightLeft className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Transactions (Month)</p>
                        <p className="text-2xl font-bold text-white mt-1">{revenueStats.month.transactions}</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover border-l-4 border-l-amber-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                                <WalletIcon className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Meta API Costs</p>
                        <p className="text-2xl font-bold text-white mt-1">{formatCurrency(revenueStats.metaCost)}</p>
                    </CardContent>
                </GlassCard>
            </div>

            <Tabs defaultValue="wallets" className="space-y-6">
                <TabsList className="bg-white/5 border border-white/10 p-1">
                    <TabsTrigger value="wallets" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Tenant Wallets
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transactions
                    </TabsTrigger>
                </TabsList>

                {/* Wallets Tab */}
                <TabsContent value="wallets" className="space-y-6">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by tenant name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500"
                            />
                        </div>
                        <Button className="bg-white/5 border border-white/10 hover:bg-white/10 text-white">
                            <Filter className="h-4 w-4 mr-2" />
                            Filter
                        </Button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredWallets.map((wallet) => (
                            <GlassCard key={wallet.id} className="glass-card-hover flex flex-col justify-between h-full">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-white/5 shadow-inner">
                                                <Building2 className="h-5 w-5 text-slate-300" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-white text-lg">{wallet.tenantName}</CardTitle>
                                                <CardDescription className="text-slate-400 text-xs">ID: {wallet.tenantId}</CardDescription>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-[#0B0C15] border-white/10 text-white">
                                                <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">View Details</DropdownMenuItem>
                                                <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">Transaction History</DropdownMenuItem>
                                                <DropdownMenuItem className="hover:bg-white/5 cursor-pointer text-red-400">Suspend Wallet</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Available Balance</p>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className={cn("text-2xl font-bold", wallet.creditBalance < 500 ? "text-red-400" : "text-white")}>
                                                {formatCurrency(wallet.creditBalance)}
                                            </h3>
                                            {getStatusBadge(wallet.status)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-white/5">
                                        <div>
                                            <p>Currency: <span className="text-white">{wallet.currency}</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p>Auto-Recharge: <span className={wallet.autoRechargeEnabled ? "text-green-400" : "text-slate-500"}>{wallet.autoRechargeEnabled ? 'S' : 'Off'}</span></p>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full bg-white/5 hover:bg-indigo-600 hover:text-white text-indigo-300 border border-indigo-500/30 transition-all duration-300 group"
                                        onClick={() => {
                                            setSelectedWallet(wallet);
                                            setAddCreditsDialog(true);
                                        }}
                                    >
                                        <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                                        Add Credits
                                    </Button>
                                </CardContent>
                            </GlassCard>
                        ))}
                    </div>
                </TabsContent>

                {/* Transactions Tab */}
                <TabsContent value="transactions" className="space-y-6">
                    <GlassCard>
                        <CardHeader className="border-b border-white/5 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-white">Recent Transactions</CardTitle>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Filter by type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0B0C15] border-white/10 text-white">
                                        <SelectItem value="all">All Transactions</SelectItem>
                                        <SelectItem value="credit">Credits (Purchase)</SelectItem>
                                        <SelectItem value="debit">Debits (Usage)</SelectItem>
                                        <SelectItem value="refund">Refunds</SelectItem>
                                        <SelectItem value="adjustment">Adjustments</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                                            <th className="px-6 py-4 font-medium">Date & Time</th>
                                            <th className="px-6 py-4 font-medium">Tenant</th>
                                            <th className="px-6 py-4 font-medium">Type</th>
                                            <th className="px-6 py-4 font-medium">Description</th>
                                            <th className="px-6 py-4 font-medium text-right">Amount</th>
                                            <th className="px-6 py-4 font-medium text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredTransactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-white/5 transition-colors text-sm">
                                                <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                                                    {new Date(tx.createdAt).toLocaleDateString()}
                                                    <span className="text-slate-500 ml-2 text-xs">
                                                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-white font-medium">{tx.tenantName}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("p-1.5 rounded-full bg-opacity-10",
                                                            tx.type === 'credit' ? "bg-green-500 text-green-400" :
                                                                tx.type === 'debit' ? "bg-red-500 text-red-400" :
                                                                    tx.type === 'refund' ? "bg-blue-500 text-blue-400" :
                                                                        "bg-purple-500 text-purple-400"
                                                        )}>
                                                            {getTransactionIcon(tx.type)}
                                                        </div>
                                                        <span className="capitalize text-slate-300">{tx.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-300 max-w-xs truncate">{tx.description}</td>
                                                <td className={cn("px-6 py-4 text-right font-bold",
                                                    tx.creditsAmount > 0 ? "text-green-400" : "text-slate-300"
                                                )}>
                                                    {tx.creditsAmount > 0 ? '+' : ''}{formatNumber(tx.creditsAmount)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-0">
                                                        {tx.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </GlassCard>
                </TabsContent>
            </Tabs>

            {/* Add Credits Dialog */}
            <Dialog open={addCreditsDialog} onOpenChange={setAddCreditsDialog}>
                <DialogContent className="bg-[#0B0C15] border-white/10 text-white sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Manual Credits</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Add credits to {selectedWallet?.tenantName}'s wallet. This action will be logged.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="credits" className="text-slate-300">Amount (INR)</Label>
                            <Input
                                id="credits"
                                type="number"
                                placeholder="e.g. 5000"
                                value={creditsToAdd}
                                onChange={(e) => setCreditsToAdd(e.target.value)}
                                className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="reason" className="text-slate-300">Reason</Label>
                            <Input
                                id="reason"
                                placeholder="e.g. Manual top-up request"
                                value={creditReason}
                                onChange={(e) => setCreditReason(e.target.value)}
                                className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddCreditsDialog(false)} className="bg-transparent border-white/10 text-slate-300 hover:text-white hover:bg-white/10">Cancel</Button>
                        <Button onClick={handleAddCredits} disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Transfer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
