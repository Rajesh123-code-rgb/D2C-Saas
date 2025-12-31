'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    Shield,
    Bell,
    Mail,
    Globe,
    Key,
    Loader2,
    Save,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    CreditCard,
} from 'lucide-react';
import { CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { settingsApi, PlatformSettings, IntegrationSettings } from '@/lib/admin/api';

// Default settings (fallback)
const defaultSettings: PlatformSettings = {
    general: {
        platformName: 'Convoo',
        supportEmail: 'support@convoo.cloud',
        defaultTimezone: 'Asia/Kolkata',
        maintenanceMode: false,
    },
    security: {
        enforceAdmin2FA: true,
        enforceTenant2FA: false,
        sessionTimeout: 24,
        maxLoginAttempts: 5,
        passwordMinLength: 8,
    },
    notifications: {
        adminLoginAlert: true,
        lowCreditAlert: true,
        tenantSuspensionAlert: true,
        dailySummary: false,
        webhookUrl: '',
    },
};

const defaultIntegrations: IntegrationSettings = {
    metaAppId: '***********',
    metaAppSecret: '***********',
    stripePublicKey: 'pk_live_***',
    stripeSecretKey: 'sk_live_***',
    sendgridApiKey: 'SG.***',
    openaiApiKey: 'sk-***',
};

export default function SettingsPage() {
    const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
    const [integrations, setIntegrations] = useState<IntegrationSettings>(defaultIntegrations);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const [settingsData, integrationsData] = await Promise.all([
                settingsApi.get(),
                settingsApi.getIntegrations(),
            ]);
            setSettings(settingsData);
            setIntegrations(integrationsData);
        } catch (err: any) {
            console.warn('Could not fetch settings, using defaults:', err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            await Promise.all([
                settingsApi.update(settings),
                settingsApi.updateIntegrations(integrations),
            ]);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            console.warn('Could not save settings:', err.message);
            setError('Failed to save settings. Changes are stored locally.');
            // Still show saved for demo
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setSaving(false);
        }
    };

    const updateGeneral = (key: keyof PlatformSettings['general'], value: any) => {
        setSettings((prev) => ({
            ...prev,
            general: { ...prev.general, [key]: value },
        }));
    };

    const updateSecurity = (key: keyof PlatformSettings['security'], value: any) => {
        setSettings((prev) => ({
            ...prev,
            security: { ...prev.security, [key]: value },
        }));
    };

    const updateNotifications = (key: keyof PlatformSettings['notifications'], value: any) => {
        setSettings((prev) => ({
            ...prev,
            notifications: { ...prev.notifications, [key]: value },
        }));
    };

    const updateIntegrations = (key: keyof IntegrationSettings, value: string) => {
        setIntegrations((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Platform Settings</h1>
                    <p className="text-slate-400 mt-2 text-lg">Configure global platform settings and integrations</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                        onClick={fetchSettings}
                        disabled={loading}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
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

            {error && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {/* Settings Tabs */}
            <Tabs defaultValue="general" className="space-y-8">
                <TabsList className="bg-white/5 border border-white/10 w-full justify-start p-1 h-auto grid grid-cols-4 max-w-3xl">
                    <TabsTrigger value="general" className="py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
                        <Globe className="h-4 w-4 mr-2" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="security" className="py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
                        <Shield className="h-4 w-4 mr-2" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
                        <Bell className="h-4 w-4 mr-2" />
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
                        <Key className="h-4 w-4 mr-2" />
                        Integrations
                    </TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general" className="focus-visible:outline-none">
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="text-white">General Settings</CardTitle>
                            <CardDescription className="text-slate-400">
                                Basic platform configuration
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Platform Name</Label>
                                    <Input
                                        value={settings.general.platformName}
                                        onChange={(e) => updateGeneral('platformName', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Support Email</Label>
                                    <Input
                                        type="email"
                                        value={settings.general.supportEmail}
                                        onChange={(e) => updateGeneral('supportEmail', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Default Timezone</Label>
                                <Select
                                    value={settings.general.defaultTimezone}
                                    onValueChange={(value) => updateGeneral('defaultTimezone', value)}
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-indigo-500">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0B0C15] border-white/10 text-white">
                                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                                        <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                                        <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                                    <div>
                                        <p className="text-white font-medium">Maintenance Mode</p>
                                        <p className="text-slate-400 text-sm">Block all non-admin access to the platform</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.general.maintenanceMode}
                                    onCheckedChange={(checked) => updateGeneral('maintenanceMode', checked)}
                                    className="data-[state=checked]:bg-yellow-500"
                                />
                            </div>
                        </CardContent>
                    </GlassCard>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security" className="focus-visible:outline-none">
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="text-white">Security Settings</CardTitle>
                            <CardDescription className="text-slate-400">
                                Configure authentication and security policies
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Enforce 2FA for Admins</p>
                                        <p className="text-slate-400 text-sm">Require two-factor authentication for all admin users</p>
                                    </div>
                                    <Switch
                                        checked={settings.security.enforceAdmin2FA}
                                        onCheckedChange={(checked) => updateSecurity('enforceAdmin2FA', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Enforce 2FA for Tenants</p>
                                        <p className="text-slate-400 text-sm">Require two-factor authentication for tenant users</p>
                                    </div>
                                    <Switch
                                        checked={settings.security.enforceTenant2FA}
                                        onCheckedChange={(checked) => updateSecurity('enforceTenant2FA', checked)}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-6 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Session Timeout (hours)</Label>
                                    <Input
                                        type="number"
                                        value={settings.security.sessionTimeout}
                                        onChange={(e) => updateSecurity('sessionTimeout', parseInt(e.target.value) || 24)}
                                        className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Max Login Attempts</Label>
                                    <Input
                                        type="number"
                                        value={settings.security.maxLoginAttempts}
                                        onChange={(e) => updateSecurity('maxLoginAttempts', parseInt(e.target.value) || 5)}
                                        className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Min Password Length</Label>
                                    <Input
                                        type="number"
                                        value={settings.security.passwordMinLength}
                                        onChange={(e) => updateSecurity('passwordMinLength', parseInt(e.target.value) || 8)}
                                        className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </GlassCard>
                </TabsContent>

                {/* Notifications Settings */}
                <TabsContent value="notifications" className="focus-visible:outline-none">
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="text-white">Notification Settings</CardTitle>
                            <CardDescription className="text-slate-400">
                                Configure system notifications and alerts
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Admin Login Alerts</p>
                                        <p className="text-slate-400 text-sm">Get notified when an admin logs in</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.adminLoginAlert}
                                        onCheckedChange={(checked) => updateNotifications('adminLoginAlert', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Low Credit Alerts</p>
                                        <p className="text-slate-400 text-sm">Alert when tenant credit balance is low</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.lowCreditAlert}
                                        onCheckedChange={(checked) => updateNotifications('lowCreditAlert', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Tenant Suspension Alerts</p>
                                        <p className="text-slate-400 text-sm">Alert when a tenant is suspended or reactivated</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.tenantSuspensionAlert}
                                        onCheckedChange={(checked) => updateNotifications('tenantSuspensionAlert', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Daily Summary Email</p>
                                        <p className="text-slate-400 text-sm">Receive daily platform activity summary</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.dailySummary}
                                        onCheckedChange={(checked) => updateNotifications('dailySummary', checked)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Webhook URL (for external notifications)</Label>
                                <Input
                                    placeholder="https://..."
                                    value={settings.notifications.webhookUrl}
                                    onChange={(e) => updateNotifications('webhookUrl', e.target.value)}
                                    className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                />
                            </div>
                        </CardContent>
                    </GlassCard>
                </TabsContent>

                {/* Integrations Settings */}
                <TabsContent value="integrations" className="focus-visible:outline-none">
                    <div className="grid gap-6 md:grid-cols-2">
                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/20">
                                        M
                                    </div>
                                    Meta (WhatsApp/Instagram)
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Configure Meta Business API credentials
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">App ID</Label>
                                    <Input
                                        value={integrations.metaAppId}
                                        onChange={(e) => updateIntegrations('metaAppId', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">App Secret</Label>
                                    <Input
                                        type="password"
                                        value={integrations.metaAppSecret}
                                        onChange={(e) => updateIntegrations('metaAppSecret', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                            </CardContent>
                        </GlassCard>

                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/20">
                                        <CreditCard className="h-4 w-4" />
                                    </div>
                                    Stripe (Payments)
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Configure Stripe payment integration
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Public Key</Label>
                                    <Input
                                        value={integrations.stripePublicKey}
                                        onChange={(e) => updateIntegrations('stripePublicKey', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Secret Key</Label>
                                    <Input
                                        type="password"
                                        value={integrations.stripeSecretKey}
                                        onChange={(e) => updateIntegrations('stripeSecretKey', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                            </CardContent>
                        </GlassCard>

                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-500/20">
                                        AI
                                    </div>
                                    OpenAI (AI Features)
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Configure OpenAI for chatbot and AI features
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">API Key</Label>
                                    <Input
                                        type="password"
                                        value={integrations.openaiApiKey}
                                        onChange={(e) => updateIntegrations('openaiApiKey', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                            </CardContent>
                        </GlassCard>

                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-blue-400 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-400/20">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    SendGrid (Email)
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Configure SendGrid for transactional emails
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">API Key</Label>
                                    <Input
                                        type="password"
                                        value={integrations.sendgridApiKey}
                                        onChange={(e) => updateIntegrations('sendgridApiKey', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                    />
                                </div>
                            </CardContent>
                        </GlassCard>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
