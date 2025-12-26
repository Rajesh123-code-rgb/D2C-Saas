'use client';

import { useEffect, useState } from 'react';
import {
    MessageSquare,
    Mail,
    Plus,
    Search,
    RefreshCw,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    Clock,
    XCircle,
    Loader2,
    Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RichTextEditor } from '@/components/RichTextEditor';
import { cn } from '@/lib/utils';

// Types
interface WhatsAppTemplate {
    id: string;
    name: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
    category: string;
    language: string;
    components: any[];
}

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    category: string;
    createdAt: string;
    updatedAt: string;
}

export default function TemplatesPage() {
    const [activeTab, setActiveTab] = useState<'whatsapp' | 'email'>('whatsapp');
    const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Fetch templates
    useEffect(() => {
        const fetchTemplates = async () => {
            setLoading(true);
            try {
                if (activeTab === 'whatsapp') {
                    const response = await fetch('/api/templates/whatsapp');
                    if (response.ok) {
                        const data = await response.json();
                        setWhatsappTemplates(data.templates || data.data || []);
                    }
                } else {
                    const response = await fetch('/api/templates/email');
                    if (response.ok) {
                        const data = await response.json();
                        setEmailTemplates(data.templates || data || []);
                    }
                }
            } catch (error) {
                console.error('Error fetching templates:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTemplates();
    }, [activeTab]);

    // Sync WhatsApp templates from Meta
    const handleSyncTemplates = async () => {
        setSyncing(true);
        try {
            const response = await fetch('/api/templates/whatsapp/sync', { method: 'POST' });
            if (response.ok) {
                // Refetch templates
                const data = await fetch('/api/templates/whatsapp');
                if (data.ok) {
                    const templates = await data.json();
                    setWhatsappTemplates(templates.templates || templates.data || []);
                }
            }
        } catch (error) {
            console.error('Error syncing templates:', error);
        } finally {
            setSyncing(false);
        }
    };

    // Filter templates
    const filteredWhatsappTemplates = whatsappTemplates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredEmailTemplates = emailTemplates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );



    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Templates</h1>
                    <p className="text-muted-foreground">Manage your WhatsApp and Email templates</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b">
                <button
                    onClick={() => setActiveTab('whatsapp')}
                    className={cn(
                        'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors',
                        activeTab === 'whatsapp'
                            ? 'border-green-500 text-green-600'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp Templates
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-muted text-xs">
                        {whatsappTemplates.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('email')}
                    className={cn(
                        'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors',
                        activeTab === 'email'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    <Mail className="h-4 w-4" />
                    Email Templates
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-muted text-xs">
                        {emailTemplates.length}
                    </span>
                </button>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search templates..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {activeTab === 'whatsapp' && (
                    <Button variant="outline" onClick={handleSyncTemplates} disabled={syncing}>
                        <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
                        {syncing ? 'Syncing...' : 'Sync from Meta'}
                    </Button>
                )}
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : activeTab === 'whatsapp' ? (
                /* WhatsApp Templates */
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredWhatsappTemplates.length > 0 ? (
                        filteredWhatsappTemplates.map((template) => (
                            <WhatsAppTemplateCard key={template.id} template={template} />
                        ))
                    ) : (
                        <EmptyState
                            icon={MessageSquare}
                            title="No WhatsApp Templates"
                            description="Create your first WhatsApp template or sync from Meta"
                            action={
                                <div className="flex gap-2">
                                    <Button onClick={handleSyncTemplates} variant="outline" disabled={syncing}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Sync from Meta
                                    </Button>
                                    <Button onClick={() => setShowCreateModal(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Template
                                    </Button>
                                </div>
                            }
                        />
                    )}
                </div>
            ) : (
                /* Email Templates */
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredEmailTemplates.length > 0 ? (
                        filteredEmailTemplates.map((template) => (
                            <EmailTemplateCard key={template.id} template={template} />
                        ))
                    ) : (
                        <EmptyState
                            icon={Mail}
                            title="No Email Templates"
                            description="Create your first email template to use in campaigns"
                            action={
                                <Button onClick={() => setShowCreateModal(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Template
                                </Button>
                            }
                        />
                    )}
                </div>
            )}

            {/* Create Template Modal */}
            {showCreateModal && (
                <CreateTemplateModal
                    type={activeTab}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        // Refetch templates
                        if (activeTab === 'whatsapp') {
                            handleSyncTemplates();
                        } else {
                            fetch('/api/templates/email')
                                .then(r => r.json())
                                .then(data => setEmailTemplates(data.templates || data || []));
                        }
                    }}
                />
            )}
        </div>
    );
}

// WhatsApp Template Card
function WhatsAppTemplateCard({ template }: { template: WhatsAppTemplate }) {
    const [showPreview, setShowPreview] = useState(false);

    // Extract body text from components
    const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
    const bodyText = bodyComponent?.text || 'No content';

    return (
        <>
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-green-100">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <span className="text-xs">{template.category}</span>
                                    <span className="text-xs">•</span>
                                    <span className="text-xs">{template.language}</span>
                                </CardDescription>
                            </div>
                        </div>
                        <StatusBadge status={template.status} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {bodyText}
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}>
                            <Eye className="mr-1 h-3 w-3" />
                            Preview
                        </Button>
                        <Button size="sm" variant="ghost">
                            <Copy className="mr-1 h-3 w-3" />
                            Duplicate
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Preview Modal */}
            {showPreview && (
                <TemplatePreviewModal
                    type="whatsapp"
                    template={template}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </>
    );
}

// Email Template Card
function EmailTemplateCard({ template }: { template: EmailTemplate }) {
    const [showPreview, setShowPreview] = useState(false);

    return (
        <>
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-blue-100">
                                <Mail className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                    {template.category}
                                </CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-2">
                        <p className="text-sm font-medium">Subject:</p>
                        <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {template.body}
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}>
                            <Eye className="mr-1 h-3 w-3" />
                            Preview
                        </Button>
                        <Button size="sm" variant="ghost">
                            <Edit className="mr-1 h-3 w-3" />
                            Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Preview Modal */}
            {showPreview && (
                <TemplatePreviewModal
                    type="email"
                    template={template}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </>
    );
}

// Empty State Component
function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: any;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
                <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-muted-foreground text-sm mb-4">{description}</p>
            {action}
        </div>
    );
}

// Status Badge Component (standalone for export)
function StatusBadge({ status }: { status: string }) {
    const config = {
        APPROVED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
        PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
        REJECTED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    }[status] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock };

    const Icon = config.icon;

    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', config.bg, config.text)}>
            <Icon className="h-3 w-3" />
            {status}
        </span>
    );
}

