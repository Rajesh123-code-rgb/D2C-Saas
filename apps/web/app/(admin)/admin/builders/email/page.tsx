'use client';

import { useState, useEffect } from 'react';
import { buildersApi } from '@/lib/admin/api';
import {
    Plus,
    Edit,
    Trash2,
    Save,
    Check,
    Loader2,
    RefreshCw,
    Mail,
    Copy,
    Eye,
    Search,
    Filter,
    Monitor,
    Smartphone,
    Image as ImageIcon,
    Palette,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface EmailTemplate {
    id: string;
    name: string;
    displayName: string;
    category: 'newsletter' | 'promotional' | 'transactional' | 'notification';
    subject: string;
    preheader: string;
    htmlContent: string;
    textContent: string;
    status: 'draft' | 'active' | 'archived';
    allowedPlans: string[];
    usageCount: number;
    thumbnail: string;
    createdAt: string;
}

const categoryOptions = [
    { value: 'newsletter', label: 'Newsletter', description: 'Regular updates and news' },
    { value: 'promotional', label: 'Promotional', description: 'Sales, offers, discounts' },
    { value: 'transactional', label: 'Transactional', description: 'Order confirmations, receipts' },
    { value: 'notification', label: 'Notification', description: 'Alerts and system messages' },
];

const mockTemplates: EmailTemplate[] = [
    {
        id: '1',
        name: 'welcome_email',
        displayName: 'Welcome Email',
        category: 'newsletter',
        subject: 'Welcome to {{company_name}}! 🎉',
        preheader: 'We are excited to have you on board',
        htmlContent: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 40px; text-align: center; }
        .content { padding: 40px; }
        .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome, {{first_name}}!</h1>
        </div>
        <div class="content">
            <p>Thank you for joining {{company_name}}. We're thrilled to have you!</p>
            <p>Get started by exploring our platform:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{{cta_url}}" class="button">Get Started</a>
            </p>
        </div>
        <div class="footer">
            <p>{{company_name}} | {{company_address}}</p>
            <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>`,
        textContent: 'Welcome, {{first_name}}!\n\nThank you for joining {{company_name}}.\n\nGet started: {{cta_url}}\n\nUnsubscribe: {{unsubscribe_url}}',
        status: 'active',
        allowedPlans: ['starter', 'pro', 'enterprise'],
        usageCount: 234,
        thumbnail: '',
        createdAt: '2024-12-01T10:00:00',
    },
    {
        id: '2',
        name: 'order_confirmation',
        displayName: 'Order Confirmation',
        category: 'transactional',
        subject: 'Order Confirmed - #{{order_id}}',
        preheader: 'Thank you for your purchase',
        htmlContent: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; }
        .header { background: #10b981; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .order-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✓ Order Confirmed</h1>
        </div>
        <div class="content">
            <p>Hi {{first_name}},</p>
            <p>Your order has been confirmed!</p>
            <div class="order-details">
                <p><strong>Order #:</strong> {{order_id}}</p>
                <p><strong>Items:</strong> {{order_items}}</p>
                <p><strong>Total:</strong> ₹{{order_total}}</p>
            </div>
            <p>We'll notify you when your order ships.</p>
        </div>
        <div class="footer">
            <p>Questions? Contact us at {{support_email}}</p>
        </div>
    </div>
</body>
</html>`,
        textContent: 'Order Confirmed - #{{order_id}}\n\nHi {{first_name}},\n\nYour order has been confirmed!\n\nOrder #: {{order_id}}\nItems: {{order_items}}\nTotal: ₹{{order_total}}',
        status: 'active',
        allowedPlans: ['starter', 'pro', 'enterprise'],
        usageCount: 456,
        thumbnail: '',
        createdAt: '2024-11-15T09:00:00',
    },
    {
        id: '3',
        name: 'flash_sale',
        displayName: 'Flash Sale Announcement',
        category: 'promotional',
        subject: '⚡ FLASH SALE - {{discount}}% OFF Everything!',
        preheader: 'Limited time offer - ends tonight!',
        htmlContent: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #1a1a1a; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #dc2626; border-radius: 8px; overflow: hidden; }
        .header { padding: 50px; text-align: center; color: white; }
        .discount { font-size: 80px; font-weight: bold; }
        .content { background: white; padding: 40px; text-align: center; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 16px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <p style="font-size: 24px;">⚡ FLASH SALE ⚡</p>
            <p class="discount">{{discount}}% OFF</p>
            <p>EVERYTHING!</p>
        </div>
        <div class="content">
            <p style="font-size: 18px; margin-bottom: 30px;">Don't miss out - sale ends {{end_date}}!</p>
            <a href="{{shop_url}}" class="button">SHOP NOW</a>
            <p style="margin-top: 20px; color: #666;">Use code: <strong>{{promo_code}}</strong></p>
        </div>
    </div>
</body>
</html>`,
        textContent: 'FLASH SALE - {{discount}}% OFF Everything!\n\nSale ends {{end_date}}!\n\nShop now: {{shop_url}}\n\nUse code: {{promo_code}}',
        status: 'active',
        allowedPlans: ['pro', 'enterprise'],
        usageCount: 123,
        thumbnail: '',
        createdAt: '2024-11-20T14:00:00',
    },
];

const plans = ['free', 'starter', 'pro', 'enterprise'];

export default function EmailBuilderPage() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [editDialog, setEditDialog] = useState(false);
    const [previewDialog, setPreviewDialog] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const data = await buildersApi.getEmailTemplates();
            setTemplates((data || []) as EmailTemplate[]);
        } catch (error) {
            console.error('Error fetching templates:', error);
            setTemplates(mockTemplates);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        const newTemplate: EmailTemplate = {
            id: `new_${Date.now()}`,
            name: '',
            displayName: '',
            category: 'newsletter',
            subject: '',
            preheader: '',
            htmlContent: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Your Email Title</h1>
        <p>Your email content goes here...</p>
        <p>Use variables like {{first_name}} for personalization.</p>
    </div>
</body>
</html>`,
            textContent: '',
            status: 'draft',
            allowedPlans: ['starter', 'pro', 'enterprise'],
            usageCount: 0,
            thumbnail: '',
            createdAt: new Date().toISOString(),
        };
        setEditingTemplate(newTemplate);
        setEditDialog(true);
    };

    const handleEdit = (template: EmailTemplate) => {
        setEditingTemplate(JSON.parse(JSON.stringify(template)));
        setEditDialog(true);
    };

    const handleSave = async () => {
        if (!editingTemplate) return;
        try {
            setSaving(true);
            const isNew = !templates.find(t => t.id === editingTemplate.id) || editingTemplate.id.startsWith('new_');
            const templateWithName = {
                ...editingTemplate,
                name: editingTemplate.name || editingTemplate.displayName.toLowerCase().replace(/\s+/g, '_'),
            };
            const { id, createdAt, usageCount, thumbnail, ...saveData } = templateWithName;

            if (isNew) {
                await buildersApi.createEmailTemplate(saveData);
            } else {
                await buildersApi.updateEmailTemplate(id, saveData);
            }
            await fetchTemplates();
            setEditDialog(false);
            setEditingTemplate(null);
        } catch (error) {
            console.error('Error saving template:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await buildersApi.deleteEmailTemplate(id);
            await fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
        }
    };

    const seedDefaults = async () => {
        if (!confirm('This will create default templates if they don\'t exist. Continue?')) return;
        setLoading(true);
        try {
            for (const t of mockTemplates) {
                const exists = templates.find(existing => existing.name === t.name);
                if (!exists) {
                    const { id, createdAt, usageCount, ...createData } = t;
                    await buildersApi.createEmailTemplate({
                        ...createData,
                        name: createData.name || createData.displayName.toLowerCase().replace(/\s+/g, '_')
                    });
                }
            }
            await fetchTemplates();
            alert('Default templates seeded successfully!');
        } catch (error) {
            console.error('Error seeding templates:', error);
            alert('Failed to seed templates.');
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicate = (template: EmailTemplate) => {
        const duplicate: EmailTemplate = {
            ...template,
            id: `dup_${Date.now()}`,
            displayName: `${template.displayName} (Copy)`,
            name: `${template.name}_copy`,
            status: 'draft',
            usageCount: 0,
            createdAt: new Date().toISOString(),
        };
        setTemplates(prev => [...prev, duplicate]);
    };

    const togglePlan = (plan: string) => {
        if (!editingTemplate) return;
        const current = editingTemplate.allowedPlans;
        const updated = current.includes(plan)
            ? current.filter(p => p !== plan)
            : [...current, plan];
        setEditingTemplate({ ...editingTemplate, allowedPlans: updated });
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'newsletter': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'promotional': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'transactional': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'notification': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };



    const EmailPreview = ({ template, mode }: { template: EmailTemplate, mode: 'desktop' | 'mobile' }) => (
        <div className={cn(
            "bg-white rounded-xl shadow-2xl overflow-hidden transition-all mx-auto border-4 border-slate-900",
            mode === 'desktop' ? 'w-full max-w-3xl' : 'w-[320px]'
        )}>
            <div className="bg-slate-100 px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-center flex-1 mx-4">
                    <p className="font-semibold text-xs text-slate-700 truncate max-w-[200px] mx-auto opacity-70">
                        {template.subject || 'Subject line'}
                    </p>
                </div>
                <div className="w-12" />
            </div>

            <iframe
                srcDoc={template.htmlContent}
                title={`Email Preview: ${template.name}`}
                className="w-full bg-white border-0"
                style={{ height: mode === 'desktop' ? '500px' : '600px' }}
                sandbox="allow-same-origin"
            />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Email Templates</h1>
                    <p className="text-slate-400 mt-1">Design and manage HTML email templates for your users</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                        onClick={seedDefaults}
                        disabled={loading}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Seed Defaults
                    </Button>
                    <Button
                        variant="outline"
                        className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                        disabled={loading}
                        onClick={fetchTemplates}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20" onClick={handleCreateNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                    </Button>
                </div>
            </div>

            <GlassCard className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-blue-500/20"
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-56 bg-slate-900/50 border-slate-700 text-white focus:border-blue-500/50 focus:ring-blue-500/20">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-blue-400" />
                                <span className="capitalize">
                                    {categoryFilter === 'all' ? 'All Categories' : categoryOptions.find(c => c.value === categoryFilter)?.label || categoryFilter}
                                </span>
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="all" className="text-white">All Categories</SelectItem>
                            {categoryOptions.map(cat => (
                                <SelectItem key={cat.value} value={cat.value} className="text-white">
                                    {cat.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </GlassCard>

            <div className="grid gap-4 md:grid-cols-4">
                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Mail className="h-12 w-12 text-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Total Templates</p>
                    <p className="text-2xl font-bold text-white mt-1">{templates.length}</p>
                </GlassCard>
                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Check className="h-12 w-12 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Active</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                        {templates.filter(t => t.status === 'active').length}
                    </p>
                </GlassCard>
                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Eye className="h-12 w-12 text-purple-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Total Usage</p>
                    <p className="text-2xl font-bold text-white mt-1">
                        {templates.reduce((sum, t) => sum + t.usageCount, 0).toLocaleString()}
                    </p>
                </GlassCard>
                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Edit className="h-12 w-12 text-amber-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Drafts</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">
                        {templates.filter(t => t.status === 'draft').length}
                    </p>
                </GlassCard>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                    <GlassCard key={template.id} className="flex flex-col h-full group hover:border-blue-500/30 transition-all duration-300">
                        <div className="p-5 flex-1 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                                        <Mail className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-white font-semibold text-base leading-none truncate pr-2">{template.displayName}</h3>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 lowercase", getCategoryColor(template.category))}>
                                                {categoryOptions.find(c => c.value === template.category)?.label}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <Switch
                                    checked={template.status === 'active'}
                                    onCheckedChange={(checked) => {
                                        // Simple toggle for now
                                        const newStatus = checked ? 'active' : 'draft';
                                        if (newStatus) {
                                            // Ideally call API to update status
                                        }
                                    }}
                                    className="data-[state=checked]:bg-emerald-500"
                                />
                            </div>

                            <div className="relative group/image overflow-hidden rounded-lg border border-slate-700/50 aspect-[16/9] bg-slate-900/50">
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/50 z-10 backdrop-blur-sm">
                                    <Button size="sm" variant="secondary" onClick={() => {
                                        setPreviewTemplate(template);
                                        setPreviewDialog(true);
                                    }}>
                                        <Eye className="h-4 w-4 mr-2" /> Preview
                                    </Button>
                                </div>
                                <div className="w-full h-full p-2 origin-top-left scale-[0.4] w-[250%] h-[250%] pointer-events-none select-none bg-white">
                                    <div dangerouslySetInnerHTML={{ __html: template.htmlContent }} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Subject</p>
                                <p className="text-sm text-slate-300 truncate">{template.subject || 'No subject'}</p>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {template.allowedPlans.map(plan => (
                                    <Badge key={plan} variant="secondary" className="bg-slate-800 text-slate-400 border-transparent text-[10px] uppercase tracking-wider px-1.5">
                                        {plan}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="px-5 py-3 border-t border-white/5 bg-white/5 flex items-center justify-between mt-auto">
                            <div className="text-xs text-slate-400 font-medium">
                                <span className="text-slate-200">{template.usageCount}</span> active uses
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full"
                                    onClick={() => handleDuplicate(template)}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full"
                                    onClick={() => handleEdit(template)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-full"
                                    onClick={() => handleDelete(template.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="text-center py-20 px-4">
                    <GlassCard className="inline-flex p-6 mb-6 rounded-full bg-slate-900/50 border-slate-800">
                        <Mail className="h-10 w-10 text-slate-500" />
                    </GlassCard>
                    <h3 className="text-xl font-medium text-white">No email templates found</h3>
                    <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                        No templates match your search. Try adjusting your filters or create a new template.
                    </p>
                    <Button className="mt-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreateNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                    </Button>
                </div>
            )}

            <Dialog open={editDialog} onOpenChange={setEditDialog}>
                <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-6 border-b border-white/10">
                        <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                            {editingTemplate?.id?.startsWith('new_') ? <Plus className="h-5 w-5 text-blue-400" /> : <Edit className="h-5 w-5 text-blue-400" />}
                            {editingTemplate?.id?.startsWith('new_') ? 'Create Email Template' : 'Edit Email Template'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Configure email content, subject, and settings.
                        </DialogDescription>
                    </DialogHeader>

                    {editingTemplate && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <Tabs defaultValue="content" className="flex-1 flex flex-col h-full">
                                <div className="px-6 pt-4">
                                    <TabsList className="bg-slate-950/50 border border-white/5 w-full justify-start h-auto p-1">
                                        <TabsTrigger value="content" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 py-2">General</TabsTrigger>
                                        <TabsTrigger value="editor" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 py-2">HTML Editor</TabsTrigger>
                                        <TabsTrigger value="preview" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 py-2">Live Preview</TabsTrigger>
                                        <TabsTrigger value="settings" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 py-2">Settings</TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    <TabsContent value="content" className="space-y-6 mt-0">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Display Name</Label>
                                                <Input
                                                    value={editingTemplate.displayName}
                                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, displayName: e.target.value })}
                                                    placeholder="e.g., Welcome Email"
                                                    className="bg-slate-950/50 border-slate-800 text-white focus:border-blue-500/50"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Template ID</Label>
                                                <Input
                                                    value={editingTemplate.name}
                                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                                    placeholder="welcome_email"
                                                    className="bg-slate-950/50 border-slate-800 text-white font-mono focus:border-blue-500/50"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Subject Line</Label>
                                            <div className="relative">
                                                <Input
                                                    value={editingTemplate.subject}
                                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                                    placeholder="e.g., Welcome to {{company_name}}!"
                                                    className="bg-slate-950/50 border-slate-800 text-white pr-20 focus:border-blue-500/50"
                                                />
                                                <Badge variant="outline" className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 border-slate-700 bg-slate-900 pointer-events-none">
                                                    Subject
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Preheader Text</Label>
                                            <Input
                                                value={editingTemplate.preheader}
                                                onChange={(e) => setEditingTemplate({ ...editingTemplate, preheader: e.target.value })}
                                                placeholder="Preview text shown in email clients"
                                                className="bg-slate-950/50 border-slate-800 text-white focus:border-blue-500/50"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Plain Text Version</Label>
                                            <Textarea
                                                value={editingTemplate.textContent}
                                                onChange={(e) => setEditingTemplate({ ...editingTemplate, textContent: e.target.value })}
                                                placeholder="Plain text fallback..."
                                                className="bg-slate-950/50 border-slate-800 text-white min-h-[150px] font-mono text-sm focus:border-blue-500/50"
                                            />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="editor" className="space-y-4 mt-0 h-full flex flex-col">
                                        <div className="flex items-center justify-between mb-2">
                                            <Label className="text-slate-300">HTML Code</Label>
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="outline" className="h-7 border-slate-700 bg-slate-800 text-slate-400 hover:text-white">
                                                    <Palette className="h-3.5 w-3.5 mr-1" /> Theme
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-7 border-slate-700 bg-slate-800 text-slate-400 hover:text-white">
                                                    <ImageIcon className="h-3.5 w-3.5 mr-1" /> Insert Image
                                                </Button>
                                            </div>
                                        </div>
                                        <Textarea
                                            value={editingTemplate.htmlContent}
                                            onChange={(e) => setEditingTemplate({ ...editingTemplate, htmlContent: e.target.value })}
                                            className="flex-1 bg-slate-950 border-slate-800 text-blue-100 font-mono text-sm leading-relaxed p-4 resize-none focus:border-blue-500/50"
                                            spellCheck={false}
                                        />
                                    </TabsContent>

                                    <TabsContent value="preview" className="mt-0 h-full">
                                        <div className="flex justify-center gap-2 mb-6">
                                            <Button
                                                size="sm"
                                                variant={previewMode === 'desktop' ? 'default' : 'outline'}
                                                className={cn(
                                                    "w-32",
                                                    previewMode === 'desktop' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                                                )}
                                                onClick={() => setPreviewMode('desktop')}
                                            >
                                                <Monitor className="h-4 w-4 mr-2" />
                                                Desktop
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={previewMode === 'mobile' ? 'default' : 'outline'}
                                                className={cn(
                                                    "w-32",
                                                    previewMode === 'mobile' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                                                )}
                                                onClick={() => setPreviewMode('mobile')}
                                            >
                                                <Smartphone className="h-4 w-4 mr-2" />
                                                Mobile
                                            </Button>
                                        </div>

                                        <div className="flex justify-center bg-slate-950/30 rounded-lg p-8 border border-white/5 min-h-[500px]">
                                            <EmailPreview template={editingTemplate} mode={previewMode} />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="settings" className="space-y-6 mt-0">
                                        <GlassCard className="p-5 space-y-4">
                                            <h3 className="text-base font-medium text-white">Categorization</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-300">Category</Label>
                                                    <Select
                                                        value={editingTemplate.category}
                                                        onValueChange={(v) => setEditingTemplate({ ...editingTemplate, category: v as any })}
                                                    >
                                                        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-700">
                                                            {categoryOptions.map(cat => (
                                                                <SelectItem key={cat.value} value={cat.value} className="text-white">
                                                                    {cat.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-300">Structure Status</Label>
                                                    <Select
                                                        value={editingTemplate.status}
                                                        onValueChange={(v) => setEditingTemplate({ ...editingTemplate, status: v as any })}
                                                    >
                                                        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-700">
                                                            <SelectItem value="draft" className="text-amber-400">Draft</SelectItem>
                                                            <SelectItem value="active" className="text-emerald-400">Active</SelectItem>
                                                            <SelectItem value="archived" className="text-slate-400">Archived</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </GlassCard>

                                        <GlassCard className="p-5 space-y-4">
                                            <h3 className="text-base font-medium text-white">Access Control</h3>
                                            <div className="space-y-3">
                                                <Label className="text-slate-300 block mb-2">Available on Plans</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {plans.map(plan => {
                                                        const isSelected = editingTemplate.allowedPlans.includes(plan);
                                                        return (
                                                            <div
                                                                key={plan}
                                                                onClick={() => togglePlan(plan)}
                                                                className={cn(
                                                                    "cursor-pointer px-4 py-2 rounded-lg border transition-all text-sm font-medium",
                                                                    isSelected
                                                                        ? "bg-blue-600/20 border-blue-500/50 text-blue-100"
                                                                        : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600"
                                                                )}
                                                            >
                                                                <span className="capitalize">{plan}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </GlassCard>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    )}

                    <DialogFooter className="p-6 border-t border-white/10 bg-slate-950/30">
                        <Button variant="ghost" onClick={() => setEditDialog(false)} className="text-slate-400 hover:text-white mr-2">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Template
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog (Standalone) */}
            <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
                <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-4xl p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b border-white/10 bg-slate-950/50">
                        <DialogTitle className="text-white text-base">Preview: {previewTemplate?.displayName}</DialogTitle>
                    </DialogHeader>
                    <div className="p-8 bg-slate-950/80 flex justify-center min-h-[600px]">
                        {previewTemplate && <EmailPreview template={previewTemplate} mode={previewMode} />}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
