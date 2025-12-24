'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, AlertCircle, ExternalLink, BookOpen, Settings2, HelpCircle, ArrowRight } from 'lucide-react';

interface WhatsAppModalProps {
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

export function WhatsAppModal({ open, onOpenChange, onSuccess }: WhatsAppModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'choice' | 'manual' | 'embedded' | 'guide'>('choice');
    const [formData, setFormData] = useState({
        name: '',
        phoneNumberId: '',
        accessToken: '',
        businessAccountId: '',
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

            // Load SDK
            const script = document.createElement('script');
            script.src = 'https://connect.facebook.net/en_US/sdk.js';
            script.async = true;
            document.body.appendChild(script);
        });
    };

    const handleEmbeddedSignup = async () => {
        setLoading(true);
        setError('');

        // Validate environment variables
        const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
        const metaConfigId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

        if (!metaAppId || !metaConfigId) {
            setError(
                'Meta App ID and Config ID are required. Please set NEXT_PUBLIC_META_APP_ID and NEXT_PUBLIC_META_CONFIG_ID in your .env.local file. Use Manual Configuration instead.'
            );
            setLoading(false);
            return;
        }

        try {
            await loadFacebookSDK();

            console.log('Opening Meta login dialog...');

            window.FB.login((response: any) => {
                console.log('FB.login response:', response);

                if (response.authResponse) {
                    const { code } = response.authResponse;
                    console.log('Received authorization code');

                    // Exchange code for access token via backend
                    handleCodeExchange(code);
                } else {
                    console.error('No auth response:', response);
                    setError(response.status === 'unknown'
                        ? 'Meta login failed. Make sure you have a valid Meta App ID and Config ID.'
                        : 'WhatsApp connection was cancelled'
                    );
                    setLoading(false);
                }
            }, {
                config_id: metaConfigId,
                response_type: 'code',
                override_default_response_type: true,
                extras: {
                    setup: {},
                    featureType: '',
                    sessionInfoVersion: '3'
                }
            });
        } catch (err: any) {
            console.error('Embedded signup error:', err);
            setError(err.message || 'Failed to initialize Facebook SDK');
            setLoading(false);
        }
    };