// Template Preview Modal
function TemplatePreviewModal({
    type,
    template,
    onClose,
}: {
    type: 'whatsapp' | 'email';
    template: any;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Template Preview</CardTitle>
                        <Button size="icon" variant="ghost" onClick={onClose}>×</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {type === 'whatsapp' ? (
                        /* WhatsApp Preview */
                        <div className="bg-[#075E54] rounded-lg overflow-hidden">
                            <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                    B
                                </div>
                                <div>
                                    <p className="text-white text-sm font-medium">Your Business</p>
                                    <p className="text-white/70 text-xs">Business Account</p>
                                </div>
                            </div>
                            <div className="bg-[#ECE5DD] p-4 min-h-[200px]">
                                <div className="bg-white rounded-lg p-3 max-w-[90%] shadow-sm">
                                    {/* Header */}
                                    {template.components?.find((c: any) => c.type === 'HEADER') && (
                                        <p className="font-semibold text-sm mb-1">
                                            {template.components.find((c: any) => c.type === 'HEADER').text}
                                        </p>
                                    )}
                                    {/* Body */}
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                        {template.components?.find((c: any) => c.type === 'BODY')?.text || 'Template content'}
                                    </p>
                                    {/* Footer */}
                                    {template.components?.find((c: any) => c.type === 'FOOTER') && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            {template.components.find((c: any) => c.type === 'FOOTER').text}
                                        </p>
                                    )}
                                    <p className="text-right text-xs text-gray-500 mt-1">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                                    </p>
                                </div>
                                {/* Buttons */}
                                {template.components?.find((c: any) => c.type === 'BUTTONS') && (
                                    <div className="mt-2 space-y-1">
                                        {template.components.find((c: any) => c.type === 'BUTTONS').buttons?.map((btn: any, i: number) => (
                                            <button key={i} className="w-full bg-white rounded-lg py-2 text-sm text-blue-500 shadow-sm">
                                                {btn.text}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Email Preview */
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 border-b">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Mail className="h-4 w-4" />
                                    <span>Email Preview</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-primary font-bold">Y</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">Your Business</p>
                                        <p className="text-xs text-muted-foreground">to: customer@example.com</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date().toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-lg mb-3">{template.subject}</h3>
                                <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded">
                                    {template.body}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Create Template Modal
function CreateTemplateModal({
    type,
    onClose,
    onCreated,
}: {
    type: 'whatsapp' | 'email';
    onClose: () => void;
    onCreated: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // WhatsApp template fields
    const [waName, setWaName] = useState('');
    const [waCategory, setWaCategory] = useState('MARKETING');
    const [waLanguage, setWaLanguage] = useState('en_US');
    const [waBody, setWaBody] = useState('');
    const [waFooter, setWaFooter] = useState('');

    // Email template fields
    const [emailName, setEmailName] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [emailCategory, setEmailCategory] = useState('marketing');

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            if (type === 'whatsapp') {
                // Validate WhatsApp template name (lowercase, underscores only)
                const nameRegex = /^[a-z][a-z0-9_]*$/;
                if (!nameRegex.test(waName)) {
                    throw new Error('Template name must start with a letter and contain only lowercase letters, numbers, and underscores');
                }

                const response = await fetch('/api/templates/whatsapp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: waName,
                        category: waCategory,
                        language: waLanguage,
                        components: [
                            { type: 'BODY', text: waBody },
                            ...(waFooter ? [{ type: 'FOOTER', text: waFooter }] : []),
                        ],
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to create template');
                }
            } else {
                const response = await fetch('/api/templates/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: emailName,
                        subject: emailSubject,
                        body: emailBody,
                        category: emailCategory,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to create template');
                }
            }

            onCreated();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                Create {type === 'whatsapp' ? 'WhatsApp' : 'Email'} Template
                            </CardTitle>
                            <CardDescription>
                                {type === 'whatsapp'
                                    ? 'Templates must be approved by Meta before use'
                                    : 'Create reusable email templates for campaigns'}
                            </CardDescription>
                        </div>
                        <Button size="icon" variant="ghost" onClick={onClose}>×</Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {type === 'whatsapp' ? (
                        /* WhatsApp Template Form */
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Template Name *</label>
                                    <Input
                                        placeholder="e.g., order_confirmation"
                                        value={waName}
                                        onChange={(e) => setWaName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Lowercase letters, numbers, and underscores only
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category *</label>
                                    <select
                                        className="w-full h-10 rounded-md border px-3 bg-background"
                                        value={waCategory}
                                        onChange={(e) => setWaCategory(e.target.value)}
                                    >
                                        <option value="MARKETING">Marketing</option>
                                        <option value="UTILITY">Utility</option>
                                        <option value="AUTHENTICATION">Authentication</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Language *</label>
                                    <select
                                        className="w-full h-10 rounded-md border px-3 bg-background"
                                        value={waLanguage}
                                        onChange={(e) => setWaLanguage(e.target.value)}
                                    >
                                        <option value="en_US">English (US)</option>
                                        <option value="en_GB">English (UK)</option>
                                        <option value="hi">Hindi</option>
                                        <option value="es">Spanish</option>
                                        <option value="fr">French</option>
                                        <option value="de">German</option>
                                        <option value="pt_BR">Portuguese (BR)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Body Text *</label>
                                    <textarea
                                        className="w-full h-32 rounded-md border px-3 py-2 bg-background"
                                        placeholder="Hello {{1}}, your order {{2}} has been confirmed!"
                                        value={waBody}
                                        onChange={(e) => setWaBody(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Use {'{{1}}'}, {'{{2}}'} for variables
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Footer (optional)</label>
                                    <Input
                                        placeholder="Powered by Your Business"
                                        value={waFooter}
                                        onChange={(e) => setWaFooter(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* WhatsApp Preview */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Preview</label>
                                <div className="bg-[#075E54] rounded-lg overflow-hidden">
                                    <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                            B
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">Your Business</p>
                                            <p className="text-white/70 text-xs">Business Account</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#ECE5DD] p-4 min-h-[250px]">
                                        {waBody ? (
                                            <div className="bg-white rounded-lg p-3 max-w-[90%] shadow-sm">
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{waBody}</p>
                                                {waFooter && (
                                                    <p className="text-xs text-gray-500 mt-2">{waFooter}</p>
                                                )}
                                                <p className="text-right text-xs text-gray-500 mt-1">
                                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
                                                Enter body text to preview
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Email Template Form */
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Template Name *</label>
                                    <Input
                                        placeholder="e.g., Welcome Email"
                                        value={emailName}
                                        onChange={(e) => setEmailName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <select
                                        className="w-full h-10 rounded-md border px-3 bg-background"
                                        value={emailCategory}
                                        onChange={(e) => setEmailCategory(e.target.value)}
                                    >
                                        <option value="marketing">Marketing</option>
                                        <option value="transactional">Transactional</option>
                                        <option value="newsletter">Newsletter</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Subject Line *</label>
                                    <Input
                                        placeholder="Your order has been confirmed!"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email Body *</label>
                                    <RichTextEditor
                                        value={emailBody}
                                        onChange={setEmailBody}
                                        placeholder="Hello {{firstName}},  Thank you for your order..."
                                        height="350px"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Use {'{{firstName}}'}, {'{{orderNumber}}'} for variables. Full HTML formatting supported.
                                    </p>
                                </div>
                            </div>

                            {/* Email Preview */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Preview</label>
                                <div className="border rounded-lg overflow-hidden bg-white">
                                    <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 border-b">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Mail className="h-4 w-4" />
                                            <span>Inbox</span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        {emailSubject || emailBody ? (
                                            <div>
                                                <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <span className="text-primary font-bold">Y</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">Your Business</p>
                                                        <p className="text-xs text-muted-foreground">to: customer@example.com</p>
                                                    </div>
                                                </div>
                                                <h4 className="font-semibold mb-2">
                                                    {emailSubject || 'No subject'}
                                                </h4>
                                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded min-h-[100px]" dangerouslySetInnerHTML={{ __html: emailBody || 'No content yet...' }} />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
                                                Enter subject and body to preview
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || (type === 'whatsapp' ? !waName || !waBody : !emailName || !emailSubject || !emailBody)}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Template
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
