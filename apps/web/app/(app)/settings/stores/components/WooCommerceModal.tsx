'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface WooCommerceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function WooCommerceModal({ open, onOpenChange, onSuccess }: WooCommerceModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        storeName: '',
        storeUrl: '',
        consumerKey: '',
        consumerSecret: '',
    });

    const handleConnect = async () => {
        if (!formData.storeName || !formData.storeUrl || !formData.consumerKey || !formData.consumerSecret) {
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
                    platform: 'woocommerce',
                    storeName: formData.storeName,
                    storeUrl: url,
                    apiKey: formData.consumerKey,
                    apiSecret: formData.consumerSecret,
                }),
            });

            if (!response.ok) {
                let errorMessage = '';

                try {
                    const data = await response.json();

                    if (response.status === 401) {
                        errorMessage = '🔐 Authentication Required\n\nYour session has expired. Please:\n1. Refresh this page\n2. Log in again\n3. Try connecting WooCommerce';
                    } else if (response.status === 403) {
                        errorMessage = '⛔ Permission Denied\n\nYou don\'t have permission to add stores.\nContact your administrator for access.';
                    } else if (response.status === 400 && data.message?.includes('already connected')) {
                        errorMessage = '⚠️ Store Already Connected\n\nThis WooCommerce store is already linked to your account.\nCheck your connected stores below.';
                    } else if (data.message) {
                        // Check for specific WooCommerce API errors
                        if (data.message.includes('401') || data.message.includes('Unauthorized')) {
                            errorMessage = '❌ Invalid WooCommerce Credentials\n\nYour Consumer Key or Secret is incorrect.\n\n💡 How to fix:\n1. Log into WordPress admin\n2. Go to WooCommerce → Settings → Advanced → REST API\n3. Regenerate your API keys\n4. Make sure permissions are set to "Read/Write"';
                        } else if (data.message.includes('404') || data.message.includes('not found')) {
                            errorMessage = '🔍 Store Not Found\n\nCannot connect to your WooCommerce store.\n\n💡 Possible causes:\n• Store URL is incorrect\n• WooCommerce plugin not installed\n• REST API is disabled\n\nCheck your store URL and try again.';
                        } else if (data.message.includes('SSL') || data.message.includes('certificate')) {
                            errorMessage = '🔒 SSL Certificate Error\n\nYour store has an SSL/HTTPS issue.\n\n💡 How to fix:\n• Ensure your store has a valid SSL certificate\n• Contact your hosting provider\n• Try using HTTP instead (not recommended for production)';
                        } else if (data.message.includes('timeout') || data.message.includes('ETIMEDOUT')) {
                            errorMessage = '⏱️ Connection Timeout\n\nCannot reach your WooCommerce store.\n\n💡 Possible causes:\n• Store is down or slow\n• Firewall blocking our requests\n• Network issues\n\nTry again in a few moments.';
                        } else {
                            errorMessage = `❌ Connection Failed\n\n${data.message}\n\n💡 Need help? Check that:\n• Your store URL is correct\n• WooCommerce REST API is enabled\n• API credentials have Read/Write permissions`;
                        }
                    }
                } catch (e) {
                    if (response.status === 401) {
                        errorMessage = '🔐 Please log in again and try connecting your store.';
                    } else {
                        errorMessage = `⚠️ Connection error (${response.status})\n\nPlease check your store credentials and try again.`;
                    }
                }

                throw new Error(errorMessage);
            }

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (err: any) {
            console.error('WooCommerce connection error:', err);
            setError(err.message || '❌ Failed to connect WooCommerce\n\nPlease check your credentials and try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            storeName: '',
            storeUrl: '',
            consumerKey: '',
            consumerSecret: '',
        });
        setError('');
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Connect WooCommerce Store</DialogTitle>
                    <DialogDescription>
                        Connect your WooCommerce store via WordPress REST API
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
                    <div className="rounded-lg border p-4 bg-purple-50 border-purple-200">
                        <h4 className="font-medium mb-2 text-purple-900">How to get WooCommerce API credentials:</h4>
                        <ol className="text-sm text-purple-800 space-y-1 list-decimal list-inside">
                            <li>Log in to your WordPress admin panel</li>
                            <li>Go to WooCommerce → Settings → Advanced → REST API</li>
                            <li>Click "Add key"</li>
                            <li>Set permissions to "Read/Write" and generate the key</li>
                            <li>Copy the Consumer key and Consumer secret</li>
                        </ol>
                        <a
                            href="https://woocommerce.com/document/woocommerce-rest-api/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 hover:underline flex items-center gap-1 mt-2"
                        >
                            Learn more <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="woo-store-name">Store Name *</Label>
                        <Input
                            id="woo-store-name"
                            placeholder="My WooCommerce Store"
                            value={formData.storeName}
                            onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="woo-store-url">Store URL *</Label>
                        <Input
                            id="woo-store-url"
                            placeholder="https://mystore.com"
                            value={formData.storeUrl}
                            onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Your WordPress/WooCommerce site URL
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="consumer-key">Consumer Key *</Label>
                        <Input
                            id="consumer-key"
                            placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            value={formData.consumerKey}
                            onChange={(e) => setFormData({ ...formData, consumerKey: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="consumer-secret">Consumer Secret *</Label>
                        <Input
                            id="consumer-secret"
                            type="password"
                            placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            value={formData.consumerSecret}
                            onChange={(e) => setFormData({ ...formData, consumerSecret: e.target.value })}
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
                                    Connect WooCommerce
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