    const handleCodeExchange = async (code: string) => {
        try {
            const response = await fetch('/api/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelType: 'whatsapp',
                    name: 'WhatsApp Business',
                    credentials: { authCode: code },
                }),
            });

            if (!response.ok) throw new Error('Failed to connect WhatsApp');

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (err: any) {
            setError(err.message || 'Failed to connect WhatsApp');
        } finally {
            setLoading(false);
        }
    };

    const handleManualConnect = async () => {
        if (!formData.name || !formData.phoneNumberId || !formData.accessToken) {
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
                    channelType: 'whatsapp',
                    name: formData.name,
                    credentials: {
                        phoneNumberId: formData.phoneNumberId,
                        accessToken: formData.accessToken,
                        businessAccountId: formData.businessAccountId,
                    },
                }),
            });

            if (!response.ok) {
                let errorMessage = 'Failed to connect WhatsApp';

                try {
                    const data = await response.json();

                    if (response.status === 401) {
                        errorMessage = '⚠️ Login Required\n\nPlease log in to your account first, then try connecting WhatsApp.';
                    } else if (response.status === 403) {
                        errorMessage = '⚠️ Permission Denied\n\nYou don\'t have permission to add channels.';
                    } else if (data.message) {
                        errorMessage = '❌ Connection Failed\n\n' + data.message;
                    }
                } catch (e) {
                    if (response.status === 401) {
                        errorMessage = '⚠️ Please log in to connect channels';
                    }
                }

                throw new Error(errorMessage);
            }

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (err: any) {
            console.error('WhatsApp connection error:', err);
            setError(err.message || '❌ Failed to connect WhatsApp\n\nPlease check your credentials and try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            phoneNumberId: '',
            accessToken: '',
            businessAccountId: '',
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
                        Connect WhatsApp Business
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
                            ? 'Step-by-step guide to connect your WhatsApp Business account'
                            : 'Choose how you want to connect your WhatsApp Business account'}
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
                                <div className="rounded-lg border p-4 bg-green-50 border-green-200">
                                    <h4 className="font-semibold text-green-900 mb-2">What is WhatsApp Business API?</h4>
                                    <p className="text-sm text-green-800">
                                        The WhatsApp Business API allows you to programmatically send and receive messages,
                                        automate responses, and integrate WhatsApp into your business workflows.
                                    </p>
                                </div>

                                <div className="rounded-lg border p-4">
                                    <h4 className="font-semibold mb-3">Prerequisites</h4>
                                    <ul className="text-sm space-y-2">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>A Meta Business Account (create at business.facebook.com)</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>A verified Meta Developer account</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>A phone number not already registered with WhatsApp</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>Business verification (for production use)</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
                                    <h4 className="font-semibold text-blue-900 mb-2">Two Connection Methods</h4>
                                    <div className="space-y-2 text-sm text-blue-800">
                                        <p><strong>1. Embedded Signup (Recommended):</strong> One-click setup through Meta&apos;s official OAuth flow.</p>
                                        <p><strong>2. Manual Configuration:</strong> Enter your API credentials directly for full control.</p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="setup" className="space-y-4 mt-4">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</div>
                                        <div>
                                            <h5 className="font-medium">Create a Meta Developer Account</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Go to developers.facebook.com and sign up or log in with your Facebook account.
                                            </p>
                                            <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer"
                                                className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1">
                                                Visit Meta Developers <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</div>
                                        <div>
                                            <h5 className="font-medium">Create a New App</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Click &quot;My Apps&quot; → &quot;Create App&quot; → Select &quot;Business&quot; type → Fill in app details.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</div>
                                        <div>
                                            <h5 className="font-medium">Add WhatsApp Product</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                In your app dashboard, find &quot;Add Products&quot; and click &quot;Set Up&quot; on WhatsApp.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">4</div>
                                        <div>
                                            <h5 className="font-medium">Configure WhatsApp Business</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Select or create a Meta Business Account, then add a phone number for WhatsApp.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">5</div>
                                        <div>
                                            <h5 className="font-medium">Verify Phone Number</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Enter your business phone number and verify via SMS or voice call.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-green-50 border-green-200">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">6</div>
                                        <div>
                                            <h5 className="font-medium text-green-900">Connect to Our Platform</h5>
                                            <p className="text-sm text-green-800 mt-1">
                                                Use Embedded Signup or Manual Configuration to connect your WhatsApp account here.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="credentials" className="space-y-4 mt-4">
                                <div className="rounded-lg border p-4 bg-amber-50 border-amber-200">
                                    <h4 className="font-semibold text-amber-900 mb-2">Where to Find Your Credentials</h4>
                                    <p className="text-sm text-amber-800">
                                        All credentials can be found in your Meta Developer Dashboard under WhatsApp → API Setup.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="rounded-lg border p-3">
                                        <h5 className="font-medium flex items-center gap-2">
                                            <Settings2 className="h-4 w-4 text-primary" />
                                            Phone Number ID
                                        </h5>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Found in WhatsApp → API Setup → Phone Number ID section. It&apos;s a numeric ID like &quot;123456789012345&quot;.
                                        </p>
                                    </div>

                                    <div className="rounded-lg border p-3">
                                        <h5 className="font-medium flex items-center gap-2">
                                            <Settings2 className="h-4 w-4 text-primary" />
                                            Access Token
                                        </h5>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Generate a permanent token in Business Settings → System Users → Add Assets → Apps → Generate Token.
                                            Select whatsapp_business_messaging and whatsapp_business_management permissions.
                                        </p>
                                    </div>

                                    <div className="rounded-lg border p-3">
                                        <h5 className="font-medium flex items-center gap-2">
                                            <Settings2 className="h-4 w-4 text-primary" />
                                            Business Account ID (Optional)
                                        </h5>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Found in WhatsApp → API Setup → WhatsApp Business Account ID. Used for advanced features.
                                        </p>
                                    </div>
                                </div>

                                <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
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
                            onClick={() => setStep('embedded')}
                        >
                            <div className="font-semibold text-base mb-1">Embedded Signup (Recommended)</div>
                            <div className="text-sm text-muted-foreground text-left font-normal">
                                Quick setup through Meta&apos;s official flow. Grants all necessary permissions automatically.
                            </div>
                        </Button>

                        <Button
                            className="w-full h-auto py-6 flex-col items-start"
                            variant="outline"
                            onClick={() => setStep('manual')}
                        >
                            <div className="font-semibold text-base mb-1">Manual Configuration</div>
                            <div className="text-sm text-muted-foreground text-left font-normal">
                                For advanced users. Requires you to have a WhatsApp Business API token.
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

                {step === 'embedded' && (
                    <div className="space-y-4">
                        <div className="rounded-lg border p-4 bg-muted/50">
                            <h4 className="font-medium mb-2">Configuration Required:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Set <code className="bg-muted px-1 rounded">NEXT_PUBLIC_META_APP_ID</code> in .env.local</li>
                                <li>Set <code className="bg-muted px-1 rounded">NEXT_PUBLIC_META_CONFIG_ID</code> in .env.local</li>
                                <li>Restart development server after adding variables</li>
                            </ul>
                        </div>

                        <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
                            <h4 className="font-medium mb-2 text-blue-900">What you&apos;ll need from Meta:</h4>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                <li>A Meta Business Account</li>
                                <li>Admin access to your WhatsApp Business Account</li>
                                <li>Phone number to verify</li>
                            </ul>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleEmbeddedSignup} disabled={loading} className="flex-1">
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Connect with Meta
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
                        <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
                            <p className="text-sm text-blue-800">
                                <strong>Need help?</strong>{' '}
                                <Button variant="link" className="p-0 h-auto text-blue-800 underline" onClick={() => setStep('guide')}>
                                    View the integration guide
                                </Button>{' '}
                                to learn where to find these credentials.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="wa-name">Channel Name *</Label>
                            <Input
                                id="wa-name"
                                placeholder="e.g., Main WhatsApp"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="wa-phone-id">Phone Number ID *</Label>
                            <Input
                                id="wa-phone-id"
                                placeholder="From Meta Business Manager"
                                value={formData.phoneNumberId}
                                onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="wa-token">Access Token *</Label>
                            <Input
                                id="wa-token"
                                type="password"
                                placeholder="Your WhatsApp API token"
                                value={formData.accessToken}
                                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="wa-business-id">Business Account ID (Optional)</Label>
                            <Input
                                id="wa-business-id"
                                placeholder="WhatsApp Business Account ID"
                                value={formData.businessAccountId}
                                onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleManualConnect} disabled={loading} className="flex-1">
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    'Connect'
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
