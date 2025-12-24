'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface ShopifyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ShopifyModal({ open, onOpenChange, onSuccess }: ShopifyModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        storeName: '',
        shopDomain: '',
        accessToken: '',
        apiKey: '',
        apiSecret: '',
    });

    const handleConnect = async () => {
        if (!formData.storeName || !formData.shopDomain || !formData.accessToken) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/v1/ecommerce/stores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    platform: 'shopify',
                    storeName: formData.storeName,
                    storeUrl: `https://${formData.shopDomain}`,
                    accessToken: formData.accessToken,
                    apiKey: formData.apiKey || undefined,
                    apiSecret: formData.apiSecret || undefined,
                }),
            });

            if (!response.ok) {
                let errorMessage = 'Failed to connect Shopify store';

                try {
                    const data = await response.json();

                    if (response.status === 401) {
                        errorMessage = '⚠️ Login Required\n\nPlease log in to your account first, then try connecting Shopify.';
                    } else if (response.status === 403) {
                        errorMessage = '⚠️ Permission Denied\n\nYou don\'t have permission to add stores.';
                    } else if (data.message) {
                        errorMessage = '❌ Connection Failed\n\n' + data.message;
                    }
                } catch (e) {
                    if (response.status === 401) {
                        errorMessage = '⚠️ Please log in to connect stores';
                    }
                }

                throw new Error(errorMessage);
            }

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (err: any) {
            console.error('Shopify connection error:', err);
            setError(err.message || '❌ Failed to connect Shopify\n\nPlease check your credentials and try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            storeName: '',
            shopDomain: '',
            accessToken: '',
            apiKey: '',
            apiSecret: '',
        });
        setError('');
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Connect Shopify Store</DialogTitle>
                    <DialogDescription>
                        Connect your Shopify store to sync products, orders, and inventory
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4">
                    {/* Setup Instructions */}
                    <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
                        <h4 className="font-medium mb-2 text-blue-900">How to get Shopify credentials:</h4>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Go to your Shopify Admin → Apps → App and sales channel settings</li>
                            <li>Click "Develop apps" → "Create an app"</li>
                            <li>Name your app and install it to your store</li>
                            <li>Copy the Admin API access token</li>
                        </ol>
                        <a
                            href="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2"
                        >
                            Learn more <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="store-name">Store Name *</Label>
                        <Input
                            id="store-name"
                            placeholder="My Shopify Store"
                            value={formData.storeName}
                            onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="shop-domain">Shop Domain *</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">https://</span>
                            <Input
                                id="shop-domain"
                                placeholder="your-store.myshopify.com"
                                value={formData.shopDomain}
                                onChange={(e) => setFormData({ ...formData, shopDomain: e.target.value })}
                                className="flex-1"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Your Shopify store domain (e.g., your-store.myshopify.com)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="access-token">Admin API Access Token *</Label>
                        <Input
                            id="access-token"
                            type="password"
                            placeholder="shpat_xxxxxxxxxxxxx"
                            value={formData.accessToken}
                            onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Generated from your Shopify custom app
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="api-key">API Key (Optional)</Label>
                        <Input
                            id="api-key"
                            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="api-secret">API Secret Key (Optional)</Label>
                        <Input
                            id="api-secret"
                            type="password"
                            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            value={formData.apiSecret}
                            onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleConnect} disabled={loading} className="flex-1">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Connect Shopify
                                </>
                            )}
                        </Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
