'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    Plus,
    Save,
    Loader2,
    RefreshCw,
    Check,
    Star,
    Settings,
    GripVertical,
    Trash2,
} from 'lucide-react';
import { CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface PlanFeature {
    id: string;
    name: string;
    description: string;
    type: 'boolean' | 'number' | 'unlimited';
    value: boolean | number;
    category: string;
}

interface PricingPlan {
    id: string;
    tier: string;
    displayName: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
    features: PlanFeature[];
    isActive: boolean;
    isPopular: boolean;
    sortOrder: number;
}

const defaultFeatures: PlanFeature[] = [
    { id: 'f1', name: 'Max Contacts', description: 'Maximum number of contacts', type: 'number', value: 100, category: 'Limits' },
    { id: 'f2', name: 'Max Agents', description: 'Maximum team members', type: 'number', value: 1, category: 'Limits' },
    { id: 'f3', name: 'Max Automations', description: 'Number of automation workflows', type: 'number', value: 3, category: 'Limits' },
    { id: 'f4', name: 'Max Campaigns/Month', description: 'Monthly campaign limit', type: 'number', value: 5, category: 'Limits' },
    { id: 'f5', name: 'AI Features', description: 'Access to AI-powered features', type: 'boolean', value: false, category: 'Features' },
    { id: 'f6', name: 'API Access', description: 'Developer API access', type: 'boolean', value: false, category: 'Features' },
    { id: 'f7', name: 'Custom Webhooks', description: 'Create custom webhooks', type: 'boolean', value: false, category: 'Features' },
    { id: 'f8', name: 'Priority Support', description: '24/7 priority support', type: 'boolean', value: false, category: 'Support' },
    { id: 'f9', name: 'Dedicated Account Manager', description: 'Personal account manager', type: 'boolean', value: false, category: 'Support' },
    { id: 'f10', name: 'White Labeling', description: 'Remove branding', type: 'boolean', value: false, category: 'Enterprise' },
    { id: 'f11', name: 'Advanced Analytics', description: 'Detailed analytics dashboard', type: 'boolean', value: false, category: 'Features' },
    { id: 'f12', name: 'Custom Integrations', description: 'Build custom integrations', type: 'boolean', value: false, category: 'Enterprise' },
];

const mockPlans: PricingPlan[] = [
    {
        id: '1',
        tier: 'free',
        displayName: 'Free',
        description: 'For individuals getting started',
        monthlyPrice: 0,
        yearlyPrice: 0,
        currency: 'INR',
        features: [
            { id: 'f1', name: 'Max Contacts', description: 'Maximum number of contacts', type: 'number', value: 100, category: 'Limits' },
            { id: 'f2', name: 'Max Agents', description: 'Maximum team members', type: 'number', value: 1, category: 'Limits' },
            { id: 'f3', name: 'Max Automations', description: 'Number of automation workflows', type: 'number', value: 3, category: 'Limits' },
            { id: 'f4', name: 'Max Campaigns/Month', description: 'Monthly campaign limit', type: 'number', value: 5, category: 'Limits' },
            { id: 'f5', name: 'AI Features', description: 'Access to AI-powered features', type: 'boolean', value: false, category: 'Features' },
        ],
        isActive: true,
        isPopular: false,
        sortOrder: 1,
    },
    {
        id: '2',
        tier: 'starter',
        displayName: 'Starter',
        description: 'For small teams',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        currency: 'INR',
        features: [
            { id: 'f1', name: 'Max Contacts', description: 'Maximum number of contacts', type: 'number', value: 1000, category: 'Limits' },
            { id: 'f2', name: 'Max Agents', description: 'Maximum team members', type: 'number', value: 3, category: 'Limits' },
            { id: 'f3', name: 'Max Automations', description: 'Number of automation workflows', type: 'number', value: 10, category: 'Limits' },
            { id: 'f4', name: 'Max Campaigns/Month', description: 'Monthly campaign limit', type: 'number', value: 20, category: 'Limits' },
            { id: 'f5', name: 'AI Features', description: 'Access to AI-powered features', type: 'boolean', value: true, category: 'Features' },
            { id: 'f6', name: 'API Access', description: 'Developer API access', type: 'boolean', value: false, category: 'Features' },
        ],
        isActive: true,
        isPopular: false,
        sortOrder: 2,
    },
    {
        id: '3',
        tier: 'pro',
        displayName: 'Pro',
        description: 'For growing businesses',
        monthlyPrice: 2999,
        yearlyPrice: 29990,
        currency: 'INR',
        features: [
            { id: 'f1', name: 'Max Contacts', description: 'Maximum number of contacts', type: 'number', value: 10000, category: 'Limits' },
            { id: 'f2', name: 'Max Agents', description: 'Maximum team members', type: 'number', value: 10, category: 'Limits' },
            { id: 'f3', name: 'Max Automations', description: 'Number of automation workflows', type: 'number', value: 50, category: 'Limits' },
            { id: 'f4', name: 'Max Campaigns/Month', description: 'Monthly campaign limit', type: 'number', value: 100, category: 'Limits' },
            { id: 'f5', name: 'AI Features', description: 'Access to AI-powered features', type: 'boolean', value: true, category: 'Features' },
            { id: 'f6', name: 'API Access', description: 'Developer API access', type: 'boolean', value: true, category: 'Features' },
            { id: 'f7', name: 'Custom Webhooks', description: 'Create custom webhooks', type: 'boolean', value: true, category: 'Features' },
            { id: 'f8', name: 'Priority Support', description: '24/7 priority support', type: 'boolean', value: true, category: 'Support' },
            { id: 'f11', name: 'Advanced Analytics', description: 'Detailed analytics dashboard', type: 'boolean', value: true, category: 'Features' },
        ],
        isActive: true,
        isPopular: true,
        sortOrder: 3,
    },
    {
        id: '4',
        tier: 'enterprise',
        displayName: 'Enterprise',
        description: 'For large organizations',
        monthlyPrice: 9999,
        yearlyPrice: 99990,
        currency: 'INR',
        features: [
            { id: 'f1', name: 'Max Contacts', description: 'Maximum number of contacts', type: 'unlimited', value: -1, category: 'Limits' },
            { id: 'f2', name: 'Max Agents', description: 'Maximum team members', type: 'unlimited', value: -1, category: 'Limits' },
            { id: 'f3', name: 'Max Automations', description: 'Number of automation workflows', type: 'unlimited', value: -1, category: 'Limits' },
            { id: 'f4', name: 'Max Campaigns/Month', description: 'Monthly campaign limit', type: 'unlimited', value: -1, category: 'Limits' },
            { id: 'f5', name: 'AI Features', description: 'Access to AI-powered features', type: 'boolean', value: true, category: 'Features' },
            { id: 'f6', name: 'API Access', description: 'Developer API access', type: 'boolean', value: true, category: 'Features' },
            { id: 'f7', name: 'Custom Webhooks', description: 'Create custom webhooks', type: 'boolean', value: true, category: 'Features' },
            { id: 'f8', name: 'Priority Support', description: '24/7 priority support', type: 'boolean', value: true, category: 'Support' },
            { id: 'f9', name: 'Dedicated Account Manager', description: 'Personal account manager', type: 'boolean', value: true, category: 'Support' },
            { id: 'f10', name: 'White Labeling', description: 'Remove branding', type: 'boolean', value: true, category: 'Enterprise' },
            { id: 'f11', name: 'Advanced Analytics', description: 'Detailed analytics dashboard', type: 'boolean', value: true, category: 'Features' },
            { id: 'f12', name: 'Custom Integrations', description: 'Build custom integrations', type: 'boolean', value: true, category: 'Enterprise' },
        ],
        isActive: true,
        isPopular: false,
        sortOrder: 4,
    },
];

export default function PricingPage() {
    const [plans, setPlans] = useState<PricingPlan[]>(mockPlans);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
    const [editDialog, setEditDialog] = useState(false);
    const [newFeatureName, setNewFeatureName] = useState('');
    const [newFeatureCategory, setNewFeatureCategory] = useState('Features');


    const fetchPlans = useCallback(async () => {
        setLoading(true);
        try {
            // Note: pricingApi.getAll() returns ConversationPricing (per-message costs)
            // not subscription PricingPlan. Using mock data until subscription plan API is added.
            // TODO: Add subscriptionPlansApi.getAll() endpoint
            setPlans(mockPlans);
        } catch (err: any) {
            console.warn('Could not fetch pricing plans, using mock data:', err.message);
            setPlans(mockPlans);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const formatCurrency = (amount: number) => {
        if (amount === 0) return 'Free';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatFeatureValue = (feature: PlanFeature) => {
        if (feature.type === 'unlimited' || feature.value === -1) return 'Unlimited';
        if (feature.type === 'boolean') return feature.value ? 'Yes' : 'No';
        return feature.value.toLocaleString();
    };

    const handleEditPlan = (plan: PricingPlan) => {
        setEditingPlan(JSON.parse(JSON.stringify(plan)));
        setEditDialog(true);
    };

    const handleSavePlan = () => {
        if (!editingPlan) return;
        setSaving(true);
        setTimeout(() => {
            setPlans(prev => prev.map(p => p.id === editingPlan.id ? editingPlan : p));
            setEditDialog(false);
            setEditingPlan(null);
            setSaving(false);
        }, 500);
    };

    const togglePopular = (planId: string) => {
        setPlans(prev => prev.map(p =>
            p.id === planId ? { ...p, isPopular: !p.isPopular } : { ...p, isPopular: false }
        ));
    };

    const updateFeatureValue = (featureId: string, value: boolean | number | string) => {
        if (!editingPlan) return;
        setEditingPlan({
            ...editingPlan,
            features: editingPlan.features.map(f =>
                f.id === featureId
                    ? { ...f, value: typeof value === 'string' ? (value === 'unlimited' ? -1 : parseInt(value) || 0) : value }
                    : f
            )
        });
    };

    const updateFeatureType = (featureId: string, type: 'boolean' | 'number' | 'unlimited') => {
        if (!editingPlan) return;
        setEditingPlan({
            ...editingPlan,
            features: editingPlan.features.map(f =>
                f.id === featureId
                    ? { ...f, type, value: type === 'boolean' ? false : type === 'unlimited' ? -1 : 0 }
                    : f
            )
        });
    };

    const removeFeature = (featureId: string) => {
        if (!editingPlan) return;
        setEditingPlan({
            ...editingPlan,
            features: editingPlan.features.filter(f => f.id !== featureId)
        });
    };

    const addFeatureToPlan = () => {
        if (!editingPlan || !newFeatureName.trim()) return;
        const newFeature: PlanFeature = {
            id: `f_${Date.now()}`,
            name: newFeatureName.trim(),
            description: '',
            type: 'boolean',
            value: false,
            category: newFeatureCategory,
        };
        setEditingPlan({
            ...editingPlan,
            features: [...editingPlan.features, newFeature]
        });
        setNewFeatureName('');

    };

    const addExistingFeature = (feature: PlanFeature) => {
        if (!editingPlan) return;
        if (editingPlan.features.some(f => f.id === feature.id)) return;
        setEditingPlan({
            ...editingPlan,
            features: [...editingPlan.features, { ...feature }]
        });
    };

    const getAvailableFeatures = () => {
        if (!editingPlan) return defaultFeatures;
        return defaultFeatures.filter(f => !editingPlan.features.some(ef => ef.id === f.id));
    };

    const groupFeaturesByCategory = (features: PlanFeature[]) => {
        return features.reduce((acc, feature) => {
            const cat = feature.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(feature);
            return acc;
        }, {} as Record<string, PlanFeature[]>);
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Pricing Plans</h1>
                    <p className="text-slate-400 mt-2 text-lg">Manage subscription tiers, pricing, and features</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white backdrop-blur-md"
                        disabled={loading}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Plan
                    </Button>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => (
                    <GlassCard
                        key={plan.id}
                        className={cn(
                            "relative overflow-visible group flex flex-col h-full",
                            plan.isPopular ? "border-indigo-500/50 shadow-lg shadow-indigo-500/10" : "hover:border-white/20"
                        )}
                    >
                        {plan.isPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                <Badge className="bg-indigo-600 text-white border-0 shadow-lg shadow-indigo-500/40 px-3 py-1">
                                    <Star className="h-3 w-3 mr-1 fill-white" />
                                    Popular
                                </Badge>
                            </div>
                        )}
                        <CardHeader className="pt-6 relative z-0">
                            <div className="flex items-center justify-between mb-2">
                                <CardTitle className="text-xl text-white">{plan.displayName}</CardTitle>
                                <Badge className={cn(
                                    "border-0",
                                    plan.isActive
                                        ? "bg-green-500/10 text-green-400"
                                        : "bg-slate-500/10 text-slate-400"
                                )}>
                                    {plan.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                            <CardDescription className="text-slate-400 min-h-[40px]">
                                {plan.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-1 flex flex-col">
                            <div className="pb-4 border-b border-white/5">
                                <p className="text-3xl font-bold text-white tracking-tight">
                                    {formatCurrency(plan.monthlyPrice)}
                                    {plan.monthlyPrice > 0 && (
                                        <span className="text-sm font-normal text-slate-400 ml-1">/mo</span>
                                    )}
                                </p>
                                {plan.yearlyPrice > 0 && (
                                    <p className="text-xs text-green-400 mt-2 font-medium bg-green-500/10 inline-block px-2 py-1 rounded">
                                        Save {Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)}% yearly
                                    </p>
                                )}
                            </div>

                            <div className="space-y-3 flex-1">
                                {plan.features.slice(0, 6).map((feature) => (
                                    <div key={feature.id} className="flex items-start gap-3 text-sm text-slate-300">
                                        <div className="h-5 w-5 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="h-3 w-3 text-indigo-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="truncate block font-medium text-slate-200">{feature.name}</span>
                                            <span className="text-xs text-slate-500">{formatFeatureValue(feature)}</span>
                                        </div>
                                    </div>
                                ))}
                                {plan.features.length > 6 && (
                                    <p className="text-xs text-indigo-400 pl-8 font-medium">+{plan.features.length - 6} more features</p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2 mt-auto">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                                    onClick={() => handleEditPlan(plan)}
                                >
                                    <Settings className="h-4 w-4 mr-2" />
                                    Configure
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className={cn(
                                        "bg-white/5 border-white/10 hover:bg-white/10",
                                        plan.isPopular
                                            ? "text-indigo-400 hover:text-indigo-300"
                                            : "text-slate-400 hover:text-white"
                                    )}
                                    onClick={() => togglePopular(plan.id)}
                                >
                                    <Star className={cn("h-4 w-4", plan.isPopular && "fill-current")} />
                                </Button>
                            </div>
                        </CardContent>
                    </GlassCard>
                ))}
            </div>

            {/* Advanced Edit Dialog */}
            <Dialog open={editDialog} onOpenChange={setEditDialog}>
                <DialogContent className="bg-[#0B0C15] border-white/10 text-white max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-indigo-500/10">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2 text-white">
                            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                <Settings className="h-5 w-5" />
                            </div>
                            Configure Plan: {editingPlan?.displayName}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Manage pricing, features, and limits for this subscription tier
                        </DialogDescription>
                    </DialogHeader>

                    {editingPlan && (
                        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col mt-4">
                            <TabsList className="bg-white/5 border-white/10 w-full justify-start p-1 h-auto">
                                <TabsTrigger value="general" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">General</TabsTrigger>
                                <TabsTrigger value="features" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Features ({editingPlan.features.length})</TabsTrigger>
                                <TabsTrigger value="add" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Add Features</TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-y-auto mt-6 pr-2 custom-scrollbar">
                                <TabsContent value="general" className="space-y-6 mt-0">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Display Name</Label>
                                            <Input
                                                value={editingPlan.displayName}
                                                onChange={(e) => setEditingPlan({ ...editingPlan, displayName: e.target.value })}
                                                className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Tier Identifier</Label>
                                            <Input
                                                value={editingPlan.tier}
                                                onChange={(e) => setEditingPlan({ ...editingPlan, tier: e.target.value })}
                                                className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Description</Label>
                                        <Textarea
                                            value={editingPlan.description}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                            rows={2}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Monthly Price (₹)</Label>
                                            <Input
                                                type="number"
                                                value={editingPlan.monthlyPrice}
                                                onChange={(e) => setEditingPlan({
                                                    ...editingPlan,
                                                    monthlyPrice: parseInt(e.target.value) || 0
                                                })}
                                                className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Yearly Price (₹)</Label>
                                            <Input
                                                type="number"
                                                value={editingPlan.yearlyPrice}
                                                onChange={(e) => setEditingPlan({
                                                    ...editingPlan,
                                                    yearlyPrice: parseInt(e.target.value) || 0
                                                })}
                                                className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                            />
                                            {editingPlan.monthlyPrice > 0 && (
                                                <p className="text-xs text-green-400 mt-1">
                                                    Suggested: {formatCurrency(editingPlan.monthlyPrice * 10)} (2 months free)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                            <div>
                                                <Label className="text-white">Plan Active</Label>
                                                <p className="text-xs text-slate-400">Visible to customers</p>
                                            </div>
                                            <Switch
                                                checked={editingPlan.isActive}
                                                onCheckedChange={(checked) => setEditingPlan({ ...editingPlan, isActive: checked })}
                                            />
                                        </div>
                                        <div className="flex-1 flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                            <div>
                                                <Label className="text-white">Mark as Popular</Label>
                                                <p className="text-xs text-slate-400">Highlight this plan</p>
                                            </div>
                                            <Switch
                                                checked={editingPlan.isPopular}
                                                onCheckedChange={(checked) => setEditingPlan({ ...editingPlan, isPopular: checked })}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="features" className="mt-0">
                                    <div className="space-y-6">
                                        {Object.entries(groupFeaturesByCategory(editingPlan.features)).map(([category, features]) => (
                                            <div key={category} className="space-y-3">
                                                <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider pl-1">{category}</h3>
                                                <div className="space-y-2">
                                                    {features.map((feature) => (
                                                        <div
                                                            key={feature.id}
                                                            className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 group hover:border-white/20 transition-colors"
                                                        >
                                                            <GripVertical className="h-4 w-4 text-slate-600 cursor-move" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-white truncate">{feature.name}</p>
                                                                <p className="text-xs text-slate-400 truncate opacity-70 group-hover:opacity-100 transition-opacity">{feature.description}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Select
                                                                    value={feature.type}
                                                                    onValueChange={(v) => updateFeatureType(feature.id, v as 'boolean' | 'number' | 'unlimited')}
                                                                >
                                                                    <SelectTrigger className="w-28 h-8 bg-black/50 border-white/10 text-white text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="bg-[#0B0C15] border-white/10 text-white">
                                                                        <SelectItem value="boolean">Boolean</SelectItem>
                                                                        <SelectItem value="number">Number</SelectItem>
                                                                        <SelectItem value="unlimited">Unlimited</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                {feature.type === 'boolean' && (
                                                                    <Switch
                                                                        checked={feature.value as boolean}
                                                                        onCheckedChange={(v) => updateFeatureValue(feature.id, v)}
                                                                    />
                                                                )}
                                                                {feature.type === 'number' && (
                                                                    <Input
                                                                        type="number"
                                                                        value={feature.value as number}
                                                                        onChange={(e) => updateFeatureValue(feature.id, e.target.value)}
                                                                        className="w-24 h-8 bg-black/50 border-white/10 text-white text-xs"
                                                                    />
                                                                )}
                                                                {feature.type === 'unlimited' && (
                                                                    <Badge className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30">∞</Badge>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                                    onClick={() => removeFeature(feature.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {editingPlan.features.length === 0 && (
                                            <div className="text-center py-8 text-slate-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                                                No features configured. Add features from the "Add Features" tab.
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="add" className="mt-0 space-y-6">
                                    {/* Add Existing Feature */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-white">Add from Template</h3>
                                            <span className="text-xs text-slate-400">Quickly add common features</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {getAvailableFeatures().map((feature) => (
                                                <Button
                                                    key={feature.id}
                                                    variant="outline"
                                                    className="justify-start h-auto py-3 px-4 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white hover:border-indigo-500/50 transition-all text-left"
                                                    onClick={() => addExistingFeature(feature)}
                                                >
                                                    <Plus className="h-4 w-4 mr-3 flex-shrink-0 text-indigo-400" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate">{feature.name}</p>
                                                        <p className="text-xs text-slate-500 truncate">{feature.category}</p>
                                                    </div>
                                                </Button>
                                            ))}
                                            {getAvailableFeatures().length === 0 && (
                                                <p className="text-sm text-slate-500 col-span-2 text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                                                    All template features have been added
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Create Custom Feature */}
                                    <div className="space-y-3 pt-6 border-t border-white/5">
                                        <h3 className="text-sm font-semibold text-white">Create Custom Feature</h3>
                                        <div className="flex gap-3">
                                            <Input
                                                placeholder="Feature name..."
                                                value={newFeatureName}
                                                onChange={(e) => setNewFeatureName(e.target.value)}
                                                className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                            />
                                            <Select value={newFeatureCategory} onValueChange={setNewFeatureCategory}>
                                                <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#0B0C15] border-white/10 text-white">
                                                    <SelectItem value="Limits">Limits</SelectItem>
                                                    <SelectItem value="Features">Features</SelectItem>
                                                    <SelectItem value="Support">Support</SelectItem>
                                                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                                onClick={addFeatureToPlan}
                                                disabled={!newFeatureName.trim()}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}

                    <DialogFooter className="mt-4 pt-4 border-t border-white/10">
                        <Button variant="ghost" onClick={() => setEditDialog(false)} className="text-slate-300 hover:text-white hover:bg-white/10">
                            Cancel
                        </Button>
                        <Button onClick={handleSavePlan} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
