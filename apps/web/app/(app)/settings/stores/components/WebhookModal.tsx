'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, Copy } from 'lucide-react';

interface WebhookModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function WebhookModal({ open, onOpenChange, onSuccess }: WebhookModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [formData, setFormData] = useState({
        storeName: '',
        storeUrl: '',
        webhookSecret: '',
    });

    const handleConnect = async () => {
        if (!formData.storeName || !formData.storeUrl) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Ensure URL format
            let url = formData.storeUrl;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            const response = await fetch('/api/v1/ecommerce/stores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    platform: 'custom',
                    storeName: formData.storeName,
                    storeUrl: url,
                    webhookSecret: formData.webhookSecret || undefined,
                }),
            });

            if (!response.ok) {
                let errorMessage = 'Failed to create webhook integration';

                try {
                    const data = await response.json();

                    if (response.status === 401) {
                        errorMessage = '⚠️ Login Required\n\nPlease log in to your account first, then try creating a webhook integration.';
                    } else if (response.status === 403) {
                        errorMessage = '⚠️ Permission Denied\n\nYou don\'t have permission to add stores.';
                    } else if (data.message) {
                        errorMessage = '❌ Failed\n\n' + data.message;
                    }
                } catch (e) {
                    if (response.status === 401) {
                        errorMessage = '⚠️ Please log in to create webhook integrations';
                    }
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            // Generate webhook URL based on store ID
            if (data.id) {
                const baseUrl = window.location.origin;
                setWebhookUrl(`${baseUrl}/api/v1/webhooks/ecommerce/${data.id}`);
            }

            onSuccess();
            // Don't close immediately - show webhook URL
        } catch (err: any) {
            console.error('Webhook creation error:', err);
            setError(err.message || '❌ Failed to create webhook\n\nPlease check your input and try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyWebhookUrl = () => {
        navigator.clipboard.writeText(webhookUrl);
        alert('Webhook URL copied to clipboard!');
    };

    const resetForm = () => {
        setFormData({
            storeName: '',
            storeUrl: '',
            webhookSecret: '',
        });
        setWebhookUrl('');
        setError('');
        setLoading(false);
    };

    const handleClose = () => {
        onOpenChange(false);
        resetForm();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Custom Webhook Integration</DialogTitle>
                    <DialogDescription>
                        Integrate any e-commerce platform using webhooks
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
                    </Alert>
                )}

                {!webhookUrl ? (
                    <div className="space-y-4">
                        {/* Info Box */}
                        <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
                            <h4 className="font-medium mb-2 text-blue-900">How webhook integration works:</h4>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                <li>Create a webhook integration here</li>
                                <li>Copy the generated webhook URL</li>
                                <li>Configure your e-commerce platform to send events to this URL</li>
                                <li>We'll automatically process orders, customers, and inventory updates</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="webhook-store-name">Integration Name *</Label>
                            <Input
                                id="webhook-store-name"
                                placeholder="My Store Webhook"
                                value={formData.storeName}
                                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="webhook-store-url">Store URL *</Label>
                            <Input
                                id="webhook-store-url"
                                placeholder="https://mystore.com"
                                value={formData.storeUrl}
                                onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your e-commerce store URL for reference
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="webhook-secret">Webhook Secret (Optional)</Label>
                            <Input
                                id="webhook-secret"
                                type="password"
                                placeholder="Your webhook verification secret"
                                value={formData.webhookSecret}
                                onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Optional secret for webhook signature verification
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleConnect} disabled={loading} className="flex-1">
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Create Webhook
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Alert>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription>
                                Webhook integration created successfully!
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label>Your Webhook URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={webhookUrl}
                                    readOnly
                                    className="font-mono text-sm"
                                />
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={copyWebhookUrl}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Copy this URL and configure it in your e-commerce platform's webhook settings
                            </p>
                        </div>

                        <div className="rounded-lg border p-4 bg-green-50 border-green-200">
                            <h4 className="font-medium mb-2 text-green-900">Supported Events:</h4>
                            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                                <li>Order created, updated, cancelled</li>
                                <li>Product added, updated, deleted</li>
                                <li>Customer created, updated</li>
                                <li>Cart abandoned</li>
                                <li>Inventory changes</li>
                            </ul>
                        </div>

                        <Button onClick={handleClose} className="w-full">
                            Done
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
