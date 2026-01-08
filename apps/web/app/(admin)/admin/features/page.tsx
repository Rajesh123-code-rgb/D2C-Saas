'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    Flag,
    Plus,
    Search,
    Edit,
    Filter,
    Loader2,
    RefreshCw,
    Shield,
    Zap,
    MessageSquare,
    BarChart,
    CreditCard,
    Layers,
    Bot
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { featureFlagsApi, FeatureFlag } from '@/lib/admin/api';


const categories = ['all', 'automation', 'ai', 'whatsapp', 'campaigns', 'analytics', 'billing', 'integrations'];

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'automation': return Zap;
        case 'ai': return Bot;
        case 'whatsapp': return MessageSquare;
        case 'analytics': return BarChart;
        case 'billing': return CreditCard;
        case 'integrations': return Layers;
        default: return Flag;
    }
};

export default function FeatureFlagsPage() {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchFlags = useCallback(async () => {
        setLoading(true);
        try {
            const params = categoryFilter !== 'all' ? { category: categoryFilter } : undefined;
            const data = await featureFlagsApi.getAll(params);
            setFlags(data);
        } catch (err: any) {
            console.error('Failed to fetch feature flags:', err.message);
            setFlags([]);
        } finally {
            setLoading(false);
        }
    }, [categoryFilter]);

    useEffect(() => {
        fetchFlags();
    }, [fetchFlags]);

    const filteredFlags = flags.filter((flag) => {
        const matchesSearch =
            flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            flag.key.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const groupedFlags = filteredFlags.reduce((acc, flag) => {
        if (!acc[flag.category]) {
            acc[flag.category] = [];
        }
        acc[flag.category].push(flag);
        return acc;
    }, {} as Record<string, FeatureFlag[]>);

    const handleToggle = async (flagId: string, isActive: boolean) => {
        try {
            await featureFlagsApi.toggle(flagId, isActive);
            setFlags((prev) =>
                prev.map((f) => (f.id === flagId ? { ...f, isActive } : f))
            );
        } catch (err: any) {
            console.error('Failed to toggle feature flag:', err.message);
        }
    };

    const handleSave = async () => {
        if (!editingFlag) return;

        setSaving(true);
        try {
            if (editingFlag.id && !editingFlag.id.startsWith('new-')) {
                await featureFlagsApi.update(editingFlag.id, editingFlag);
                setFlags((prev) =>
                    prev.map((f) => (f.id === editingFlag.id ? editingFlag : f))
                );
            } else {
                const newFlag = await featureFlagsApi.create({
                    key: editingFlag.key,
                    name: editingFlag.name,
                    description: editingFlag.description,
                    category: editingFlag.category,
                    type: editingFlag.type,
                    defaultValue: editingFlag.defaultValue,
                    planOverrides: editingFlag.planOverrides,
                });
                setFlags((prev) => [...prev, newFlag]);
            }
            setIsDialogOpen(false);
            setEditingFlag(null);
        } catch (err: any) {
            console.error('Failed to save feature flag:', err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleNewFlag = () => {
        setEditingFlag({
            id: `new-${Date.now()}`,
            key: '',
            name: '',
            description: '',
            category: 'automation',
            type: 'plan_gated',
            defaultValue: false,
            planOverrides: { free: false, starter: false, pro: true, enterprise: true },
            rolloutPercentage: 100,
            isActive: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Feature Flags</h1>
                    <p className="text-neutral-400 mt-1">Manage feature availability and rollouts across your platform</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                        onClick={fetchFlags}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-neutral-700 to-neutral-600 hover:from-neutral-600 hover:to-neutral-500 text-white shadow-lg shadow-black/30 border-0" onClick={handleNewFlag}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Flag
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-neutral-900/95 backdrop-blur-xl border-neutral-700 max-w-xl shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
                                    <Flag className="h-5 w-5 text-white" />
                                    {editingFlag?.id && !editingFlag.id.startsWith('new-') ? 'Edit Feature Flag' : 'Create Feature Flag'}
                                </DialogTitle>
                                <DialogDescription className="text-neutral-400">
                                    Configure usage rules and availability for this feature
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-5 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-neutral-300 font-medium">Flag Key</Label>
                                        <Input
                                            placeholder="feature.name.enabled"
                                            value={editingFlag?.key || ''}
                                            onChange={(e) =>
                                                setEditingFlag((prev) =>
                                                    prev ? { ...prev, key: e.target.value } : null
                                                )
                                            }
                                            className="bg-neutral-950/50 border-neutral-800 text-white font-mono text-sm focus:border-white/50 focus:ring-neutral-500/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-neutral-300 font-medium">Display Name</Label>
                                        <Input
                                            placeholder="Feature Name"
                                            value={editingFlag?.name || ''}
                                            onChange={(e) =>
                                                setEditingFlag((prev) =>
                                                    prev ? { ...prev, name: e.target.value } : null
                                                )
                                            }
                                            className="bg-neutral-950/50 border-neutral-800 text-white focus:border-white/50 focus:ring-neutral-500/20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300 font-medium">Description</Label>
                                    <Input
                                        placeholder="What does this feature control?"
                                        value={editingFlag?.description || ''}
                                        onChange={(e) =>
                                            setEditingFlag((prev) =>
                                                prev ? { ...prev, description: e.target.value } : null
                                            )
                                        }
                                        className="bg-neutral-950/50 border-neutral-800 text-white focus:border-white/50 focus:ring-neutral-500/20"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-neutral-300 font-medium">Category</Label>
                                        <Select
                                            value={editingFlag?.category || 'automation'}
                                            onValueChange={(value) =>
                                                setEditingFlag((prev) =>
                                                    prev ? { ...prev, category: value } : null
                                                )
                                            }
                                        >
                                            <SelectTrigger className="bg-neutral-950/50 border-neutral-800 text-white focus:border-white/50 focus:ring-neutral-500/20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-neutral-900 border-neutral-700">
                                                {categories.filter(c => c !== 'all').map((cat) => (
                                                    <SelectItem key={cat} value={cat} className="text-white capitalize">
                                                        {cat}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-neutral-300 font-medium">Rollout Strategy</Label>
                                        <Select
                                            value={editingFlag?.type || 'plan_gated'}
                                            onValueChange={(value: 'boolean' | 'plan_gated' | 'percentage' | 'tenant_list') =>
                                                setEditingFlag((prev) =>
                                                    prev ? { ...prev, type: value } : null
                                                )
                                            }
                                        >
                                            <SelectTrigger className="bg-neutral-950/50 border-neutral-800 text-white focus:border-white/50 focus:ring-neutral-500/20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-neutral-900 border-neutral-700">
                                                <SelectItem value="boolean" className="text-white">Boolean (On/Off)</SelectItem>
                                                <SelectItem value="plan_gated" className="text-white">Plan Gated</SelectItem>
                                                <SelectItem value="percentage" className="text-white">Percentage Rollout</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {editingFlag?.type === 'plan_gated' && (
                                    <div className="space-y-3 p-4 bg-neutral-950/50 rounded-lg border border-neutral-800">
                                        <Label className="text-white font-medium flex items-center gap-2">
                                            <Shield className="h-3 w-3" />
                                            Plan Entitlements
                                        </Label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {['free', 'starter', 'pro', 'enterprise'].map((plan) => (
                                                <div key={plan} className="flex flex-col gap-2 p-2 rounded bg-neutral-900/50 border border-neutral-800/50">
                                                    <span className="text-xs font-medium text-neutral-400 capitalize">{plan}</span>
                                                    <Switch
                                                        checked={(editingFlag?.planOverrides as Record<string, boolean>)?.[plan] || false}
                                                        onCheckedChange={(checked) =>
                                                            setEditingFlag((prev) =>
                                                                prev
                                                                    ? {
                                                                        ...prev,
                                                                        planOverrides: {
                                                                            ...(prev.planOverrides as Record<string, boolean>),
                                                                            [plan]: checked,
                                                                        },
                                                                    }
                                                                    : null
                                                            )
                                                        }
                                                        className="data-[state=checked]:bg-neutral-600"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsDialogOpen(false)}
                                    className="text-neutral-400 hover:text-white hover:bg-neutral-800"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    className="bg-neutral-700 hover:bg-neutral-600 text-white"
                                    disabled={saving}
                                >
                                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters */}
            <GlassCard className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input
                            placeholder="Search flags by name or key..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-neutral-900/50 border-neutral-700 text-white placeholder:text-neutral-600 focus:border-white/50 focus:ring-neutral-500/20"
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-56 bg-neutral-900/50 border-neutral-700 text-white focus:border-white/50 focus:ring-neutral-500/20">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-white" />
                                <span className="capitalize">
                                    {categoryFilter === 'all' ? 'All Categories' : categoryFilter}
                                </span>
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-700">
                            {categories.map((cat) => (
                                <SelectItem key={cat} value={cat} className="text-white capitalize">
                                    {cat === 'all' ? 'All Categories' : cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </GlassCard>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            )}

            {/* Feature Flags List */}
            {!loading && (
                <div className="space-y-8">
                    {Object.entries(groupedFlags).map(([category, categoryFlags]) => {
                        const Icon = getCategoryIcon(category);
                        return (
                            <section key={category} className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <Icon className="h-5 w-5 text-white" />
                                    <h2 className="text-lg font-semibold text-white capitalize">{category}</h2>
                                    <Badge variant="secondary" className="bg-neutral-800 text-neutral-400 ml-2">
                                        {categoryFlags.length}
                                    </Badge>
                                </div>

                                <div className="grid gap-3">
                                    {categoryFlags.map((flag) => (
                                        <GlassCard key={flag.id} className="group hover:border-neutral-700 transition-all duration-300">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center p-4 gap-4">
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex items-center flex-wrap gap-3">
                                                        <h3 className="font-medium text-white text-base truncate pr-2">{flag.name}</h3>
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-neutral-950/50 text-neutral-400 border-neutral-800 font-mono text-[10px] lowercase tracking-wide"
                                                        >
                                                            {flag.key}
                                                        </Badge>
                                                        <Badge
                                                            variant={flag.isActive ? 'default' : 'destructive'}
                                                            className={cn(
                                                                'ml-auto sm:ml-0',
                                                                flag.isActive
                                                                    ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                                                                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                                            )}
                                                        >
                                                            {flag.isActive ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-neutral-400 line-clamp-1">{flag.description}</p>

                                                    {flag.type === 'plan_gated' && flag.planOverrides && (
                                                        <div className="flex flex-wrap gap-2 pt-2 mt-1">
                                                            {Object.entries(flag.planOverrides).map(([plan, enabled]) => (
                                                                <div key={plan} className={cn(
                                                                    "flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] border",
                                                                    enabled
                                                                        ? "bg-neutral-800/50 border-neutral-700/50 text-neutral-300 opactiy-100"
                                                                        : "bg-transparent border-transparent text-neutral-600 opacity-60"
                                                                )}>
                                                                    <span className="capitalize">{plan}</span>
                                                                    {/* <div className={cn("h-1.5 w-1.5 rounded-full", enabled ? "bg-neutral-400" : "bg-neutral-700")} /> */}
                                                                    {enabled && <Zap className="h-2.5 w-2.5 text-white" />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 border-neutral-800 pt-3 sm:pt-0 mt-2 sm:mt-0">
                                                    <div className="flex items-center gap-3">
                                                        <Label className="text-xs text-neutral-500 sm:hidden">Status</Label>
                                                        <Switch
                                                            checked={flag.isActive}
                                                            onCheckedChange={(checked) => handleToggle(flag.id, checked)}
                                                            className="data-[state=checked]:bg-neutral-600"
                                                        />
                                                    </div>
                                                    <div className="h-4 w-px bg-neutral-800 hidden sm:block" />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-neutral-400 hover:text-white hover:bg-neutral-800"
                                                        onClick={() => {
                                                            setEditingFlag(flag);
                                                            setIsDialogOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Button>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            {!loading && filteredFlags.length === 0 && (
                <GlassCard className="py-16 text-center">
                    <div className="bg-neutral-900/50 p-4 rounded-full inline-flex mb-4">
                        <Search className="h-8 w-8 text-neutral-600" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No feature flags found</h3>
                    <p className="text-neutral-400 max-w-sm mx-auto">
                        Try adjusting your search or category filter enabled to find what you're looking for.
                    </p>
                </GlassCard>
            )}
        </div>
    );
}
