'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface InstagramModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

export function InstagramModal({ open, onOpenChange, onSuccess }: InstagramModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'choice' | 'manual' | 'oauth'>('choice');
    const [formData, setFormData] = useState({
        name: '',
        instagramAccountId: '',
        accessToken: '',
    });

    const loadFacebookSDK = () => {
        return new Promise((resolve) => {
            if (window.FB) {
                resolve(window.FB);
                return;
            }

            window.fbAsyncInit = () => {
                window.FB.init({
                    appId: process.env.NEXT_PUBLIC_META_APP_ID || 'YOUR_APP_ID',
                    cookie: true,
                    xfbml: true,
                    version: 'v18.0'
                });
                resolve(window.FB);
            };

            // Load SDK if script doesn't exist
            if (!document.getElementById('facebook-jssdk')) {
                const script = document.createElement('script');
                script.id = 'facebook-jssdk';
                script.src = 'https://connect.facebook.net/en_US/sdk.js';
                script.async = true;
                document.body.appendChild(script);
            }
        });
    };

    const handleFacebookLogin = async () => {
        setLoading(true);
        setError('');

        const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;

        if (!metaAppId) {
            setError('Meta App ID is required. Please set NEXT_PUBLIC_META_APP_ID in .env.local. Use Manual Configuration instead.');
            setLoading(false);
            return;
        }

        try {
            await loadFacebookSDK();

            console.log('Opening Facebook login for Instagram...');

            window.FB.login((response: any) => {
                console.log('FB.login response:', response);

                if (response.authResponse) {
                    const { accessToken, userID } = response.authResponse;
                    console.log('Received access token, fetching Instagram accounts...');

                    // Fetch Instagram Business Accounts
                    fetchInstagramAccounts(accessToken, userID);
                } else {
                    console.error('No auth response:', response);
                    setError(response.status === 'unknown'
                        ? 'Facebook login failed. Make sure you have a valid Meta App ID.'
                        : 'Instagram connection was cancelled'
                    );
                    setLoading(false);
                }
            }, {
                scope: 'instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement',
                return_scopes: true
            });
        } catch (err: any) {
            console.error('Facebook login error:', err);
            setError(err.message || 'Failed to initialize Facebook SDK');
            setLoading(false);
        }
    };

    const fetchInstagramAccounts = async (accessToken: string, userId: string) => {
        try {
            // Get Facebook Pages
            const pagesResponse = await fetch(
                `https://graph.facebook.com/v18.0/${userId}/accounts?access_token=${accessToken}`
            );
            const pagesData = await pagesResponse.json();

            if (pagesData.data && pagesData.data.length > 0) {
                // Get Instagram account from first page
                const pageId = pagesData.data[0].id;
                const pageAccessToken = pagesData.data[0].access_token;

                const igResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
                );
                const igData = await igResponse.json();

                if (igData.instagram_business_account) {
                    await handleInstagramConnect(
                        igData.instagram_business_account.id,
                        pageAccessToken,
                        pagesData.data[0].name
                    );
                } else {
                    setError('No Instagram Business Account found. Please connect your Instagram to your Facebook Page.');
                    setLoading(false);
                }
            } else {
                setError('No Facebook Pages found. You need a Facebook Page connected to an Instagram Business Account.');
                setLoading(false);
            }
        } catch (err: any) {
            console.error('Error fetching Instagram accounts:', err);
            setError('Failed to fetch Instagram accounts');
            setLoading(false);
        }
    };

    const handleInstagramConnect = async (igAccountId: string, accessToken: string, pageName: string) => {
        try {
            const response = await fetch('/api/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelType: 'instagram',
                    name: `Instagram - ${pageName}`,
                    credentials: {
                        instagramAccountId: igAccountId,
                        accessToken: accessToken,
                    },
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to connect Instagram');
            }

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (err: any) {
            setError(err.message || 'Failed to connect Instagram');
        } finally {
            setLoading(false);
        }
    };

    const handleManualConnect = async () => {
        if (!formData.name || !formData.instagramAccountId || !formData.accessToken) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelType: 'instagram',
                    name: formData.name,
                    credentials: {
                        instagramAccountId: formData.instagramAccountId,
                        accessToken: formData.accessToken,
                    },
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to connect Instagram');
            }

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (err: any) {
            setError(err.message || 'Failed to connect Instagram');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            instagramAccountId: '',
            accessToken: '',
        });
        setStep('choice');
        setError('');
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Connect Instagram Direct</DialogTitle>
                    <DialogDescription>
                        Choose how you want to connect your Instagram Business account
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
                    </Alert>
                )}

                {step === 'choice' && (
                    <div className="space-y-4">
                        <Button
                            className="w-full h-auto py-6 flex-col items-start"
                            variant="outline"
                            onClick={() => setStep('oauth')}
                        >
                            <div className="font-semibold text-base mb-1">Facebook Login (Recommended)</div>
                            <div className="text-sm text-muted-foreground text-left font-normal">
                                Quick setup through Facebook. Automatically finds your Instagram Business Account.
                            </div>
                        </Button>

                        <Button
                            className="w-full h-auto py-6 flex-col items-start"
                            variant="outline"
                            onClick={() => setStep('manual')}
                        >
                            <div className="font-semibold text-base mb-1">Manual Configuration</div>
                            <div className="text-sm text-muted-foreground text-left font-normal">
                                For advanced users. Requires Instagram Account ID and Page Access Token.
                            </div>
                        </Button>
                    </div>
                )}

                {step === 'oauth' && (
                    <div className="space-y-4">
                        <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
                            <h4 className="font-medium mb-2 text-blue-900">Requirements:</h4>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                <li>Instagram Business Account</li>
                                <li>Facebook Page connected to Instagram</li>
                                <li>Admin access to the Facebook Page</li>
                            </ul>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleFacebookLogin} disabled={loading} className="flex-1">
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Connect with Facebook
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" onClick={() => setStep('choice')}>
                                Back
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'manual' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ig-name">Channel Name *</Label>
                            <Input
                                id="ig-name"
                                placeholder="e.g., @company_official"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ig-account-id">Instagram Account ID *</Label>
                            <Input
                                id="ig-account-id"
                                placeholder="From Facebook Business Manager"
                                value={formData.instagramAccountId}
                                onChange={(e) => setFormData({ ...formData, instagramAccountId: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Found in Facebook Business Settings → Instagram Accounts
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ig-token">Page Access Token *</Label>
                            <Input
                                id="ig-token"
                                type="password"
                                placeholder="Your Instagram API token"
                                value={formData.accessToken}
                                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Generate from Facebook Graph API Explorer
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleManualConnect} disabled={loading} className="flex-1">
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    'Connect Instagram'
                                )}
                            </Button>
                            <Button variant="outline" onClick={() => setStep('choice')}>
                                Back
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
