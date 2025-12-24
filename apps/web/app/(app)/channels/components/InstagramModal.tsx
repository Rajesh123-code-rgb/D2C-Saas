'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, CheckCircle, ExternalLink, BookOpen, Settings2, HelpCircle, ArrowRight } from 'lucide-react';

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
    const [step, setStep] = useState<'choice' | 'manual' | 'oauth' | 'guide'>('choice');
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Connect Instagram Direct
                        {step === 'choice' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto text-muted-foreground"
                                onClick={() => setStep('guide')}
                            >
                                <HelpCircle className="h-4 w-4 mr-1" />
                                Integration Guide
                            </Button>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'guide'
                            ? 'Step-by-step guide to connect your Instagram Business account'
                            : 'Choose how you want to connect your Instagram Business account'}
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
                    </Alert>
                )}

                {step === 'guide' && (
                    <div className="space-y-4">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="setup">Setup Steps</TabsTrigger>
                                <TabsTrigger value="credentials">Get Credentials</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-4 mt-4">
                                <div className="rounded-lg border p-4 bg-pink-50 border-pink-200">
                                    <h4 className="font-semibold text-pink-900 mb-2">What is Instagram Messaging API?</h4>
                                    <p className="text-sm text-pink-800">
                                        The Instagram Messaging API allows you to receive and respond to Instagram Direct messages,
                                        automate customer conversations, and manage your Instagram inbox programmatically.
                                    </p>
                                </div>

                                <div className="rounded-lg border p-4">
                                    <h4 className="font-semibold mb-3">Prerequisites</h4>
                                    <ul className="text-sm space-y-2">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>An Instagram Business or Creator Account</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>A Facebook Page connected to your Instagram account</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>Admin access to the Facebook Page</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>A Meta Developer account (same as Facebook)</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
                                    <h4 className="font-semibold text-blue-900 mb-2">Important Note</h4>
                                    <p className="text-sm text-blue-800">
                                        Instagram API access requires your Instagram account to be a <strong>Business</strong> or <strong>Creator</strong> account,
                                        and it must be connected to a Facebook Page. Personal Instagram accounts cannot use the API.
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="setup" className="space-y-4 mt-4">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</div>
                                        <div>
                                            <h5 className="font-medium">Convert to Business/Creator Account</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                In Instagram Settings → Account → Switch to Professional Account → Choose Business or Creator.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</div>
                                        <div>
                                            <h5 className="font-medium">Create a Facebook Page</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                If you don&apos;t have one, create a Facebook Page for your business at facebook.com/pages/create.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</div>
                                        <div>
                                            <h5 className="font-medium">Connect Instagram to Facebook Page</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Go to your Facebook Page Settings → Instagram → Connect Account. Log in with your Instagram credentials.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">4</div>
                                        <div>
                                            <h5 className="font-medium">Set Up Meta Developer App</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Create an app at developers.facebook.com with Instagram Graph API and Messenger API permissions.
                                            </p>
                                            <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer"
                                                className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1">
                                                Visit Meta Developers <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">5</div>
                                        <div>
                                            <h5 className="font-medium">Add Instagram Messaging Product</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                In your app, go to Add Products and set up &quot;Instagram&quot; with messaging permissions.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-pink-50 border-pink-200">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-600 text-xs font-bold text-white">6</div>
                                        <div>
                                            <h5 className="font-medium text-pink-900">Connect to Our Platform</h5>
                                            <p className="text-sm text-pink-800 mt-1">
                                                Use Facebook Login or Manual Configuration to connect your Instagram account here.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="credentials" className="space-y-4 mt-4">
                                <div className="rounded-lg border p-4 bg-amber-50 border-amber-200">
                                    <h4 className="font-semibold text-amber-900 mb-2">Where to Find Your Credentials</h4>
                                    <p className="text-sm text-amber-800">
                                        Credentials are found in Meta Developer Dashboard and Facebook Business Settings.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="rounded-lg border p-3">
                                        <h5 className="font-medium flex items-center gap-2">
                                            <Settings2 className="h-4 w-4 text-primary" />
                                            Instagram Account ID
                                        </h5>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Found in Facebook Business Settings → Instagram Accounts → Select your account → See the ID in the URL or account details.
                                        </p>
                                    </div>

                                    <div className="rounded-lg border p-3">
                                        <h5 className="font-medium flex items-center gap-2">
                                            <Settings2 className="h-4 w-4 text-primary" />
                                            Page Access Token
                                        </h5>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Generate using Graph API Explorer at developers.facebook.com. Select your app, then your Page, and request
                                            instagram_basic, instagram_manage_messages, and pages_show_list permissions.
                                        </p>
                                    </div>

                                    <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
                                        <h5 className="font-medium text-blue-900">Using Graph API Explorer</h5>
                                        <ol className="text-sm text-blue-800 mt-2 space-y-1 list-decimal list-inside">
                                            <li>Go to developers.facebook.com/tools/explorer</li>
                                            <li>Select your app from the dropdown</li>
                                            <li>Click &quot;Get Page Access Token&quot;</li>
                                            <li>Select your Facebook Page</li>
                                            <li>Add required permissions and generate token</li>
                                        </ol>
                                    </div>
                                </div>

                                <a href="https://developers.facebook.com/docs/instagram-api/getting-started"
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 p-3 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors">
                                    <BookOpen className="h-4 w-4" />
                                    Read Official Documentation
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </TabsContent>
                        </Tabs>

                        <Button onClick={() => setStep('choice')} className="w-full">
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Continue to Connection
                        </Button>
                    </div>
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

                        <div className="text-center pt-2">
                            <Button variant="link" size="sm" onClick={() => setStep('guide')} className="text-muted-foreground">
                                <BookOpen className="h-4 w-4 mr-1" />
                                Need help? Read the integration guide
                            </Button>
                        </div>
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
                        <div className="rounded-lg border p-3 bg-pink-50 border-pink-200">
                            <p className="text-sm text-pink-800">
                                <strong>Need help?</strong>{' '}
                                <Button variant="link" className="p-0 h-auto text-pink-800 underline" onClick={() => setStep('guide')}>
                                    View the integration guide
                                </Button>{' '}
                                to learn where to find these credentials.
                            </p>
                        </div>

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
