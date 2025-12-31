'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Plus, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { billingApi, MessageWallet } from '@/lib/billing';
import { TopUpModal } from '@/components/billing/top-up-modal';

export function WalletOverview() {
    const { user } = useAuth();
    const [wallet, setWallet] = useState<MessageWallet | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showTopUp, setShowTopUp] = useState(false);

    const fetchWallet = async () => {
        if (!user?.tenantId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await billingApi.getWallet(user.tenantId);
            setWallet(data);
        } catch (err) {
            console.error('Failed to fetch wallet:', err);
            setError('Failed to load wallet');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.tenantId) {
            fetchWallet();
        }
    }, [user?.tenantId]);

    if (!user) return null;

    if (loading && !wallet) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Message Credits</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Message Credits</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-16 text-destructive gap-2">
                        <AlertTriangle className="h-6 w-6" />
                        <span className="text-xs">Error loading wallet</span>
                        <Button variant="ghost" size="sm" onClick={fetchWallet} className="h-6">Retry</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Message Credits</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {wallet?.creditBalance?.toLocaleString() || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Available for messaging
                    </p>
                    <div className="mt-4 flex gap-2">
                        <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                            onClick={() => setShowTopUp(true)}
                        >
                            <Plus className="mr-2 h-3 w-3" /> Top Up
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={fetchWallet}
                            title="Refresh Balance"
                        >
                            <RefreshCw className="h-3 w-3" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {showTopUp && (
                <TopUpModal
                    open={showTopUp}
                    onOpenChange={setShowTopUp}
                    currentBalance={wallet?.creditBalance || 0}
                    onSuccess={() => {
                        fetchWallet();
                        setShowTopUp(false);
                    }}
                />
            )}
        </>
    );
}
