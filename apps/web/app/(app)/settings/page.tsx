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
import { WalletOverview } from '@/components/dashboard/wallet-overview';
import { TransactionHistory } from '@/components/billing/transaction-history';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const settingsTabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
];

// ... imports remain the same

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
                {activeTab === 'team' && <TeamSettings />}
                {activeTab === 'notifications' && <NotificationsSettings />}
                {activeTab === 'billing' && <BillingSettings />}
                {activeTab === 'security' && <SecuritySettings />}
                {activeTab === 'webhooks' && <WebhooksSettings />}
            </div>
        </div>
    );
}

function GeneralSettings() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        companyName: '',
        companySlug: '',
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Try to get from API first
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                    setFormData({
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        email: data.email || '',
                        companyName: data.companyName || '',
                        companySlug: data.companySlug || '',
                    });
                } else {
                    // Fallback to localStorage if API fails (or dev mode without backend)
                    const localUser = localStorage.getItem('user');
                    if (localUser) {
                        const data = JSON.parse(localUser);
                        setUser(data);
                        setFormData({
                            firstName: data.firstName || '',
                            lastName: data.lastName || '',
                            email: data.email || '',
                            companyName: data.companyName || '',
                            companySlug: data.companySlug || '',
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/auth/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                const updatedUser = await res.json();
                setUser(updatedUser);
                // Update localStorage too
                localStorage.setItem('user', JSON.stringify(updatedUser));
                alert('Settings saved successfully!');
            } else {
                alert('Failed to save settings.');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('An error occurred.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={formData.email} disabled />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Workspace Information</CardTitle>
                    <CardDescription>Manage your workspace details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                                id="companyName"
                                value={formData.companyName}
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="companySlug">Workspace Slug</Label>
                            <Input id="companySlug" value={formData.companySlug} disabled />
                        </div>
                    </div>

                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

function TeamSettings() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const res = await fetch('/api/organizations/members');
                if (res.ok) {
                    const data = await res.json();
                    setMembers(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error('Error fetching members:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, []);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Team Members</CardTitle>
                            <CardDescription>Manage your team and their permissions</CardDescription>
                        </div>
                        <InviteMemberModal onInviteSuccess={(newMember) => setMembers([...members, newMember])} />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div>Loading members...</div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">No team members found.</div>
                    ) : (
                        <div className="space-y-4">
                            {members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between border-b pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary-foreground">
                                            {(member.name || member.email || 'U')
                                                .substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium">{member.name || 'Unknown'}</p>
                                            <p className="text-sm text-muted-foreground">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span
                                            className={cn(
                                                'rounded-full px-3 py-1 text-xs font-medium',
                                                member.role === 'OWNER'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : member.role === 'ADMIN'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-green-100 text-green-700'
                                            )}
                                        >
                                            {member.role}
                                        </span>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="ghost">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            {member.role !== 'OWNER' && (
                                                <Button size="sm" variant="ghost">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}



function InviteMemberModal({ onInviteSuccess }: { onInviteSuccess: (member: any) => void }) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('agent');
    const [loading, setLoading] = useState(false);

    const handleInvite = async () => {
        if (!email) return;
        setLoading(true);
        try {
            const res = await fetch('/api/organizations/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role: role.toUpperCase() }),
            });
            const data = await res.json();
            if (res.ok) {
                // Returns the created user from backend
                // Data might be the user object directly or wrapped.
                // Backend: return this.userRepository.save(newUser); -> returns User
                onInviteSuccess(data);
                setOpen(false);
                setEmail('');
                setRole('agent');
                alert('Invitation sent successfully!');
            } else {
                alert(data.error || 'Failed to send invitation');
            }
        } catch (error) {
            console.error('Invite error:', error);
            alert('Failed to invite member');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Invite Member
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                        Send an invitation to a new team member.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                            id="invite-email"
                            placeholder="colleague@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="invite-role">Role</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="agent">Agent</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleInvite} disabled={loading}>
                        {loading ? 'Sending...' : 'Send Invitation'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function NotificationsSettings() {
    const [settings, setSettings] = useState({
        emailNotifications: true,
        pushNotifications: true,
        conversationAlerts: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.settings?.notifications) {
                        setSettings(data.settings.notifications);
                    }
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/auth/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings: {
                        notifications: settings
                    }
                }),
            });

            if (res.ok) {
                alert('Notifications preferences saved!');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save preferences.');
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            alert('An error occurred.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

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
                        <input
                            type="checkbox"
                            checked={settings.emailNotifications}
                            onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                            className="h-4 w-4 rounded"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Push Notifications</p>
                            <p className="text-sm text-muted-foreground">Browser push notifications</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.pushNotifications}
                            onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                            className="h-4 w-4 rounded"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">New Conversation Alerts</p>
                            <p className="text-sm text-muted-foreground">Get notified of new conversations</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.conversationAlerts}
                            onChange={(e) => setSettings({ ...settings, conversationAlerts: e.target.checked })}
                            className="h-4 w-4 rounded"
                        />
                    </div>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Preferences'}
                    </Button>
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
                                <CreditCard className="h-6 w-6 text-primary-foreground" />
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



            {/* Message Wallet Section */}
            <div>
                <h3 className="text-lg font-medium mb-4">Message Credits</h3>
                <div className="grid gap-6 md:grid-cols-2">
                    <WalletOverview />
                    <Card>
                        <CardHeader>
                            <CardTitle>Auto-Recharge</CardTitle>
                            <CardDescription>Automatically add credits when balance is low</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Not enabled</span>
                                <Button variant="outline" size="sm" disabled>Configure</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

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

            {/* Transaction History */}
            <div>
                <h3 className="text-lg font-medium mb-4">Credit Transactions</h3>
                <TransactionHistory />
            </div>

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
                {
                    plans.map((plan: any) => {
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
                    })
                }
            </div>
        </div>
    );
}

function SecuritySettings() {
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswords({ ...passwords, [e.target.id]: e.target.value });
    };

    const handleUpdatePassword = async () => {
        if (passwords.newPassword !== passwords.confirmPassword) {
            alert('New passwords do not match');
            return;
        }
        if (!passwords.currentPassword) {
            alert('Please enter your current password');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwords.currentPassword,
                    newPassword: passwords.newPassword,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                alert('Password updated successfully');
                setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                alert(data.error || 'Failed to update password');
            }
        } catch (error) {
            console.error('Error updating password:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

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
                        <Input
                            id="currentPassword"
                            type="password"
                            value={passwords.currentPassword}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={passwords.newPassword}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={passwords.confirmPassword}
                            onChange={handleChange}
                        />
                    </div>
                    <Button onClick={handleUpdatePassword} disabled={loading}>
                        {loading ? 'Updating...' : 'Update Password'}
                    </Button>
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
                        <Button variant="outline" disabled>Enable 2FA (Coming Soon)</Button>
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
