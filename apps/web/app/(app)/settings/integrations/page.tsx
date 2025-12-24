'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Webhook,
    Plus,
    Edit,
    Trash2,
    Check,
    Copy,
    RefreshCw,
    Activity,
    Loader2,
    ExternalLink,
    Wifi,
    CheckCircle2,
    XCircle,
    Power,
    PowerOff,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomWebhook {
    id: string;
    name: string;
    description: string;
    targetUrl: string;
    events: string[];
    isActive: boolean;
    secretKey: string;
    successCount: number;
    failureCount: number;
    lastTriggeredAt: string;
}

const availableEvents = [
    { id: 'contact.created', label: 'Contact Created', icon: '👤' },
    { id: 'contact.updated', label: 'Contact Updated', icon: '✏️' },
    { id: 'order.created', label: 'Order Created', icon: '🛒' },
    { id: 'order.shipped', label: 'Order Shipped', icon: '📦' },
    { id: 'order.delivered', label: 'Order Delivered', icon: '✅' },
    { id: 'cart.abandoned', label: 'Cart Abandoned', icon: '🛒' },
    { id: 'message.received', label: 'Message Received', icon: '💬' },
    { id: 'campaign.sent', label: 'Campaign Sent', icon: '📧' },
];

export default function IntegrationsPage() {
    const [webhooks, setWebhooks] = useState<CustomWebhook[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        targetUrl: '',
        events: [] as string[],
    });

    useEffect(() => {
        fetchWebhooks();
    }, []);

    // Auto-clear success message
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [successMessage]);

    // Auto-clear copied indicator
    useEffect(() => {
        if (copiedId) {
            const timer = setTimeout(() => setCopiedId(null), 2000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [copiedId]);

    const fetchWebhooks = async () => {
        try {
            const response = await fetch('/api/integrations/webhooks');
            const data = await response.json();
            setWebhooks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching webhooks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateWebhook = async () => {
        if (!formData.name || !formData.targetUrl) return;

        setSaving(true);
        try {
            const response = await fetch('/api/integrations/webhooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                const newWebhook = await response.json();
                setWebhooks([...webhooks, newWebhook]);
                setShowForm(false);
                setFormData({ name: '', description: '', targetUrl: '', events: [] });
                setSuccessMessage('Webhook created successfully!');
            }
        } catch (error) {
            console.error('Error creating webhook:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteWebhook = async (id: string) => {
        if (!confirm('Are you sure you want to delete this webhook?')) return;

        try {
            const response = await fetch(`/api/integrations/webhooks/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setWebhooks(webhooks.filter(w => w.id !== id));
                setSuccessMessage('Webhook deleted successfully!');
            }
        } catch (error) {
            console.error('Error deleting webhook:', error);
        }
    };

    const handleTestWebhook = async (id: string) => {
        setTestingId(id);
        setTestResults(prev => ({ ...prev, [id]: undefined as any }));

        try {
            const response = await fetch(`/api/integrations/webhooks/${id}`, {
                method: 'PATCH',
            });
            const data = await response.json();
            setTestResults(prev => ({
                ...prev,
                [id]: {
                    success: data.success !== false,
                    message: data.message || (data.success !== false ? 'Connection successful!' : 'Connection failed'),
                },
            }));
        } catch (error) {
            setTestResults(prev => ({
                ...prev,
                [id]: { success: false, message: 'Connection test failed' },
            }));
        } finally {
            setTestingId(null);
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/integrations/webhooks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            if (response.ok) {
                setWebhooks(webhooks.map(w =>
                    w.id === id ? { ...w, isActive: !currentStatus } : w
                ));
                setSuccessMessage(`Webhook ${!currentStatus ? 'activated' : 'deactivated'}`);
            }
        } catch (error) {
            console.error('Error toggling webhook:', error);
        }
    };

    const toggleEvent = (eventId: string) => {
        setFormData(prev => ({
            ...prev,
            events: prev.events.includes(eventId)
                ? prev.events.filter(e => e !== eventId)
                : [...prev.events, eventId],
        }));
    };

    const copySecret = (id: string, secret: string) => {
        navigator.clipboard.writeText(secret);
        setCopiedId(id);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading integrations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Success Toast */}
            {successMessage && (
                <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        {successMessage}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                    <p className="text-muted-foreground">Manage webhooks and third-party integrations</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fetchWebhooks()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Webhook
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-blue-500/10">
                                <Webhook className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-blue-700">{webhooks.length}</p>
                                <p className="text-sm text-blue-600">Total Webhooks</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-green-500/10">
                                <Power className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-700">
                                    {webhooks.filter(w => w.isActive).length}
                                </p>
                                <p className="text-sm text-green-600">Active Webhooks</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-purple-500/10">
                                <Zap className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-purple-700">
                                    {webhooks.reduce((sum, w) => sum + (w.successCount || 0), 0)}
                                </p>
                                <p className="text-sm text-purple-600">Total Events Sent</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Create Webhook Form */}
            {showForm && (
                <Card className="border-2 border-dashed border-primary/30">
                    <CardHeader className="bg-primary/5">
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Create New Webhook
                        </CardTitle>
                        <CardDescription>Configure a webhook to receive real-time events</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Webhook Name *</Label>
                                <Input
                                    placeholder="e.g., Order Notifications"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Target URL *</Label>
                                <Input
                                    placeholder="https://your-server.com/webhook"
                                    value={formData.targetUrl}
                                    onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                placeholder="What this webhook is used for"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Events to Subscribe</Label>
                            <div className="grid gap-2 md:grid-cols-4">
                                {availableEvents.map((event) => (
                                    <button
                                        key={event.id}
                                        type="button"
                                        onClick={() => toggleEvent(event.id)}
                                        className={cn(
                                            'flex items-center gap-2 p-3 rounded-lg border text-sm text-left transition-all',
                                            formData.events.includes(event.id)
                                                ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                                : 'border-input hover:bg-muted hover:border-muted-foreground/30'
                                        )}
                                    >
                                        <div className={cn(
                                            'h-5 w-5 rounded border flex items-center justify-center transition-colors',
                                            formData.events.includes(event.id)
                                                ? 'bg-primary border-primary'
                                                : 'border-input'
                                        )}>
                                            {formData.events.includes(event.id) && (
                                                <Check className="h-3 w-3 text-primary-foreground" />
                                            )}
                                        </div>
                                        <span className="mr-1">{event.icon}</span>
                                        {event.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button
                                onClick={handleCreateWebhook}
                                disabled={!formData.name || !formData.targetUrl || saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Create Webhook
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" onClick={() => setShowForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Webhooks List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Webhook className="h-5 w-5" />
                        Custom Webhooks
                    </CardTitle>
                    <CardDescription>Receive real-time notifications for events</CardDescription>
                </CardHeader>
                <CardContent>
                    {webhooks.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Webhook className="mx-auto h-16 w-16 opacity-20 mb-4" />
                            <p className="text-lg font-medium">No webhooks configured</p>
                            <p className="text-sm mb-4">Add webhooks to receive real-time events from your application</p>
                            <Button onClick={() => setShowForm(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add First Webhook
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {webhooks.map((webhook) => {
                                const testResult = testResults[webhook.id];
                                const isTesting = testingId === webhook.id;

                                return (
                                    <div
                                        key={webhook.id}
                                        className={cn(
                                            'border rounded-lg p-4 transition-all hover:shadow-md',
                                            webhook.isActive ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50/30'
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-lg">{webhook.name}</h4>
                                                    <span className={cn(
                                                        'px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1',
                                                        webhook.isActive
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                    )}>
                                                        {webhook.isActive ? (
                                                            <><Power className="h-3 w-3" /> Active</>
                                                        ) : (
                                                            <><PowerOff className="h-3 w-3" /> Inactive</>
                                                        )}
                                                    </span>
                                                </div>
                                                {webhook.description && (
                                                    <p className="text-sm text-muted-foreground">{webhook.description}</p>
                                                )}
                                                <p className="text-sm font-mono text-muted-foreground flex items-center gap-2 mt-1">
                                                    <ExternalLink className="h-3 w-3" />
                                                    {webhook.targetUrl}
                                                </p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleTestWebhook(webhook.id)}
                                                    disabled={isTesting}
                                                    className="gap-1"
                                                >
                                                    {isTesting ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Wifi className="h-4 w-4" />
                                                    )}
                                                    Test
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => copySecret(webhook.id, webhook.secretKey || 'no-secret')}
                                                    title="Copy Secret Key"
                                                >
                                                    {copiedId === webhook.id ? (
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleToggleActive(webhook.id, webhook.isActive)}
                                                    title={webhook.isActive ? 'Deactivate' : 'Activate'}
                                                >
                                                    {webhook.isActive ? (
                                                        <PowerOff className="h-4 w-4 text-orange-500" />
                                                    ) : (
                                                        <Power className="h-4 w-4 text-green-500" />
                                                    )}
                                                </Button>
                                                <Button size="sm" variant="ghost" title="Edit">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteWebhook(webhook.id)}
                                                    className="hover:bg-red-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Test Result */}
                                        {testResult && (
                                            <div className={cn(
                                                'mt-3 p-3 rounded-lg text-sm flex items-center gap-2',
                                                testResult.success
                                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                                    : 'bg-red-100 text-red-700 border border-red-200'
                                            )}>
                                                {testResult.success ? (
                                                    <CheckCircle2 className="h-4 w-4" />
                                                ) : (
                                                    <XCircle className="h-4 w-4" />
                                                )}
                                                {testResult.message}
                                            </div>
                                        )}

                                        {/* Stats */}
                                        <div className="mt-4 flex items-center gap-6 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-green-600 font-medium">{webhook.successCount || 0} success</span>
                                                <span className="text-muted-foreground">•</span>
                                                <span className="text-red-600 font-medium">{webhook.failureCount || 0} failed</span>
                                            </div>
                                            {webhook.lastTriggeredAt && (
                                                <span className="text-muted-foreground">
                                                    Last triggered: {new Date(webhook.lastTriggeredAt).toLocaleString()}
                                                </span>
                                            )}
                                        </div>

                                        {/* Events Tags */}
                                        {webhook.events && webhook.events.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {webhook.events.map((event) => {
                                                    const eventInfo = availableEvents.find(e => e.id === event);
                                                    return (
                                                        <span
                                                            key={event}
                                                            className="px-2 py-1 bg-muted rounded text-xs flex items-center gap-1"
                                                        >
                                                            {eventInfo?.icon} {eventInfo?.label || event}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
