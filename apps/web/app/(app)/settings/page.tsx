'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Settings as SettingsIcon,
    Users,
    CreditCard,
    Bell,
    Lock,
    Webhook,
    Plus,
    Trash2,
    Edit,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsTabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
];

// Mock data
const mockTeamMembers = [
    {
        id: '1',
        name: 'Demo User',
        email: 'demo@omnichannel.app',
        role: 'Owner',
        status: 'Active',
    },
    {
        id: '2',
        name: 'John Smith',
        email: 'john@demo.com',
        role: 'Admin',
        status: 'Active',
    },
    {
        id: '3',
        name: 'Sarah Johnson',
        email: 'sarah@demo.com',
        role: 'Agent',
        status: 'Invited',
    },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your workspace settings and preferences</p>
            </div>

            {/* Tabs */}
            <div className="border-b">
                <nav className="flex gap-6 overflow-x-auto">
                    {settingsTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors whitespace-nowrap',
                                activeTab === tab.id
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'general' && <GeneralSettings />}
                {activeTab === 'team' && <TeamSettings members={mockTeamMembers} />}
                {activeTab === 'notifications' && <NotificationsSettings />}
                {activeTab === 'billing' && <BillingSettings />}
                {activeTab === 'security' && <SecuritySettings />}
                {activeTab === 'webhooks' && <WebhooksSettings />}
            </div>
        </div>
    );
}

function GeneralSettings() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Workspace Information</CardTitle>
                    <CardDescription>Update your workspace details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input id="companyName" defaultValue="Demo Company" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="companySlug">Workspace Slug</Label>
                            <Input id="companySlug" defaultValue="demo-company" disabled />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" type="url" placeholder="https://example.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <select
                            id="timezone"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option>UTC</option>
                            <option>(GMT-5:00) Eastern Time</option>
                            <option>(GMT-8:00) Pacific Time</option>
                        </select>
                    </div>
                    <Button>Save Changes</Button>
                </CardContent>
            </Card>
        </div>
    );
}

