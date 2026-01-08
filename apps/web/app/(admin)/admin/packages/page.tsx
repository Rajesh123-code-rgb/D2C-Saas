'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    Package,
    Plus,
    Edit,
    Save,
    RefreshCw,
    Zap,
    Check,
    Coins,
} from 'lucide-react';
import { CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { packagesApi, TopUpPackage } from '@/lib/admin/api';

// Using TopUpPackage from admin API types

const mockPackages: TopUpPackage[] = [
    {
        id: '1',
        name: 'Starter',
        description: 'Perfect for testing',
        credits: 1000,
        price: 500,
        bonusCredits: 0,
        currency: 'INR',
        isActive: true,
        isPopular: false,
        sortOrder: 1,
    },
    {
        id: '2',
        name: 'Growth',
        description: 'For growing teams',
        credits: 5000,
        price: 2250,
        bonusCredits: 500,
        currency: 'INR',
        isActive: true,
        isPopular: true,
        sortOrder: 2,
    },
    {
        id: '3',
        name: 'Business',
        description: 'For established businesses',
        credits: 15000,
        price: 6000,
        bonusCredits: 2000,
        currency: 'INR',
        isActive: true,
        isPopular: false,
        sortOrder: 3,
    },
    {
        id: '4',
        name: 'Enterprise',
        description: 'Maximum value',
        credits: 50000,
        price: 17500,
        bonusCredits: 10000,
        currency: 'INR',
        isActive: true,
        isPopular: false,
        sortOrder: 4,
    },
];

export default function PackagesPage() {
    const [packages, setPackages] = useState<TopUpPackage[]>(mockPackages);
    const [loading, setLoading] = useState(true);
    const [editingPackage, setEditingPackage] = useState<TopUpPackage | null>(null);
    const [editDialog, setEditDialog] = useState(false);

    const fetchPackages = useCallback(async () => {
        setLoading(true);
        try {
            const data = await packagesApi.getAll() as TopUpPackage[] | { data: TopUpPackage[] };
            if (data && Array.isArray(data)) {
                setPackages(data);
            } else if (data && (data as { data: TopUpPackage[] }).data) {
                setPackages((data as { data: TopUpPackage[] }).data);
            }
        } catch (err: any) {
            console.warn('Could not fetch packages, using mock data:', err.message);
            setPackages(mockPackages);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const handleEditPackage = (pkg: TopUpPackage) => {
        setEditingPackage({ ...pkg });
        setEditDialog(true);
    };

    const handleSavePackage = () => {
        if (!editingPackage) return;
        setPackages(prev => prev.map(p => p.id === editingPackage.id ? editingPackage : p));
        setEditDialog(false);
        setEditingPackage(null);
    };

    const togglePopular = (pkgId: string) => {
        setPackages(prev => prev.map(p =>
            p.id === pkgId ? { ...p, isPopular: !p.isPopular } : { ...p, isPopular: false }
        ));
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Top-Up Packages</h1>
                    <p className="text-neutral-400 mt-2 text-lg">Manage credit top-up packages for tenants</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white backdrop-blur-md"
                        disabled={loading}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button className="bg-neutral-700 hover:bg-neutral-600 text-white shadow-lg shadow-black/30">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Package
                    </Button>
                </div>
            </div>

            {/* Packages Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {packages.map((pkg) => (
                    <GlassCard
                        key={pkg.id}
                        className={cn(
                            "relative overflow-visible group",
                            pkg.isPopular ? "border-neutral-600 shadow-lg shadow-black/20" : "hover:border-white/20"
                        )}
                    >
                        {pkg.isPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                <Badge className="bg-neutral-700 text-white border-0 shadow-lg shadow-black/30 px-3 py-1">
                                    <Zap className="h-3 w-3 mr-1 fill-white" />
                                    Best Value
                                </Badge>
                            </div>
                        )}
                        <CardHeader className="pt-6 relative z-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn(
                                    "h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300",
                                    pkg.isPopular ? "bg-neutral-700 text-white" : "bg-white/5 text-neutral-400"
                                )}>
                                    <Package className="h-6 w-6" />
                                </div>
                                <Badge className={cn(
                                    "border-0",
                                    pkg.isActive
                                        ? "bg-neutral-800 text-neutral-300"
                                        : "bg-neutral-500/10 text-neutral-400"
                                )}>
                                    {pkg.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                            <CardTitle className="text-xl text-white">{pkg.name}</CardTitle>
                            <CardDescription className="text-neutral-400">
                                {pkg.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-1">
                                <p className="text-3xl font-bold text-white tracking-tight">
                                    {formatCurrency(pkg.price)}
                                </p>
                                <div className="flex items-center gap-2 text-neutral-400">
                                    <Coins className="h-4 w-4" />
                                    <span className="font-medium">{pkg.credits.toLocaleString()} credits</span>
                                </div>
                            </div>

                            {pkg.bonusCredits > 0 ? (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-neutral-800 border border-neutral-600/20">
                                    <div className="h-5 w-5 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0">
                                        <Check className="h-3 w-3 text-neutral-300" />
                                    </div>
                                    <span className="text-sm text-neutral-300 font-medium">
                                        +{pkg.bonusCredits.toLocaleString()} bonus credits
                                    </span>
                                </div>
                            ) : (
                                <div className="h-[46px]" /> /* Spacer to align cards */
                            )}

                            <div className="pt-4 border-t border-white/5 space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-neutral-500">Rate per 100 credits</span>
                                    <span className="text-neutral-300">{formatCurrency(pkg.price / pkg.credits * 100)}</span>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
                                        onClick={() => handleEditPackage(pkg)}
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className={cn(
                                            "bg-white/5 border-white/10 hover:bg-white/10",
                                            pkg.isPopular
                                                ? "text-white hover:text-neutral-300"
                                                : "text-neutral-400 hover:text-white"
                                        )}
                                        onClick={() => togglePopular(pkg.id)}
                                    >
                                        <Zap className={cn("h-4 w-4", pkg.isPopular && "fill-current")} />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </GlassCard>
                ))}
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialog} onOpenChange={setEditDialog}>
                <DialogContent className="bg-black border-white/10 text-white sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Package: {editingPackage?.name}</DialogTitle>
                        <DialogDescription className="text-neutral-400">
                            Modify pricing and credit allocation for this package.
                        </DialogDescription>
                    </DialogHeader>
                    {editingPackage && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Price (₹)</Label>
                                    <Input
                                        type="number"
                                        value={editingPackage.price}
                                        onChange={(e) => setEditingPackage({
                                            ...editingPackage,
                                            price: parseInt(e.target.value) || 0
                                        })}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Credits</Label>
                                    <Input
                                        type="number"
                                        value={editingPackage.credits}
                                        onChange={(e) => setEditingPackage({
                                            ...editingPackage,
                                            credits: parseInt(e.target.value) || 0
                                        })}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-neutral-300">Bonus Credits</Label>
                                <Input
                                    type="number"
                                    value={editingPackage.bonusCredits}
                                    onChange={(e) => setEditingPackage({
                                        ...editingPackage,
                                        bonusCredits: parseInt(e.target.value) || 0
                                    })}
                                    className="bg-white/5 border-white/10 text-white focus:border-white"
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                <Label className="text-neutral-300">Package Active</Label>
                                <Switch
                                    checked={editingPackage.isActive}
                                    onCheckedChange={(checked) => setEditingPackage({
                                        ...editingPackage,
                                        isActive: checked
                                    })}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditDialog(false)} className="text-neutral-300 hover:text-white hover:bg-white/10">
                            Cancel
                        </Button>
                        <Button onClick={handleSavePackage} className="bg-neutral-700 hover:bg-neutral-600 text-white">
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
