'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, Mail, CheckCircle, ExternalLink, BookOpen, Settings2, HelpCircle, ArrowRight, Shield, Key } from 'lucide-react';

interface EmailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EmailModal({ open, onOpenChange, onSuccess }: EmailModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'choice' | 'gmail' | 'microsoft' | 'smtp' | 'guide'>('choice');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        smtpHost: '',
        smtpPort: '587',
        imapHost: '',
        imapPort: '993',
    });

    const handleGmailOAuth = () => {
        // Get tenant ID from session/cookies or use current user's tenant
        const tenantId = localStorage.getItem('tenantId') || 'default';

        // Use backend API URL for OAuth
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        // Open OAuth popup
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
            `${apiUrl}/api/v1/email/oauth/gmail/authorize?tenantId=${tenantId}`,
            'Gmail OAuth',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for OAuth completion
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'oauth-success') {
                window.removeEventListener('message', handleMessage);
                onSuccess();
                onOpenChange(false);
            } else if (event.data.type === 'oauth-error') {
                window.removeEventListener('message', handleMessage);
                setError(event.data.message || 'OAuth failed');
            }
        };

        window.addEventListener('message', handleMessage);
    };

    const handleSmtpConnect = async () => {
        if (!formData.name || !formData.email || !formData.password || !formData.smtpHost) {
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
                    channelType: 'email',
                    name: formData.name,
                    credentials: {
                        email: formData.email,
                        password: formData.password,
                        smtpHost: formData.smtpHost,
                        smtpPort: parseInt(formData.smtpPort),
                        imapHost: formData.imapHost || formData.smtpHost,
                        imapPort: parseInt(formData.imapPort),
                    },
                }),
            });

            if (!response.ok) {
                // Parse error response
                let errorMessage = 'Failed to connect email account';

                try {
                    const data = await response.json();

                    // Handle specific error types
                    if (response.status === 401) {
                        errorMessage = '⚠️ Authentication Failed\n\nYou need to be logged in to connect channels. Please log in and try again.';
                    } else if (response.status === 403) {
                        errorMessage = '⚠️ Permission Denied\n\nYou don\'t have permission to add channels. Please contact your administrator.';
                    } else if (data.message) {
                        const msg = data.message.toLowerCase();

                        // SMTP/IMAP connection errors
                        if (msg.includes('etimedout') || msg.includes('timeout')) {
                            errorMessage = '❌ Connection Timeout\n\nCouldn\'t reach the email server. Please check:\n• SMTP/IMAP host address is correct\n• Port numbers are correct (587 for SMTP, 993 for IMAP)\n• Your firewall allows outgoing connections\n• The email server is online';
                        } else if (msg.includes('econnrefused') || msg.includes('connection refused')) {
                            errorMessage = '❌ Connection Refused\n\nThe email server rejected the connection. Please verify:\n• SMTP host: ' + formData.smtpHost + '\n• SMTP port: ' + formData.smtpPort + '\n• Server is accepting connections on this port';
                        } else if (msg.includes('authentication failed') || msg.includes('invalid credentials')) {
                            errorMessage = '❌ Authentication Failed\n\nEmail or password is incorrect. For Gmail users:\n• Enable 2-Step Verification in Google Account\n• Generate an App Password (not your regular password)\n• Use the App Password in the password field\n\nFor other providers, verify your email and password are correct.';
                        } else if (msg.includes('unauthorized') || msg.includes('auth')) {
                            errorMessage = '⚠️ Login Required\n\nPlease log in to your account first, then try connecting your email.';
                        } else if (msg.includes('tls') || msg.includes('ssl')) {
                            errorMessage = '❌ Secure Connection Error\n\nCouldn\'t establish a secure connection. Try:\n• Port 587 with STARTTLS for SMTP\n• Port 993 with SSL/TLS for IMAP\n• Check if your email provider requires SSL/TLS';
                        } else {
                            // Use backend error message
                            errorMessage = '❌ Connection Failed\n\n' + data.message;
                        }
                    }
                } catch (parseError) {
                    // If JSON parsing fails, use status-based message
                    if (response.status === 401) {
                        errorMessage = '⚠️ Please log in to connect channels';
                    } else if (response.status >= 500) {
                        errorMessage = '❌ Server Error\n\nThe server encountered an error. Please try again later.';
                    }
                }

                throw new Error(errorMessage);
            }

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (err: any) {
            console.error('Email connection error:', err);

            // Handle network errors
            if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
                setError('❌ Network Error\n\nCouldn\'t connect to the server. Please check:\n• Your internet connection\n• The application server is running\n• Try refreshing the page');
            } else {
                setError(err.message || '❌ Failed to connect email account\n\nPlease check your settings and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            smtpHost: '',
            smtpPort: '587',
            imapHost: '',
            imapPort: '993',
        });
        setStep('choice');
        setError('');
        setLoading(false);
    };

    const applyPreset = (preset: 'gmail' | 'outlook') => {
        if (preset === 'gmail') {
            setFormData({
                ...formData,
                smtpHost: 'smtp.gmail.com',
                smtpPort: '587',
                imapHost: 'imap.gmail.com',
                imapPort: '993',
            });
        } else if (preset === 'outlook') {
            setFormData({
                ...formData,
                smtpHost: 'smtp.office365.com',
                smtpPort: '587',
                imapHost: 'outlook.office365.com',
                imapPort: '993',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Connect Email Account
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
                            ? 'Step-by-step guide to connect your email account'
                            : step === 'choice'
                                ? 'Choose how you want to connect your email account'
                                : 'Configure your email settings'}
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
                                <TabsTrigger value="gmail">Gmail Setup</TabsTrigger>
                                <TabsTrigger value="outlook">Outlook Setup</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-4 mt-4">
                                <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
                                    <h4 className="font-semibold text-blue-900 mb-2">Email Integration</h4>
                                    <p className="text-sm text-blue-800">
                                        Connect your email accounts via SMTP/IMAP to send and receive emails directly from
                                        our platform. Supports Gmail, Outlook, Office 365, and any custom email server.
                                    </p>
                                </div>

                                <div className="rounded-lg border p-4">
                                    <h4 className="font-semibold mb-3">Connection Methods</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-start gap-2">
                                            <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong>OAuth:</strong> One-click connection for Gmail accounts.
                                                Most secure, tokens auto-refresh.
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Key className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong>SMTP/IMAP (Available):</strong> Manual configuration using server settings
                                                and app passwords. Works with all email providers.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border p-4">
                                    <h4 className="font-semibold mb-3">Common Server Settings</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="font-medium text-red-600 mb-1">Gmail</p>
                                            <p>SMTP: smtp.gmail.com:587</p>
                                            <p>IMAP: imap.gmail.com:993</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-blue-600 mb-1">Outlook/Office 365</p>
                                            <p>SMTP: smtp.office365.com:587</p>
                                            <p>IMAP: outlook.office365.com:993</p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="gmail" className="space-y-4 mt-4">
                                <div className="rounded-lg border p-4 bg-red-50 border-red-200">
                                    <h4 className="font-semibold text-red-900 mb-2">⚠️ Important: App Password Required</h4>
                                    <p className="text-sm text-red-800">
                                        Gmail does NOT allow using your regular password for third-party apps.
                                        You MUST create an App Password following the steps below.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</div>
                                        <div>
                                            <h5 className="font-medium">Enable 2-Step Verification</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Go to your Google Account → Security → 2-Step Verification → Turn On.
                                            </p>
                                            <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer"
                                                className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1">
                                                Open Google Security <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</div>
                                        <div>
                                            <h5 className="font-medium">Generate App Password</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Go to Google Account → Security → App Passwords. Select &quot;Mail&quot; and your device, then click Generate.
                                            </p>
                                            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer"
                                                className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1">
                                                Generate App Password <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</div>
                                        <div>
                                            <h5 className="font-medium">Copy the 16-character Password</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Google will show a 16-character password (e.g., abcd efgh ijkl mnop).
                                                Copy this and use it as your password here.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-green-50 border-green-200">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">4</div>
                                        <div>
                                            <h5 className="font-medium text-green-900">Configure in Our Platform</h5>
                                            <p className="text-sm text-green-800 mt-1">
                                                Use SMTP/IMAP config with Gmail preset. Enter your Gmail address and the App Password.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border p-3">
                                    <h5 className="font-medium flex items-center gap-2">
                                        <Settings2 className="h-4 w-4 text-primary" />
                                        Gmail Server Settings
                                    </h5>
                                    <div className="mt-2 text-sm text-muted-foreground grid grid-cols-2 gap-2">
                                        <div>
                                            <p><strong>SMTP Host:</strong> smtp.gmail.com</p>
                                            <p><strong>SMTP Port:</strong> 587 (TLS)</p>
                                        </div>
                                        <div>
                                            <p><strong>IMAP Host:</strong> imap.gmail.com</p>
                                            <p><strong>IMAP Port:</strong> 993 (SSL)</p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="outlook" className="space-y-4 mt-4">
                                <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
                                    <h4 className="font-semibold text-blue-900 mb-2">Outlook/Office 365 Setup</h4>
                                    <p className="text-sm text-blue-800">
                                        For most Outlook.com and Office 365 accounts, you can use your regular password.
                                        Some accounts with MFA may require an app password.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</div>
                                        <div>
                                            <h5 className="font-medium">Check Your Account Security</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Go to Microsoft Account → Security. If you have MFA enabled, you may need an app password.
                                            </p>
                                            <a href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer"
                                                className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1">
                                                Microsoft Security <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</div>
                                        <div>
                                            <h5 className="font-medium">For MFA Accounts: Create App Password</h5>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Security → Advanced Security Options → App Passwords → Create a new app password.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-blue-50 border-blue-200">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">3</div>
                                        <div>
                                            <h5 className="font-medium text-blue-900">Configure in Our Platform</h5>
                                            <p className="text-sm text-blue-800 mt-1">
                                                Use SMTP/IMAP config with Outlook preset. Enter your email and password (or app password).
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border p-3">
                                    <h5 className="font-medium flex items-center gap-2">
                                        <Settings2 className="h-4 w-4 text-primary" />
                                        Outlook/Office 365 Server Settings
                                    </h5>
                                    <div className="mt-2 text-sm text-muted-foreground grid grid-cols-2 gap-2">
                                        <div>
                                            <p><strong>SMTP Host:</strong> smtp.office365.com</p>
                                            <p><strong>SMTP Port:</strong> 587 (TLS)</p>
                                        </div>
                                        <div>
                                            <p><strong>IMAP Host:</strong> outlook.office365.com</p>
                                            <p><strong>IMAP Port:</strong> 993 (SSL)</p>
                                        </div>
                                    </div>
                                </div>
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
                            onClick={handleGmailOAuth}
                        >
                            <div className="font-semibold text-base mb-1">Gmail OAuth</div>
                            <div className="text-sm text-muted-foreground text-left font-normal">
                                One-click connection through Google. Most secure for Gmail accounts.
                            </div>
                        </Button>


                        <Button
                            className="w-full h-auto py-6 flex-col items-start"
                            variant="outline"
                            onClick={() => setStep('smtp')}
                        >
                            <div className="font-semibold text-base mb-1">SMTP/IMAP Configuration (Available Now)</div>
                            <div className="text-sm text-muted-foreground text-left font-normal">
                                Manual setup for any email provider. Works with Gmail, Outlook, and custom domains.
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





                {step === 'smtp' && (
                    <div className="space-y-4">
                        <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
                            <p className="text-sm text-blue-800">
                                <strong>Need help?</strong>{' '}
                                <Button variant="link" className="p-0 h-auto text-blue-800 underline" onClick={() => setStep('guide')}>
                                    View the integration guide
                                </Button>{' '}
                                for Gmail App Password instructions or Outlook settings.
                            </p>
                        </div>

                        {/* Presets */}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => applyPreset('gmail')}
                                className="flex-1"
                            >
                                Gmail Preset
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => applyPreset('outlook')}
                                className="flex-1"
                            >
                                Outlook Preset
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email-name">Channel Name *</Label>
                            <Input
                                id="email-name"
                                placeholder="e.g., Support Email"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email-address">Email Address *</Label>
                            <Input
                                id="email-address"
                                type="email"
                                placeholder="support@company.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email-password">Password / App Password *</Label>
                            <Input
                                id="email-password"
                                type="password"
                                placeholder="Your email password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                For Gmail, use an App Password instead of your account password
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="smtp-host">SMTP Host *</Label>
                                <Input
                                    id="smtp-host"
                                    placeholder="smtp.gmail.com"
                                    value={formData.smtpHost}
                                    onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="smtp-port">SMTP Port *</Label>
                                <Input
                                    id="smtp-port"
                                    placeholder="587"
                                    value={formData.smtpPort}
                                    onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="imap-host">IMAP Host</Label>
                                <Input
                                    id="imap-host"
                                    placeholder="imap.gmail.com"
                                    value={formData.imapHost}
                                    onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="imap-port">IMAP Port</Label>
                                <Input
                                    id="imap-port"
                                    placeholder="993"
                                    value={formData.imapPort}
                                    onChange={(e) => setFormData({ ...formData, imapPort: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleSmtpConnect} disabled={loading} className="flex-1">
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Connect Email
                                    </>
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