function TeamSettings({ members }: { members: typeof mockTeamMembers }) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Team Members</CardTitle>
                            <CardDescription>Manage your team and their permissions</CardDescription>
                        </div>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Invite Member
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between border-b pb-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                                        {member.name
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')}
                                    </div>
                                    <div>
                                        <p className="font-medium">{member.name}</p>
                                        <p className="text-sm text-muted-foreground">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span
                                        className={cn(
                                            'rounded-full px-3 py-1 text-xs font-medium',
                                            member.role === 'Owner'
                                                ? 'bg-purple-100 text-purple-700'
                                                : member.role === 'Admin'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-green-100 text-green-700'
                                        )}
                                    >
                                        {member.role}
                                    </span>
                                    <span
                                        className={cn(
                                            'rounded-full px-3 py-1 text-xs font-medium',
                                            member.status === 'Active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                        )}
                                    >
                                        {member.status}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="ghost">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        {member.role !== 'Owner' && (
                                            <Button size="sm" variant="ghost">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function NotificationsSettings() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Manage how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Email Notifications</p>
                            <p className="text-sm text-muted-foreground">Receive email for new messages</p>
                        </div>
                        <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Push Notifications</p>
                            <p className="text-sm text-muted-foreground">Browser push notifications</p>
                        </div>
                        <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">New Conversation Alerts</p>
                            <p className="text-sm text-muted-foreground">Get notified of new conversations</p>
                        </div>
                        <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
                    </div>
                    <Button>Save Preferences</Button>
                </CardContent>
            </Card>
        </div>
    );
}

function BillingSettings() {
    const [plans, setPlans] = useState<any[]>([]);
    const [subscription, setSubscription] = useState<any>(null);
    const [usage, setUsage] = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [upgrading, setUpgrading] = useState<string | null>(null);

    useEffect(() => {
        const fetchBillingData = async () => {
            try {
                const [plansRes, subRes, usageRes, invoicesRes] = await Promise.all([
                    fetch('/api/billing/plans'),
                    fetch('/api/billing/subscription?tenantId=demo'),
                    fetch('/api/billing/usage?tenantId=demo'),
                    fetch('/api/billing/invoices?tenantId=demo'),
                ]);

                const plansData = await plansRes.json();
                const subData = await subRes.json();
                const usageData = await usageRes.json();
                const invoicesData = await invoicesRes.json();

                setPlans(Array.isArray(plansData) ? plansData : []);
                setSubscription(subData?.id ? subData : null);
                setUsage(usageData && typeof usageData === 'object' && !usageData.error ? usageData : null);
                setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
            } catch (error) {
                console.error('Error fetching billing data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBillingData();
    }, []);

    const formatLimit = (limit: number) => {
        if (limit === -1) return 'Unlimited';
        if (limit >= 1000) return `${(limit / 1000).toFixed(0)}K`;
        return limit.toString();
    };

    const getUsagePercentage = (current: number, limit: number): number => {
        if (limit === -1) return 0;
        return Math.min((current / limit) * 100, 100);
    };

    const getUsageColor = (percentage: number): string => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const handleUpgrade = async (planTier: string) => {
        setUpgrading(planTier);
        try {
            const response = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planTier, billingCycle, tenantId: 'demo' }),
            });
            const data = await response.json();
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            }
        } catch (error) {
            console.error('Error creating checkout:', error);
        } finally {
            setUpgrading(null);
        }
    };

    const handleManageSubscription = async () => {
        try {
            const response = await fetch('/api/billing/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId: 'demo' }),
            });
            const data = await response.json();
            if (data.portalUrl) {
                window.location.href = data.portalUrl;
            }
        } catch (error) {
            console.error('Error creating portal:', error);
        }
    };

    const currentPlanFeatures = subscription?.plan?.features || {
        maxContacts: 100,
        maxMessagesPerMonth: 100,
        maxAutomations: 2,
        maxCampaignsPerMonth: 1,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Current Plan Card - Always visible */}
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-primary/20">
                                <CreditCard className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">
                                    {subscription?.plan?.displayName || 'Free'} Plan
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {subscription ? (
                                        <>
                                            {subscription.status === 'trialing' ? 'Trial ends' : 'Next billing'}:{' '}
                                            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                        </>
                                    ) : (
                                        'No active subscription • Upgrade to unlock more features'
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={cn(
                                'px-3 py-1 rounded-full text-sm font-medium capitalize',
                                subscription?.status === 'active' ? 'bg-green-100 text-green-700' :
                                    subscription?.status === 'trialing' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-blue-100 text-blue-700'
                            )}>
                                {subscription?.status === 'trialing' ? 'Trial' : subscription?.status || 'Free'}
                            </span>
                            {subscription ? (
                                <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                                    Manage
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    Upgrade
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Usage Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Usage This Period</CardTitle>
                    <CardDescription>Track your resource consumption against plan limits</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Contacts */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-blue-600" />
                                    Contacts
                                </span>
                                <span className="text-muted-foreground">
                                    {usage?.contacts || 0} / {formatLimit(currentPlanFeatures.maxContacts)}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={cn('h-full transition-all', getUsageColor(getUsagePercentage(usage?.contacts || 0, currentPlanFeatures.maxContacts)))}
                                    style={{ width: `${getUsagePercentage(usage?.contacts || 0, currentPlanFeatures.maxContacts)}%` }}
                                />
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <Bell className="h-4 w-4 text-green-600" />
                                    Messages
                                </span>
                                <span className="text-muted-foreground">
                                    {usage?.messages || 0} / {formatLimit(currentPlanFeatures.maxMessagesPerMonth)}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={cn('h-full transition-all', getUsageColor(getUsagePercentage(usage?.messages || 0, currentPlanFeatures.maxMessagesPerMonth)))}
                                    style={{ width: `${getUsagePercentage(usage?.messages || 0, currentPlanFeatures.maxMessagesPerMonth)}%` }}
                                />
                            </div>
                        </div>

                        {/* Automations */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <Webhook className="h-4 w-4 text-purple-600" />
                                    Automations
                                </span>
                                <span className="text-muted-foreground">
                                    {usage?.automations || 0} / {formatLimit(currentPlanFeatures.maxAutomations)}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={cn('h-full transition-all', getUsageColor(getUsagePercentage(usage?.automations || 0, currentPlanFeatures.maxAutomations)))}
                                    style={{ width: `${getUsagePercentage(usage?.automations || 0, currentPlanFeatures.maxAutomations)}%` }}
                                />
                            </div>
                        </div>

                        {/* Campaigns */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-orange-600" />
                                    Campaigns
                                </span>
                                <span className="text-muted-foreground">
                                    {usage?.campaigns || 0} / {formatLimit(currentPlanFeatures.maxCampaignsPerMonth)}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={cn('h-full transition-all', getUsageColor(getUsagePercentage(usage?.campaigns || 0, currentPlanFeatures.maxCampaignsPerMonth)))}
                                    style={{ width: `${getUsagePercentage(usage?.campaigns || 0, currentPlanFeatures.maxCampaignsPerMonth)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Invoice History */}
            <Card>
                <CardHeader>
                    <CardTitle>Invoice History</CardTitle>
                    <CardDescription>View and download your past invoices</CardDescription>
                </CardHeader>
                <CardContent>
                    {invoices.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>No invoices yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {invoices.slice(0, 5).map((invoice: any) => (
                                <div key={invoice.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div>
                                        <p className="font-medium">{invoice.invoiceNumber}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(invoice.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium">${(Number(invoice.total) || 0).toFixed(2)}</span>
                                        <span className={cn(
                                            'text-xs px-2 py-0.5 rounded-full capitalize',
                                            invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                invoice.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-700'
                                        )}>
                                            {invoice.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Billing Cycle Toggle */}
            <div className="flex justify-center">
                <div className="inline-flex items-center bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={cn(
                            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                            billingCycle === 'monthly' ? 'bg-background shadow' : 'text-muted-foreground'
                        )}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={cn(
                            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                            billingCycle === 'yearly' ? 'bg-background shadow' : 'text-muted-foreground'
                        )}
                    >
                        Yearly <span className="text-green-600 ml-1">Save 20%</span>
                    </button>
                </div>
            </div>

            {/* Plans Grid */}
            <div id="plans-section" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan: any) => {
                    const monthlyPrice = parseFloat(String(plan.monthlyPrice)) || 0;
                    const yearlyPrice = parseFloat(String(plan.yearlyPrice)) || 0;
                    const price = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice / 12;
                    const isCurrentPlan = subscription?.plan?.tier === plan.tier;

                    return (
                        <Card key={plan.id} className={cn(
                            'relative',
                            plan.isPopular && 'border-primary shadow-md',
                            isCurrentPlan && 'ring-2 ring-primary'
                        )}>
                            {plan.isPopular && (
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                    <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                                        Popular
                                    </span>
                                </div>
                            )}
                            <CardHeader className="text-center pb-2">
                                <CardTitle className="text-lg">{plan.displayName}</CardTitle>
                                <CardDescription className="text-xs">{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="text-center">
                                <div className="mb-4">
                                    <span className="text-3xl font-bold">${price.toFixed(0)}</span>
                                    <span className="text-muted-foreground text-sm">/mo</span>
                                </div>
                                <ul className="space-y-1.5 text-xs text-left mb-4">
                                    <li className="flex items-center gap-1.5">
                                        <span className="text-green-600">✓</span>
                                        {formatLimit(plan.features?.maxContacts || 0)} Contacts
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <span className="text-green-600">✓</span>
                                        {formatLimit(plan.features?.maxMessagesPerMonth || 0)} Messages
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <span className="text-green-600">✓</span>
                                        {formatLimit(plan.features?.maxAgents || 0)} Team Members
                                    </li>
                                </ul>
                                <Button
                                    className="w-full"
                                    size="sm"
                                    variant={isCurrentPlan ? 'outline' : plan.isPopular ? 'default' : 'outline'}
                                    disabled={isCurrentPlan || upgrading === plan.tier}
                                    onClick={() => !isCurrentPlan && handleUpgrade(plan.tier)}
                                >
                                    {upgrading === plan.tier ? (
                                        <span className="animate-spin">...</span>
                                    ) : isCurrentPlan ? 'Current' : 'Upgrade'}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

function SecuritySettings() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>Update your password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input id="currentPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input id="newPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input id="confirmPassword" type="password" />
                    </div>
                    <Button>Update Password</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>Add an extra layer of security</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Status</p>
                            <p className="text-sm text-muted-foreground">Not enabled</p>
                        </div>
                        <Button>Enable 2FA</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function WebhooksSettings() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Webhooks</CardTitle>
                            <CardDescription>Configure webhooks for external integrations</CardDescription>
                        </div>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Webhook
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                        <Webhook className="mx-auto h-12 w-12 opacity-20 mb-4" />
                        <p>No webhooks configured</p>
                        <p className="text-sm">Add webhooks to receive real-time events</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
