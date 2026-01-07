'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Sparkles, AlertCircle } from 'lucide-react';
import { billingApi, TopUpPackage } from '@/lib/billing';
import { useAuth } from '@/hooks/useAuth';

interface TopUpModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentBalance: number;
    onSuccess: () => void;
}

export function TopUpModal({ open, onOpenChange, currentBalance, onSuccess }: TopUpModalProps) {
    const { user } = useAuth();
    const [packages, setPackages] = useState<TopUpPackage[]>([]);
    const [loadingPackages, setLoadingPackages] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    // const { toast } = useToast(); // Assuming standard toast exists, if not I'll just use alert for now or implement toast later

    useEffect(() => {
        if (open) {
            fetchPackages();
        }
    }, [open]);

    const fetchPackages = async () => {
        try {
            const data = await billingApi.getPackages();
            setPackages(data.sort((a, b) => a.price - b.price));

            // Auto select 'popular' or middle package
            const popular = data.find(p => p.isPopular);
            if (popular) setSelectedPackageId(popular.id);
            else if (data.length > 0) setSelectedPackageId(data[Math.floor(data.length / 2)].id);

        } catch (error) {
            console.error('Failed to load packages:', error);
        } finally {
            setLoadingPackages(false);
        }
    };

    const handlePurchase = async () => {
        if (!selectedPackageId || !user?.tenantId) return;

        setPurchasing(true);
        try {
            await billingApi.purchaseCredits({
                tenantId: user.tenantId,
                packageId: selectedPackageId,
                paymentMethodId: 'pm_mock_card', // For now, we mock/assume default method
            });

            // toast({
            //     title: "Purchase Successful",
            //     description: "Credits have been added to your wallet.",
            //     variant: "default",
            // });

            onSuccess();
        } catch (error) {
            console.error('Purchase failed:', error);
            // toast({
            //     title: "Purchase Failed",
            //     description: "Could not complete transaction. Please try again.",
            //     variant: "destructive",
            // });
            alert("Purchase failed. Please try again.");
        } finally {
            setPurchasing(false);
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Top Up Message Credits</DialogTitle>
                    <DialogDescription>
                        Purchase credits to send marketing and utility messages on WhatsApp.
                        Current Balance: <span className="font-semibold text-primary">{currentBalance.toLocaleString()} credits</span>
                    </DialogDescription>
                </DialogHeader>

                {loadingPackages ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : packages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>No top-up packages available at the moment.</p>
                        <p className="text-sm">Please contact support.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                        {packages.map((pkg) => {
                            const isSelected = selectedPackageId === pkg.id;

                            return (
                                <div
                                    key={pkg.id}
                                    className={`relative rounded-xl border-2 p-6 cursor-pointer transition-all hover:border-primary/50 ${isSelected
                                        ? 'border-primary bg-primary/5 shadow-md'
                                        : 'border-border bg-card'
                                        }`}
                                    onClick={() => setSelectedPackageId(pkg.id)}
                                >
                                    {pkg.isPopular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                            <Badge className="bg-primary text-primary-foreground border-primary shadow-sm">
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                Most Popular
                                            </Badge>
                                        </div>
                                    )}
                                    {pkg.isBestValue && !pkg.isPopular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                            <Badge variant="secondary" className="border-primary/20 bg-green-100 text-green-800 hover:bg-green-100">
                                                Best Value
                                            </Badge>
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <h3 className="font-semibold text-lg">{pkg.name}</h3>
                                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                                    </div>

                                    <div className="mb-6">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-bold">
                                                {formatCurrency(pkg.price, pkg.currency)}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium text-green-600 mt-1">
                                            {(pkg.price / pkg.totalCredits).toFixed(2)} per credit
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-6">
                                        <div className="flex justify-between text-sm py-1 border-b border-border/50">
                                            <span className="text-muted-foreground">Credits</span>
                                            <span className="font-medium">{pkg.credits.toLocaleString()}</span>
                                        </div>
                                        {pkg.bonusCredits > 0 && (
                                            <div className="flex justify-between text-sm py-1 border-b border-border/50 text-green-600">
                                                <span className="font-medium flex items-center">
                                                    <Sparkles className="w-3 h-3 mr-1" /> Bonus
                                                </span>
                                                <span className="font-bold">+{pkg.bonusCredits.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm py-2">
                                            <span className="font-semibold">Total</span>
                                            <span className="font-bold text-lg">{pkg.totalCredits.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className={`w-full h-8 flex items-center justify-center rounded-md transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                        {isSelected ? <Check className="w-5 h-5" /> : 'Select'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={purchasing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePurchase}
                        disabled={!selectedPackageId || purchasing || packages.length === 0}
                        className="w-full md:w-auto min-w-[150px]"
                    >
                        {purchasing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Purchase Credits'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
