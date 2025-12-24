'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmailComposerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    defaultTo?: string;
    defaultSubject?: string;
}

export function EmailComposer({
    open,
    onOpenChange,
    onSuccess,
    defaultTo = '',
    defaultSubject = '',
}: EmailComposerProps) {
    const [to, setTo] = useState(defaultTo);
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState('');
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSend = async () => {
        if (!to || !subject || !body) {
            setError('Please fill in recipient, subject, and message body');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Get email channel
            const channelsResponse = await fetch('/api/v1/channels?type=email', {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!channelsResponse.ok) {
                throw new Error('No email channel configured. Please connect an email account first.');
            }

            const channelsData = await channelsResponse.json();
            const emailChannel = channelsData.channels?.[0];

            if (!emailChannel) {
                throw new Error('No email channel found. Please connect an email account first.');
            }

            // Send email via API
            const response = await fetch('/api/v1/channels/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channelId: emailChannel.id,
                    to: to.split(',').map(e => e.trim()),
                    cc: cc ? cc.split(',').map(e => e.trim()) : undefined,
                    bcc: bcc ? bcc.split(',').map(e => e.trim()) : undefined,
                    subject,
                    html: body,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to send email');
            }

            setSuccess('Email sent successfully!');

            // Reset form
            setTimeout(() => {
                setTo('');
                setCc('');
                setBcc('');
                setSubject('');
                setBody('');
                setAttachments([]);
                onOpenChange(false);
                if (onSuccess) onSuccess();
            }, 1500);

        } catch (err: any) {
            setError(err.message || 'Failed to send email');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments([...attachments, ...Array.from(e.target.files)]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Compose Email</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="bg-green-50 text-green-900 border-green-200">
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {/* To Field */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="to" className="w-12">To:</Label>
                            <Input
                                id="to"
                                placeholder="recipient@example.com (separate multiple with commas)"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="flex-1"
                            />
                            <div className="flex gap-2">
                                {!showCc && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowCc(true)}
                                    >
                                        Cc
                                    </Button>
                                )}
                                {!showBcc && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowBcc(true)}
                                    >
                                        Bcc
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CC Field */}
                    {showCc && (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="cc" className="w-12">Cc:</Label>
                            <Input
                                id="cc"
                                placeholder="cc@example.com"
                                value={cc}
                                onChange={(e) => setCc(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowCc(false);
                                    setCc('');
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* BCC Field */}
                    {showBcc && (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="bcc" className="w-12">Bcc:</Label>
                            <Input
                                id="bcc"
                                placeholder="bcc@example.com"
                                value={bcc}
                                onChange={(e) => setBcc(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowBcc(false);
                                    setBcc('');
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Subject */}
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject:</Label>
                        <Input
                            id="subject"
                            placeholder="Email subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    {/* Body */}
                    <div className="space-y-2">
                        <Label>Message:</Label>
                        <RichTextEditor
                            value={body}
                            onChange={setBody}
                            placeholder="Compose your email..."
                            height="400px"
                        />
                    </div>

                    {/* Attachments */}
                    {attachments.length > 0 && (
                        <div className="space-y-2">
                            <Label>Attachments:</Label>
                            <div className="flex flex-wrap gap-2">
                                {attachments.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
                                    >
                                        <Paperclip className="h-3 w-3" />
                                        <span>{file.name}</span>
                                        <button
                                            onClick={() => removeAttachment(index)}
                                            className="hover:text-red-600"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex items-center justify-between">
                    <div>
                        <input
                            type="file"
                            id="attachments"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('attachments')?.click()}
                        >
                            <Paperclip className="mr-2 h-4 w-4" />
                            Attach Files
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSend} disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Email
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
