'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Mail, CheckCircle } from 'lucide-react';
import { channelsApi } from '@/lib/api';

interface EmailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EmailModal({ open, onOpenChange, onSuccess }: EmailModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'choice' | 'gmail' | 'microsoft' | 'smtp'>('choice');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        smtpHost: '',
        smtpPort: '587',
        imapHost: '',
        imapPort: '993',
    });



    const handleSmtpConnect = async () => {
        if (!formData.name || !formData.email || !formData.password || !formData.smtpHost) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await channelsApi.createChannel({
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
            });

            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (err: any) {
            console.error('Email connection error:', err);

            // Extract error message from Axios response
            const data = err.response?.data;
            const status = err.response?.status;
            let errorMessage = 'Failed to connect email account';

            if (status === 401) {
                errorMessage = '⚠️ Authentication Failed\n\nYou need to be logged in to connect channels. Please log in and try again.';
            } else if (status === 403) {
                errorMessage = '⚠️ Permission Denied\n\nYou don\'t have permission to add channels. Please contact your administrator.';
            } else if (data?.message) {
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
                    errorMessage = '❌ Connection Failed\n\n' + data.message;
                }
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
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
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Connect Email Account</DialogTitle>
                    <DialogDescription>
                        {step === 'choice'
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

                {step === 'choice' && (
                    <div className="space-y-4">
                        <Button
                            className="w-full h-auto py-6 flex-col items-start"
                            variant="outline"
                            onClick={() => setStep('gmail')}
                        >
                            <div className="font-semibold text-base mb-1">Gmail OAuth (Coming Soon)</div>
                            <div className="text-sm text-muted-foreground text-left font-normal">
                                One-click connection through Google. Most secure for Gmail accounts.
                            </div>
                        </Button>

                        <Button
                            className="w-full h-auto py-6 flex-col items-start"
                            variant="outline"
                            onClick={() => setStep('microsoft')}
                        >
                            <div className="font-semibold text-base mb-1">Microsoft OAuth (Coming Soon)</div>
                            <div className="text-sm text-muted-foreground text-left font-normal">
                                One-click connection for Outlook, Office 365, and Hotmail accounts.
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
                    </div>
                )}

                {step === 'gmail' && (
                    <div className="space-y-4">
                        <div className="rounded-lg border p-4 bg-yellow-50 border-yellow-200">
                            <h4 className="font-medium mb-2 text-yellow-900">Coming Soon</h4>
                            <p className="text-sm text-yellow-800">
                                Gmail OAuth integration is currently under development. For now, please use SMTP/IMAP configuration with a Gmail App Password.
                            </p>
                        </div>

                        <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
                            <h4 className="font-medium mb-2 text-blue-900">How to get Gmail App Password:</h4>
                            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                                <li>Enable 2-Step Verification in Google Account</li>
                                <li>Go to Security → App Passwords</li>
                                <li>Generate new app password for "Mail"</li>
                                <li>Use this password in SMTP/IMAP config</li>
                            </ol>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep('smtp')} className="flex-1">
                                <Mail className="mr-2 h-4 w-4" />
                                Use SMTP/IMAP Instead
                            </Button>
                            <Button variant="outline" onClick={() => setStep('choice')}>
                                Back
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'microsoft' && (
                    <div className="space-y-4">
                        <div className="rounded-lg border p-4 bg-yellow-50 border-yellow-200">
                            <h4 className="font-medium mb-2 text-yellow-900">Coming Soon</h4>
                            <p className="text-sm text-yellow-800">
                                Microsoft OAuth integration is currently under development. For now, please use SMTP/IMAP configuration.
                            </p>
                        </div>

                        <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
                            <h4 className="font-medium mb-2 text-blue-900">Outlook/Office 365 Settings:</h4>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                <li>SMTP: smtp.office365.com:587</li>
                                <li>IMAP: outlook.office365.com:993</li>
                                <li>Use your full email and password</li>
                            </ul>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep('smtp')} className="flex-1">
                                <Mail className="mr-2 h-4 w-4" />
                                Use SMTP/IMAP Instead
                            </Button>
                            <Button variant="outline" onClick={() => setStep('choice')}>
                                Back
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'smtp' && (
                    <div className="space-y-4">
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
