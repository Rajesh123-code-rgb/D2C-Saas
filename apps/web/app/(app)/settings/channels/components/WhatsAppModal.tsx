'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

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
    const [step, setStep] = useState<'choice' | 'manual' | 'embedded'>('choice');
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

            // Variables to store data from both events
            let authCode: string | null = null;
            let wabaData: { wabaId: string; phoneNumberId: string } | null = null;
            let loginCompleted = false;

            // Set up listener for WA_EMBEDDED_SIGNUP message event
            const handleMessage = (event: MessageEvent) => {
                console.log('Received message event:', event.data);

                // Check if this is the WhatsApp embedded signup event
                if (event.data?.type === 'WA_EMBEDDED_SIGNUP') {
                    const data = event.data.data || event.data;
                    console.log('WA_EMBEDDED_SIGNUP data:', data);

                    wabaData = {
                        wabaId: data.waba_id || data.wabaId || '',
                        phoneNumberId: data.phone_number_id || data.phoneNumberId || ''
                    };

                    console.log('Captured WABA data:', wabaData);

                    // If we already have the auth code, proceed with exchange
                    if (authCode && loginCompleted) {
                        window.removeEventListener('message', handleMessage);
                        handleCodeExchangeWithWabaData(authCode, wabaData);
                    }
                }
            };

            window.addEventListener('message', handleMessage);

            window.FB.login((response: any) => {
                console.log('FB.login response:', response);
                loginCompleted = true;

                if (response.authResponse) {
                    authCode = response.authResponse.code;
                    console.log('Received authorization code');

                    // Check if we have WABA data from the message event
                    if (wabaData) {
                        window.removeEventListener('message', handleMessage);
                        handleCodeExchangeWithWabaData(authCode!, wabaData);
                    } else {
                        // Wait a bit for the message event to arrive
                        console.log('Waiting for WA_EMBEDDED_SIGNUP event...');
                        setTimeout(() => {
                            window.removeEventListener('message', handleMessage);
                            if (wabaData) {
                                handleCodeExchangeWithWabaData(authCode!, wabaData);
                            } else {
                                // Still no WABA data, try without it (will use API fallback)
                                console.log('No WABA data received, proceeding with code only');
                                handleCodeExchange(authCode!);
                            }
                        }, 2000);
                    }
                } else {
                    console.error('No auth response:', response);
                    window.removeEventListener('message', handleMessage);
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

    const handleCodeExchangeWithWabaData = async (code: string, wabaData: { wabaId: string; phoneNumberId: string }) => {
        try {
            console.log('Exchanging code with WABA data:', { wabaId: wabaData.wabaId, phoneNumberId: wabaData.phoneNumberId });

            const response = await fetch('/api/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelType: 'whatsapp',
                    name: 'WhatsApp Business',
                    credentials: {
                        authCode: code,
                        wabaId: wabaData.wabaId,
                        phoneNumberId: wabaData.phoneNumberId
                    },
                }),
            });

            if (!response.ok) {
                let errorMessage = 'Failed to connect WhatsApp';
                try {
                    const data = await response.json();
                    errorMessage = data.message || errorMessage;
                } catch (e) {
                    // Keep default message
                }
                throw new Error(errorMessage);
            }

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (err: any) {
            setError(err.message || 'Failed to connect WhatsApp');
        } finally {
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

            if (!response.ok) {
                let errorMessage = 'Failed to connect WhatsApp';
                try {
                    const data = await response.json();
                    errorMessage = data.message || errorMessage;
                } catch (e) {
                    // Keep default message
                }
                throw new Error(errorMessage);
            }

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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Connect WhatsApp Business</DialogTitle>
                    <DialogDescription>
                        Choose how you want to connect your WhatsApp Business account
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
                            onClick={() => setStep('embedded')}
                        >
                            <div className="font-semibold text-base mb-1">Embedded Signup (Recommended)</div>
                            <div className="text-sm text-muted-foreground text-left font-normal">
                                Quick setup through Meta's official flow. Grants all necessary permissions automatically.
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
                            <h4 className="font-medium mb-2 text-blue-900">What you'll need from Meta:</h4>
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
