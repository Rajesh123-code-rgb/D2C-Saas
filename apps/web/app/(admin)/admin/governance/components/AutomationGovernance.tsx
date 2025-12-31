'use client';

import { useState, useEffect } from 'react';
import { CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { governanceApi, AutomationPolicy } from '@/lib/admin/api';
import { Loader2, Save, AlertTriangle, CheckCircle, Zap, Shield, Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const PLANS = ['free', 'starter', 'pro', 'enterprise'];

export function AutomationGovernance() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [policy, setPolicy] = useState<AutomationPolicy | null>(null);

    useEffect(() => {
        fetchPolicy();
    }, []);

    const fetchPolicy = async () => {
        try {
            const data = await governanceApi.getAutomationPolicy();
            setPolicy(data);
        } catch (error) {
            console.error('Failed to fetch policy', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!policy) return;
        setSaving(true);
        try {
            await governanceApi.updateAutomationPolicy(policy);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Failed to update policy', error);
            alert('Failed to save policy');
        } finally {
            setSaving(false);
        }
    };

    const updatePlanLimit = (plan: string, field: string, value: any) => {
        if (!policy) return;
        setPolicy({
            ...policy,
            planLimits: {
                ...policy.planLimits,
                [plan]: {
                    ...policy.planLimits[plan as keyof typeof policy.planLimits],
                    [field]: Number(value),
                },
            },
        });
    };

    const updateBlockSetting = (key: string, field: string, value: any) => {
        if (!policy) return;
        setPolicy({
            ...policy,
            blockSettings: {
                ...policy.blockSettings,
                [key]: {
                    ...policy.blockSettings[key as keyof typeof policy.blockSettings],
                    [field]: value,
                },
            },
        });
    };

    if (loading) {
        return (
            <div className="flex h-[30vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    if (!policy) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Automation Governance</h2>
                    <p className="text-slate-400 mt-1">
                        Configure global limits and plan-based restrictions for automations.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20">
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : saved ? (
                        <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Saved
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            <div className="grid gap-6">
                {/* Global Controls */}
                <GlassCard className="border-l-4 border-l-yellow-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            Emergency Controls
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Global switches to instantly disable features across the entire platform.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4">
                            <div className="space-y-0.5">
                                <Label className="text-white">Global Kill Switch</Label>
                                <div className="text-sm text-slate-400">
                                    Disables ALL automations platform-wide. Only use in emergencies.
                                </div>
                            </div>
                            <Switch
                                checked={policy.globalKillSwitch}
                                onCheckedChange={(checked) => setPolicy({ ...policy, globalKillSwitch: checked })}
                                className="data-[state=checked]:bg-yellow-500"
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4">
                            <div className="space-y-0.5">
                                <Label className="text-white">Automation System Active</Label>
                                <div className="text-sm text-slate-400">
                                    Master switch for the automation engine.
                                </div>
                            </div>
                            <Switch
                                checked={policy.globalEnabled}
                                onCheckedChange={(checked) => setPolicy({ ...policy, globalEnabled: checked })}
                            />
                        </div>
                    </CardContent>
                </GlassCard>

                {/* Plan Limits */}
                <GlassCard>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Activity className="h-5 w-5 text-blue-400" />
                            Plan Limits
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Set usage limits for each subscription tier.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="starter" className="w-full">
                            <TabsList className="bg-white/5 border border-white/10 w-full justify-start p-1 h-auto grid grid-cols-4">
                                {PLANS.map((plan) => (
                                    <TabsTrigger
                                        key={plan}
                                        value={plan}
                                        className="capitalize data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400"
                                    >
                                        {plan}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {PLANS.map((plan) => (
                                <TabsContent key={plan} value={plan} className="space-y-4 mt-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Max Automations</Label>
                                            <Input
                                                type="number"
                                                value={policy.planLimits[plan as keyof typeof policy.planLimits]?.maxAutomations || 0}
                                                onChange={(e) => updatePlanLimit(plan, 'maxAutomations', e.target.value)}
                                                className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Max Steps per Automation</Label>
                                            <Input
                                                type="number"
                                                value={policy.planLimits[plan as keyof typeof policy.planLimits]?.maxStepsPerAutomation || 0}
                                                onChange={(e) => updatePlanLimit(plan, 'maxStepsPerAutomation', e.target.value)}
                                                className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Max Executions (Daily)</Label>
                                            <Input
                                                type="number"
                                                value={policy.planLimits[plan as keyof typeof policy.planLimits]?.maxExecutionsPerDay || 0}
                                                onChange={(e) => updatePlanLimit(plan, 'maxExecutionsPerDay', e.target.value)}
                                                className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                </GlassCard>

                {/* Feature Blocking */}
                <GlassCard>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Shield className="h-5 w-5 text-purple-400" />
                            Feature Restrictions
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Control which advanced features are available to specific plans.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {Object.entries(policy.blockSettings).map(([key, setting]: [string, any], index) => (
                            <div key={key}>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="capitalize text-white font-medium flex items-center gap-2">
                                                <Zap className="h-4 w-4 text-indigo-400" />
                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </Label>
                                            <div className="text-sm text-slate-400">
                                                Enable or disable this feature type globally.
                                            </div>
                                        </div>
                                        <Switch
                                            checked={setting.enabled}
                                            onCheckedChange={(checked) => updateBlockSetting(key, 'enabled', checked)}
                                        />
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                                        <Label className="text-sm text-slate-300">Allowed Plans</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {PLANS.map((plan) => (
                                                <Badge
                                                    key={plan}
                                                    variant="outline"
                                                    className={`cursor-pointer capitalize px-3 py-1 transition-all ${setting.allowedPlans.includes(plan)
                                                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/30'
                                                            : 'bg-transparent text-slate-500 border-slate-700 hover:text-slate-300 hover:border-slate-500'
                                                        }`}
                                                    onClick={() => {
                                                        const newPlans = setting.allowedPlans.includes(plan)
                                                            ? setting.allowedPlans.filter((p: string) => p !== plan)
                                                            : [...setting.allowedPlans, plan];
                                                        updateBlockSetting(key, 'allowedPlans', newPlans);
                                                    }}
                                                >
                                                    {plan}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {index < Object.entries(policy.blockSettings).length - 1 && (
                                    <Separator className="my-6 bg-white/10" />
                                )}
                            </div>
                        ))}
                    </CardContent>
                </GlassCard>
            </div>
        </div>
    );
}
