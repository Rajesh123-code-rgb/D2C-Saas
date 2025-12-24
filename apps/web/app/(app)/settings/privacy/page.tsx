'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Shield,
    Download,
    Trash2,
    UserX,
    FileText,
    AlertTriangle,
    Check,
    Search,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PrivacyPage() {
    const [contactId, setContactId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleExport = async () => {
        if (!contactId) {
            setResult({ type: 'error', message: 'Please enter a contact ID' });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/gdpr/export/${contactId}?tenantId=demo&userId=admin`);
            if (response.ok) {
                const data = await response.json();
                // Download as JSON
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gdpr-export-${contactId}.json`;
                a.click();
                URL.revokeObjectURL(url);
                setResult({ type: 'success', message: 'Data exported successfully' });
            } else {
                setResult({ type: 'error', message: 'Contact not found' });
            }
        } catch (error) {
            setResult({ type: 'error', message: 'Export failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleAnonymize = async () => {
        if (!contactId) {
            setResult({ type: 'error', message: 'Please enter a contact ID' });
            return;
        }

        if (!confirm('Are you sure you want to anonymize this contact? This cannot be undone.')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/gdpr/anonymize/${contactId}?tenantId=demo&userId=admin`, {
                method: 'POST',
            });
            if (response.ok) {
                setResult({ type: 'success', message: 'Contact data anonymized successfully' });
            } else {
                setResult({ type: 'error', message: 'Contact not found' });
            }
        } catch (error) {
            setResult({ type: 'error', message: 'Anonymization failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!contactId) {
            setResult({ type: 'error', message: 'Please enter a contact ID' });
            return;
        }

        if (!confirm('Are you sure you want to permanently delete all data for this contact? This cannot be undone!')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/gdpr/delete/${contactId}?tenantId=demo&userId=admin`, {
                method: 'POST',
            });
            if (response.ok) {
                setResult({ type: 'success', message: 'Contact data deleted permanently' });
                setContactId('');
            } else {
                setResult({ type: 'error', message: 'Contact not found' });
            }
        } catch (error) {
            setResult({ type: 'error', message: 'Deletion failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Privacy & GDPR</h1>
                <p className="text-muted-foreground">Manage data privacy and GDPR compliance</p>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-blue-100">
                                <Download className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold">Data Export</h4>
                                <p className="text-sm text-muted-foreground">Export all contact data</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-yellow-100">
                                <UserX className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold">Anonymization</h4>
                                <p className="text-sm text-muted-foreground">Remove personal identifiers</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-red-100">
                                <Trash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold">Data Deletion</h4>
                                <p className="text-sm text-muted-foreground">Right to be forgotten</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* GDPR Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        GDPR Data Subject Request
                    </CardTitle>
                    <CardDescription>
                        Process data export, anonymization, or deletion requests for a specific contact
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Contact ID Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Contact ID</label>
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Enter contact ID (UUID)"
                                    className="pl-10"
                                    value={contactId}
                                    onChange={(e) => setContactId(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Result Message */}
                    {result && (
                        <div className={cn(
                            'flex items-center gap-2 p-4 rounded-lg',
                            result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        )}>
                            {result.type === 'success' ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                            {result.message}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Button
                            onClick={handleExport}
                            disabled={loading || !contactId}
                            className="h-auto py-4 flex-col gap-2"
                            variant="outline"
                        >
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6" />}
                            <span className="font-semibold">Export Data</span>
                            <span className="text-xs text-muted-foreground">Download all data as JSON</span>
                        </Button>

                        <Button
                            onClick={handleAnonymize}
                            disabled={loading || !contactId}
                            className="h-auto py-4 flex-col gap-2"
                            variant="outline"
                        >
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UserX className="h-6 w-6" />}
                            <span className="font-semibold">Anonymize</span>
                            <span className="text-xs text-muted-foreground">Remove personal identifiers</span>
                        </Button>

                        <Button
                            onClick={handleDelete}
                            disabled={loading || !contactId}
                            className="h-auto py-4 flex-col gap-2 border-red-200 hover:bg-red-50"
                            variant="outline"
                        >
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Trash2 className="h-6 w-6 text-red-600" />}
                            <span className="font-semibold text-red-600">Delete Data</span>
                            <span className="text-xs text-muted-foreground">Permanent deletion</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Data Retention Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Data Retention Policy
                    </CardTitle>
                    <CardDescription>
                        Configure how long data is retained before automatic deletion
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b">
                            <div>
                                <p className="font-medium">Messages</p>
                                <p className="text-sm text-muted-foreground">Conversation messages</p>
                            </div>
                            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option>Forever</option>
                                <option>1 Year</option>
                                <option>6 Months</option>
                                <option>90 Days</option>
                                <option>30 Days</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b">
                            <div>
                                <p className="font-medium">Audit Logs</p>
                                <p className="text-sm text-muted-foreground">Activity history</p>
                            </div>
                            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option>1 Year</option>
                                <option>6 Months</option>
                                <option>90 Days</option>
                                <option>30 Days</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <p className="font-medium">Abandoned Carts</p>
                                <p className="text-sm text-muted-foreground">E-commerce cart data</p>
                            </div>
                            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option>90 Days</option>
                                <option>30 Days</option>
                                <option>14 Days</option>
                            </select>
                        </div>
                        <Button className="mt-4">Save Retention Settings</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
