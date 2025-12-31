'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Save,
    RefreshCw,
    Loader2,
    Shield,
    CheckCircle,
    Plus,
    X,
    MessageSquare,
    Zap,
    Lock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { governanceApi, WhatsAppTemplatePolicy } from '@/lib/admin/api';

const defaultCategories = { MARKETING: true, UTILITY: true, AUTHENTICATION: true };

const initialPolicy: WhatsAppTemplatePolicy = {
    id: 'temp',
    isGlobal: true,
    allowedCategories: {
        free: { ...defaultCategories, MARKETING: false },
        starter: { ...defaultCategories },
        pro: { ...defaultCategories },
        enterprise: { ...defaultCategories },
    },
    maxTemplatesPerDay: { free: 5, starter: 20, pro: 100, enterprise: 1000 },
    prohibitedKeywords: ['guaranteed', 'free money'],
    requireManualReview: false,
    autoRejectProhibited: true,
    updatedAt: new Date().toISOString(),
};

export function TemplatePolicyEditor() {
    const [policy, setPolicy] = useState<WhatsAppTemplatePolicy>(initialPolicy);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [keywordInput, setKeywordInput] = useState('');

    const fetchPolicy = useCallback(async () => {
        setLoading(true);
        try {
            const data = await governanceApi.getTemplatePolicy() as WhatsAppTemplatePolicy & { planRestrictions?: any; blockedKeywords?: string[] };
            // Deep merge with initial to ensure all nested fields exist
            // The API may return a different structure than expected
            const mergedPolicy: WhatsAppTemplatePolicy = {
                ...initialPolicy,
                ...data,
                // Ensure allowedCategories has correct structure per plan
                allowedCategories: {
                    free: {
                        MARKETING: data.allowedCategories?.free?.MARKETING ?? initialPolicy.allowedCategories.free.MARKETING,
                        UTILITY: data.allowedCategories?.free?.UTILITY ?? initialPolicy.allowedCategories.free.UTILITY,
                        AUTHENTICATION: data.allowedCategories?.free?.AUTHENTICATION ?? initialPolicy.allowedCategories.free.AUTHENTICATION,
                    },
                    starter: {
                        MARKETING: data.allowedCategories?.starter?.MARKETING ?? initialPolicy.allowedCategories.starter.MARKETING,
                        UTILITY: data.allowedCategories?.starter?.UTILITY ?? initialPolicy.allowedCategories.starter.UTILITY,
                        AUTHENTICATION: data.allowedCategories?.starter?.AUTHENTICATION ?? initialPolicy.allowedCategories.starter.AUTHENTICATION,
                    },
                    pro: {
                        MARKETING: data.allowedCategories?.pro?.MARKETING ?? initialPolicy.allowedCategories.pro.MARKETING,
                        UTILITY: data.allowedCategories?.pro?.UTILITY ?? initialPolicy.allowedCategories.pro.UTILITY,
                        AUTHENTICATION: data.allowedCategories?.pro?.AUTHENTICATION ?? initialPolicy.allowedCategories.pro.AUTHENTICATION,
                    },
                    enterprise: {
                        MARKETING: data.allowedCategories?.enterprise?.MARKETING ?? initialPolicy.allowedCategories.enterprise.MARKETING,
                        UTILITY: data.allowedCategories?.enterprise?.UTILITY ?? initialPolicy.allowedCategories.enterprise.UTILITY,
                        AUTHENTICATION: data.allowedCategories?.enterprise?.AUTHENTICATION ?? initialPolicy.allowedCategories.enterprise.AUTHENTICATION,
                    },
                },
                // Ensure maxTemplatesPerDay has correct structure
                maxTemplatesPerDay: {
                    free: data.maxTemplatesPerDay?.free ?? data.planRestrictions?.free?.maxTemplates ?? initialPolicy.maxTemplatesPerDay.free,
                    starter: data.maxTemplatesPerDay?.starter ?? data.planRestrictions?.starter?.maxTemplates ?? initialPolicy.maxTemplatesPerDay.starter,
                    pro: data.maxTemplatesPerDay?.pro ?? data.planRestrictions?.pro?.maxTemplates ?? initialPolicy.maxTemplatesPerDay.pro,
                    enterprise: data.maxTemplatesPerDay?.enterprise ?? data.planRestrictions?.enterprise?.maxTemplates ?? initialPolicy.maxTemplatesPerDay.enterprise,
                },
                // Map blockedKeywords to prohibitedKeywords if present
                prohibitedKeywords: data.prohibitedKeywords ?? data.blockedKeywords ?? initialPolicy.prohibitedKeywords,
            };
            setPolicy(mergedPolicy);
        } catch (err) {
            console.error('Failed to fetch policy:', err);
            // Use initial policy as fallback
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPolicy();
    }, [fetchPolicy]);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await governanceApi.updateTemplatePolicy(policy);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to update policy:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleAddKeyword = () => {
        if (!keywordInput.trim()) return;
        if (policy.prohibitedKeywords.includes(keywordInput.trim().toLowerCase())) {
            setKeywordInput('');
            return;
        }

        setPolicy(prev => ({
            ...prev,
            prohibitedKeywords: [...prev.prohibitedKeywords, keywordInput.trim().toLowerCase()]
        }));
        setKeywordInput('');
    };

    const handleRemoveKeyword = (keyword: string) => {
        setPolicy(prev => ({
            ...prev,
            prohibitedKeywords: prev.prohibitedKeywords.filter(k => k !== keyword)
        }));
    };

    const toggleCategory = (plan: keyof WhatsAppTemplatePolicy['allowedCategories'], category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION') => {
        setPolicy(prev => ({
            ...prev,
            allowedCategories: {
                ...prev.allowedCategories,
                [plan]: {
                    ...prev.allowedCategories[plan],
                    [category]: !prev.allowedCategories[plan][category]
                }
            }
        }));
    };

    const updateLimit = (plan: keyof WhatsAppTemplatePolicy['maxTemplatesPerDay'], value: number) => {
        setPolicy(prev => ({
            ...prev,
            maxTemplatesPerDay: {
                ...prev.maxTemplatesPerDay,
                [plan]: value
            }
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Policy Configuration</h2>
                    <p className="text-slate-400 mt-1">Manage prohibited content and per-plan template permissions</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={fetchPolicy}
                        disabled={saving}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : saved ? (
                            <CheckCircle className="h-4 w-4 mr-2" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        {saved ? 'Saved!' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Prohibited Content */}
                <Card className="bg-slate-800 border-slate-700 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-400" />
                            Content Safety
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Configure prohibited keywords and automated rejection rules
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                                <div className="space-y-1">
                                    <Label className="text-base text-white">Auto-Reject Violations</Label>
                                    <p className="text-sm text-slate-400">
                                        Automatically reject templates containing prohibited keywords
                                    </p>
                                </div>
                                <Switch
                                    checked={policy.autoRejectProhibited}
                                    onCheckedChange={(checked) => setPolicy({ ...policy, autoRejectProhibited: checked })}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-slate-300">Prohibited Keywords</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={keywordInput}
                                        onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                                        placeholder="Enter keyword (e.g. 'guaranteed returns')"
                                        className="bg-slate-900 border-slate-700 text-white"
                                    />
                                    <Button onClick={handleAddKeyword} variant="secondary">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {policy.prohibitedKeywords.map((keyword) => (
                                        <Badge
                                            key={keyword}
                                            variant="secondary"
                                            className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20 pl-2 pr-1 py-1 gap-1"
                                        >
                                            {keyword}
                                            <button
                                                onClick={() => handleRemoveKeyword(keyword)}
                                                className="hover:bg-red-500/20 rounded-full p-0.5"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Plan Restrictions */}
                <Card className="bg-slate-800 border-slate-700 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-white">Plan Restrictions</CardTitle>
                        <CardDescription className="text-slate-400">
                            Configure allowed categories and limits per subscription plan
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="free" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 bg-slate-900 mb-6">
                                <TabsTrigger value="free">Free</TabsTrigger>
                                <TabsTrigger value="starter">Starter</TabsTrigger>
                                <TabsTrigger value="pro">Pro</TabsTrigger>
                                <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
                            </TabsList>

                            {(['free', 'starter', 'pro', 'enterprise'] as const).map((plan) => (
                                <TabsContent key={plan} value={plan} className="space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        {/* Categories */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                                                Allowed Categories
                                            </h3>

                                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-md bg-purple-500/20 text-purple-400">
                                                        <MessageSquare className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">Marketing</p>
                                                        <p className="text-xs text-slate-400">Promotions & offers</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={policy.allowedCategories[plan].MARKETING}
                                                    onCheckedChange={() => toggleCategory(plan, 'MARKETING')}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-md bg-blue-500/20 text-blue-400">
                                                        <Zap className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">Utility</p>
                                                        <p className="text-xs text-slate-400">Order updates & alerts</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={policy.allowedCategories[plan].UTILITY}
                                                    onCheckedChange={() => toggleCategory(plan, 'UTILITY')}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-md bg-green-500/20 text-green-400">
                                                        <Lock className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white">Authentication</p>
                                                        <p className="text-xs text-slate-400">OTP & Verification</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={policy.allowedCategories[plan].AUTHENTICATION}
                                                    onCheckedChange={() => toggleCategory(plan, 'AUTHENTICATION')}
                                                />
                                            </div>
                                        </div>

                                        {/* Limits */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                                                Submission Limits
                                            </h3>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Max New Templates Per Day</Label>
                                                <Input
                                                    type="number"
                                                    value={policy.maxTemplatesPerDay[plan]}
                                                    onChange={(e) => updateLimit(plan, parseInt(e.target.value) || 0)}
                                                    className="bg-slate-900 border-slate-700 text-white"
                                                />
                                                <p className="text-xs text-slate-500">
                                                    Limits the number of new templates a tenant can submit to Meta per day.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
