'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    CreditCard,
    Plus,
    Loader2,
    TrendingUp,
    TrendingDown,
    Calendar,
    RefreshCw,
} from 'lucide-react';
import { CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { organizationsApi, billingApi, Organization } from '@/lib/admin/api';
import { cn } from '@/lib/utils';

export default function OrganizationCreditsPage() {
    const params = useParams();
    const router = useRouter();
    const orgId = params.id as string;

    const [organization, setOrganization] = useState<Organization | null>(null);
    const [wallet, setWallet] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [credits, setCredits] = useState('');
    const [reason, setReason] = useState('');

    const fetchData = useCallback(async () => {
        if (!orgId) return;

        setLoading(true);
        setError(null);

        try {
            const orgData = await organizationsApi.getById(orgId);
            setOrganization(orgData);
        } catch (err: any) {
            console.error('Failed to fetch organization:', err.message);
            setError('Failed to load organization');
        }

        try {
            const walletData = await billingApi.getWallet(orgId);
            setWallet(walletData);
        } catch (err: any) {
            console.error('Failed to fetch wallet:', err.message);
        }

        try {
            const txData = await billingApi.getTenantTransactions(orgId, { limit: 10 });
            setTransactions(txData.data || []);
        } catch (err: any) {
            console.error('Failed to fetch transactions:', err.message);
        }

        setLoading(false);
    }, [orgId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddCredits = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!credits || !reason) {
            setError('Please enter credits amount and reason');
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            await billingApi.addCredits(orgId, {
                credits: parseInt(credits),
                reason: reason,
            });
            setSuccess(`Successfully added ${credits} credits`);
            setCredits('');
            setReason('');
            fetchData(); // Refresh data
        } catch (err: any) {
            console.error('Failed to add credits:', err.message);
            setError('Failed to add credits: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-IN').format(num);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Back Button */}
            <Button
                variant="ghost"
                onClick={() => router.push(`/admin/organizations/${orgId}`)}
                className="text-neutral-400 hover:text-white"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {organization?.name || 'Organization'}
            </Button>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Manage Credits</h1>
                    <p className="text-neutral-400 mt-2">
                        {organization?.name} - Credit balance and transactions
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    onClick={fetchData}
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="p-4 bg-neutral-800 border border-neutral-600/20 rounded-xl text-neutral-300 text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 bg-neutral-800 border border-neutral-500/30 rounded-xl text-white text-sm">
                    {success}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Current Balance */}
                <GlassCard className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Current Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-white mb-2">
                            {formatNumber(wallet?.creditBalance || organization?.creditsBalance || 0)}
                        </div>
                        <p className="text-neutral-400 text-sm">Available credits</p>
                    </CardContent>
                </GlassCard>

                {/* Add Credits Form */}
                <GlassCard className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Add Credits
                        </CardTitle>
                        <CardDescription className="text-neutral-400">
                            Manually add credits to this organization's wallet
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddCredits} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="credits" className="text-neutral-300">Credits Amount</Label>
                                    <Input
                                        id="credits"
                                        type="number"
                                        min="1"
                                        placeholder="Enter amount"
                                        value={credits}
                                        onChange={(e) => setCredits(e.target.value)}
                                        className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reason" className="text-neutral-300">Reason</Label>
                                    <Input
                                        id="reason"
                                        placeholder="e.g., Promotional credits"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                disabled={submitting || !credits || !reason}
                                className="bg-white hover:bg-neutral-200 text-black font-semibold border-0"
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4 mr-2" />
                                )}
                                Add Credits
                            </Button>
                        </form>
                    </CardContent>
                </GlassCard>
            </div>

            {/* Transaction History */}
            <GlassCard>
                <CardHeader>
                    <CardTitle className="text-white">Transaction History</CardTitle>
                    <CardDescription className="text-neutral-400">
                        Recent credit transactions for this organization
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {transactions.length === 0 ? (
                        <p className="text-neutral-400 text-center py-8">No transactions found</p>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((tx: any) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            tx.type === 'credit' ? 'bg-neutral-800' : 'bg-neutral-700'
                                        )}>
                                            {tx.type === 'credit' ? (
                                                <TrendingUp className="h-4 w-4 text-neutral-300" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 text-neutral-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{tx.description || tx.type}</p>
                                            <p className="text-neutral-500 text-sm flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(tx.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "font-bold text-lg",
                                            tx.creditsAmount > 0 ? 'text-neutral-300' : 'text-neutral-400'
                                        )}>
                                            {tx.creditsAmount > 0 ? '+' : ''}{formatNumber(tx.creditsAmount)}
                                        </p>
                                        <Badge className={cn(
                                            "border-0",
                                            tx.status === 'completed' ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-700 text-neutral-400'
                                        )}>
                                            {tx.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </GlassCard>
        </div>
    );
}
