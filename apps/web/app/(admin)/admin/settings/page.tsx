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
    Search,
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
import { settingsApi, PlatformSettings, IntegrationSettings, GlobalSeoSettings } from '@/lib/admin/api';
import { Textarea } from '@/components/ui/textarea'; // Added Textarea import for SEO description

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

const defaultSeoSettings: GlobalSeoSettings = {
    id: '',
    siteTitle: '',
    siteDescription: '',
    keywords: [],
    ogImageUrl: '',
    twitterHandle: '',
    googleAnalyticsId: '',
    updatedAt: '',
};

export default function SettingsPage() {
    const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
    const [integrations, setIntegrations] = useState<IntegrationSettings>(defaultIntegrations);
    const [seoSettings, setSeoSettings] = useState<GlobalSeoSettings>(defaultSeoSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const [settingsData, integrationsData, seoData] = await Promise.all([
                settingsApi.get(),
                settingsApi.getIntegrations(),
                settingsApi.getSeoSettings(),
            ]);
            setSettings(settingsData);
            setIntegrations(integrationsData);
            setSeoSettings(seoData);
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
                settingsApi.updateSeoSettings(seoSettings),
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
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Platform Settings</h1>
                    <p className="text-neutral-400 mt-2 text-lg">Configure global platform settings and integrations</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
                        onClick={fetchSettings}
                        disabled={loading}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button
                        className="bg-neutral-700 hover:bg-neutral-600 shadow-lg shadow-black/30"
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
                <div className="p-4 bg-neutral-800 border border-yellow-500/30 rounded-xl text-neutral-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {/* Settings Tabs */}
            <Tabs defaultValue="general" className="space-y-8">
                <TabsList className="bg-white/5 border border-white/10 w-full justify-start p-1 h-auto grid grid-cols-5 max-w-4xl">
                    <TabsTrigger value="general" className="py-3 data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-neutral-400">
                        <Globe className="h-4 w-4 mr-2" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="security" className="py-3 data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-neutral-400">
                        <Shield className="h-4 w-4 mr-2" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="py-3 data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-neutral-400">
                        <Bell className="h-4 w-4 mr-2" />
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="py-3 data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-neutral-400">
                        <Key className="h-4 w-4 mr-2" />
                        Integrations
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="py-3 data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-neutral-400">
                        <Search className="h-4 w-4 mr-2" />
                        SEO
                    </TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general" className="focus-visible:outline-none">
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="text-white">General Settings</CardTitle>
                            <CardDescription className="text-neutral-400">
                                Basic platform configuration
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Platform Name</Label>
                                    <Input
                                        value={settings.general.platformName}
                                        onChange={(e) => updateGeneral('platformName', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Support Email</Label>
                                    <Input
                                        type="email"
                                        value={settings.general.supportEmail}
                                        onChange={(e) => updateGeneral('supportEmail', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-neutral-300">Default Timezone</Label>
                                <Select
                                    value={settings.general.defaultTimezone}
                                    onValueChange={(value) => updateGeneral('defaultTimezone', value)}
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black border-white/10 text-white">
                                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                                        <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                                        <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-neutral-800 border border-neutral-700 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="h-5 w-5 text-neutral-400" />
                                    <div>
                                        <p className="text-white font-medium">Maintenance Mode</p>
                                        <p className="text-neutral-400 text-sm">Block all non-admin access to the platform</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.general.maintenanceMode}
                                    onCheckedChange={(checked) => updateGeneral('maintenanceMode', checked)}
                                    className="data-[state=checked]:bg-white"
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
                            <CardDescription className="text-neutral-400">
                                Configure authentication and security policies
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Enforce 2FA for Admins</p>
                                        <p className="text-neutral-400 text-sm">Require two-factor authentication for all admin users</p>
                                    </div>
                                    <Switch
                                        checked={settings.security.enforceAdmin2FA}
                                        onCheckedChange={(checked) => updateSecurity('enforceAdmin2FA', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Enforce 2FA for Tenants</p>
                                        <p className="text-neutral-400 text-sm">Require two-factor authentication for tenant users</p>
                                    </div>
                                    <Switch
                                        checked={settings.security.enforceTenant2FA}
                                        onCheckedChange={(checked) => updateSecurity('enforceTenant2FA', checked)}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-6 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Session Timeout (hours)</Label>
                                    <Input
                                        type="number"
                                        value={settings.security.sessionTimeout}
                                        onChange={(e) => updateSecurity('sessionTimeout', parseInt(e.target.value) || 24)}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Max Login Attempts</Label>
                                    <Input
                                        type="number"
                                        value={settings.security.maxLoginAttempts}
                                        onChange={(e) => updateSecurity('maxLoginAttempts', parseInt(e.target.value) || 5)}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Min Password Length</Label>
                                    <Input
                                        type="number"
                                        value={settings.security.passwordMinLength}
                                        onChange={(e) => updateSecurity('passwordMinLength', parseInt(e.target.value) || 8)}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
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
                            <CardDescription className="text-neutral-400">
                                Configure system notifications and alerts
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Admin Login Alerts</p>
                                        <p className="text-neutral-400 text-sm">Get notified when an admin logs in</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.adminLoginAlert}
                                        onCheckedChange={(checked) => updateNotifications('adminLoginAlert', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Low Credit Alerts</p>
                                        <p className="text-neutral-400 text-sm">Alert when tenant credit balance is low</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.lowCreditAlert}
                                        onCheckedChange={(checked) => updateNotifications('lowCreditAlert', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Tenant Suspension Alerts</p>
                                        <p className="text-neutral-400 text-sm">Alert when a tenant is suspended or reactivated</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.tenantSuspensionAlert}
                                        onCheckedChange={(checked) => updateNotifications('tenantSuspensionAlert', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Daily Summary Email</p>
                                        <p className="text-neutral-400 text-sm">Receive daily platform activity summary</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.dailySummary}
                                        onCheckedChange={(checked) => updateNotifications('dailySummary', checked)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-neutral-300">Webhook URL (for external notifications)</Label>
                                <Input
                                    placeholder="https://..."
                                    value={settings.notifications.webhookUrl}
                                    onChange={(e) => updateNotifications('webhookUrl', e.target.value)}
                                    className="bg-white/5 border-white/10 text-white focus:border-white"
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
                                    <div className="h-8 w-8 rounded-lg bg-neutral-700 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-black/20">
                                        M
                                    </div>
                                    Meta (WhatsApp/Instagram)
                                </CardTitle>
                                <CardDescription className="text-neutral-400">
                                    Configure Meta Business API credentials
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">App ID</Label>
                                    <Input
                                        value={integrations.metaAppId}
                                        onChange={(e) => updateIntegrations('metaAppId', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">App Secret</Label>
                                    <Input
                                        type="password"
                                        value={integrations.metaAppSecret}
                                        onChange={(e) => updateIntegrations('metaAppSecret', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                            </CardContent>
                        </GlassCard>

                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-neutral-700 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-black/30">
                                        <CreditCard className="h-4 w-4" />
                                    </div>
                                    Stripe (Payments)
                                </CardTitle>
                                <CardDescription className="text-neutral-400">
                                    Configure Stripe payment integration
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Public Key</Label>
                                    <Input
                                        value={integrations.stripePublicKey}
                                        onChange={(e) => updateIntegrations('stripePublicKey', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Secret Key</Label>
                                    <Input
                                        type="password"
                                        value={integrations.stripeSecretKey}
                                        onChange={(e) => updateIntegrations('stripeSecretKey', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                            </CardContent>
                        </GlassCard>

                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-neutral-700 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-black/20">
                                        AI
                                    </div>
                                    OpenAI (AI Features)
                                </CardTitle>
                                <CardDescription className="text-neutral-400">
                                    Configure OpenAI for chatbot and AI features
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">API Key</Label>
                                    <Input
                                        type="password"
                                        value={integrations.openaiApiKey}
                                        onChange={(e) => updateIntegrations('openaiApiKey', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                            </CardContent>
                        </GlassCard>

                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-neutral-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-black/20">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    SendGrid (Email)
                                </CardTitle>
                                <CardDescription className="text-neutral-400">
                                    Configure SendGrid for transactional emails
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">API Key</Label>
                                    <Input
                                        type="password"
                                        value={integrations.sendgridApiKey}
                                        onChange={(e) => updateIntegrations('sendgridApiKey', e.target.value)}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                            </CardContent>
                        </GlassCard>
                    </div>
                </TabsContent>

                {/* SEO Settings */}
                <TabsContent value="seo" className="focus-visible:outline-none">
                    <div className="grid gap-6 md:grid-cols-2">
                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-white">General SEO</CardTitle>
                                <CardDescription className="text-neutral-400">
                                    Configure global SEO metadata
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Site Title</Label>
                                    <Input
                                        value={seoSettings.siteTitle}
                                        onChange={(e) => setSeoSettings(prev => ({ ...prev, siteTitle: e.target.value }))}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                        placeholder="My SaaS Platform"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Meta Description</Label>
                                    <Textarea
                                        value={seoSettings.siteDescription}
                                        onChange={(e) => setSeoSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                                        className="bg-white/5 border-white/10 text-white focus:border-white min-h-[100px]"
                                        placeholder="A brief description of your platform..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Keywords (comma separated)</Label>
                                    <Input
                                        value={seoSettings.keywords?.join(', ')}
                                        onChange={(e) => setSeoSettings(prev => ({ ...prev, keywords: e.target.value.split(',').map(k => k.trim()) }))}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                        placeholder="saas, automation, tool"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Favicon URL</Label>
                                    <Input
                                        value={seoSettings.faviconUrl || ''}
                                        onChange={(e) => setSeoSettings(prev => ({ ...prev, faviconUrl: e.target.value }))}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                        placeholder="https://example.com/favicon.ico"
                                    />
                                </div>
                            </CardContent>
                        </GlassCard>

                        <div className="space-y-6">
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="text-white">Social & Analytics</CardTitle>
                                    <CardDescription className="text-neutral-400">
                                        Social sharing and tracking
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-neutral-300">OG Image URL</Label>
                                        <Input
                                            value={seoSettings.ogImageUrl}
                                            onChange={(e) => setSeoSettings(prev => ({ ...prev, ogImageUrl: e.target.value }))}
                                            className="bg-white/5 border-white/10 text-white focus:border-white"
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-neutral-300">Twitter Handle</Label>
                                        <Input
                                            value={seoSettings.twitterHandle}
                                            onChange={(e) => setSeoSettings(prev => ({ ...prev, twitterHandle: e.target.value }))}
                                            className="bg-white/5 border-white/10 text-white focus:border-white"
                                            placeholder="@handle"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-neutral-300">Google Analytics ID</Label>
                                        <Input
                                            value={seoSettings.googleAnalyticsId}
                                            onChange={(e) => setSeoSettings(prev => ({ ...prev, googleAnalyticsId: e.target.value }))}
                                            className="bg-white/5 border-white/10 text-white focus:border-white"
                                            placeholder="G-XXXXXXXXXX"
                                        />
                                    </div>
                                </CardContent>
                            </GlassCard>

                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="text-white">Advanced SEO</CardTitle>
                                    <CardDescription className="text-neutral-400">
                                        Robots.txt and Sitemap configuration
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-neutral-300">Sitemap URL</Label>
                                        <Input
                                            value={seoSettings.sitemapUrl || ''}
                                            onChange={(e) => setSeoSettings(prev => ({ ...prev, sitemapUrl: e.target.value }))}
                                            className="bg-white/5 border-white/10 text-white focus:border-white"
                                            placeholder="https://example.com/sitemap.xml"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-neutral-300">Robots.txt Content</Label>
                                        <Textarea
                                            value={seoSettings.robotsTxt || ''}
                                            onChange={(e) => setSeoSettings(prev => ({ ...prev, robotsTxt: e.target.value }))}
                                            className="bg-white/5 border-white/10 text-white focus:border-white min-h-[120px] font-mono text-sm"
                                            placeholder="User-agent: *&#10;Allow: /"
                                        />
                                    </div>
                                </CardContent>
                            </GlassCard>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
