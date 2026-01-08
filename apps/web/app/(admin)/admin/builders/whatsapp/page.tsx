'use client';

import { useState, useEffect } from 'react';
import { buildersApi } from '@/lib/admin/api';
import {
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    Loader2,
    RefreshCw,
    MessageSquare,
    Copy,
    Search,
    Filter,
    Image as ImageIcon,
    Video,
    FileText,
    Phone,
    ExternalLink,
    Type,
    Smartphone,
    Check,
    Eye,
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

interface WhatsAppButton {
    type: 'quick_reply' | 'url' | 'phone';
    text: string;
    value?: string;
}

interface WhatsAppTemplate {
    id: string;
    name: string;
    displayName: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;
    headerType: 'none' | 'text' | 'image' | 'video' | 'document';
    headerContent: string;
    bodyText: string;
    footerText: string;
    buttons: WhatsAppButton[];
    status: 'draft' | 'active' | 'archived';
    allowedPlans: string[];
    usageCount: number;
    createdAt: string;
}

const categoryOptions = [
    { value: 'MARKETING', label: 'Marketing', description: 'Promotional content, offers' },
    { value: 'UTILITY', label: 'Utility', description: 'Order updates, alerts' },
    { value: 'AUTHENTICATION', label: 'Authentication', description: 'OTP, verification codes' },
];

const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'en_US', label: 'English (US)' },
    { value: 'hi', label: 'Hindi' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'ar', label: 'Arabic' },
    { value: 'pt_BR', label: 'Portuguese (BR)' },
];

const headerTypes = [
    { value: 'none', label: 'None', icon: X },
    { value: 'text', label: 'Text', icon: Type },
    { value: 'image', label: 'Image', icon: ImageIcon },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'document', label: 'Document', icon: FileText },
];



const plans = ['free', 'starter', 'pro', 'enterprise'];

export default function WhatsAppBuilderPage() {
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
    const [editDialog, setEditDialog] = useState(false);
    const [previewDialog, setPreviewDialog] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const data = await buildersApi.getWhatsAppTemplates();
            setTemplates((data || []) as WhatsAppTemplate[]);
        } catch (error) {
            console.error('Error fetching templates:', error);
            // Do not fallback to mock templates on error to avoid user confusion
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        const newTemplate: WhatsAppTemplate = {
            id: `new_${Date.now()}`,
            name: '',
            displayName: '',
            category: 'MARKETING',
            language: 'en',
            headerType: 'none',
            headerContent: '',
            bodyText: '',
            footerText: '',
            buttons: [],
            status: 'draft',
            allowedPlans: ['starter', 'pro', 'enterprise'],
            usageCount: 0,
            createdAt: new Date().toISOString(),
        };
        setEditingTemplate(newTemplate);
        setEditDialog(true);
    };

    const handleEdit = (template: WhatsAppTemplate) => {
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
            const { id, createdAt, usageCount, ...saveData } = templateWithName;

            if (isNew) {
                await buildersApi.createWhatsAppTemplate(saveData);
            } else {
                await buildersApi.updateWhatsAppTemplate(id, saveData);
            }
            await fetchTemplates();
            setEditDialog(false);
            setEditingTemplate(null);
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Failed to save template. Please check the console for details.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        // Optimistic update: Remove immediately from UI
        setTemplates(prev => prev.filter(t => t.id !== id));

        try {
            await buildersApi.deleteWhatsAppTemplate(id);
        } catch (error: any) {
            console.error('Error deleting template:', error);
            // If the error is not 404 (Not Found), alert the user.
            // (Assuming generic error here, but typically if it's already gone that's fine)
            alert(`Failed to delete template: ${error.message || 'Unknown error'}`);
            // Revert state if failed (by fetching source of truth)
            await fetchTemplates();
        }
    };



    const handleDuplicate = (template: WhatsAppTemplate) => {
        const duplicate: WhatsAppTemplate = {
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

    const addButton = () => {
        if (!editingTemplate || editingTemplate.buttons.length >= 3) return;
        setEditingTemplate({
            ...editingTemplate,
            buttons: [...editingTemplate.buttons, { type: 'quick_reply', text: '' }],
        });
    };

    const updateButton = (index: number, field: string, value: string) => {
        if (!editingTemplate) return;
        const buttons = [...editingTemplate.buttons];
        // @ts-ignore
        buttons[index] = { ...buttons[index], [field]: value };
        setEditingTemplate({ ...editingTemplate, buttons });
    };

    const removeButton = (index: number) => {
        if (!editingTemplate) return;
        setEditingTemplate({
            ...editingTemplate,
            buttons: editingTemplate.buttons.filter((_, i) => i !== index),
        });
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
            case 'MARKETING': return 'bg-neutral-800 text-white border-neutral-700';
            case 'UTILITY': return 'bg-neutral-800 text-white border-blue-500/20';
            case 'AUTHENTICATION': return 'bg-neutral-800 text-white border-neutral-700';
            default: return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
        }
    };



    const PhonePreview = ({ template }: { template: WhatsAppTemplate }) => (
        <div className="w-[300px] h-[600px] bg-neutral-900 rounded-[3rem] border-8 border-neutral-800 shadow-2xl overflow-hidden relative mx-auto">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-neutral-800 rounded-b-2xl z-20" />

            <div className="bg-[#075e54] h-20 pt-8 px-4 flex items-center gap-3 relative z-10">
                <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center border border-white/20">
                    <MessageSquare className="h-5 w-5 text-neutral-600" />
                </div>
                <div>
                    <p className="text-white font-medium text-sm">Business Account</p>
                    <p className="text-neutral-300 text-[10px]">Official Account</p>
                </div>
            </div>

            <div className="bg-[#e5ddd5] h-[calc(100%-5rem)] p-3 overflow-y-auto relative custom-scrollbar">
                <div className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{
                        backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                        backgroundSize: '400px'
                    }}
                />

                <div className="bg-white rounded-lg shadow-sm max-w-[90%] ml-auto relative z-10 overflow-hidden mb-4">
                    {template.headerType === 'image' && (
                        <div className="h-36 bg-neutral-100 flex items-center justify-center overflow-hidden">
                            {template.headerContent ? (
                                <img src={template.headerContent} alt="Header" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="h-10 w-10 text-neutral-300" />
                            )}
                        </div>
                    )}
                    {template.headerType === 'video' && (
                        <div className="h-36 bg-neutral-900 flex items-center justify-center">
                            <Video className="h-10 w-10 text-neutral-500" />
                        </div>
                    )}
                    {template.headerType === 'document' && (
                        <div className="bg-neutral-50 p-3 flex items-center gap-3 border-b border-neutral-100">
                            <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <FileText className="h-5 w-5 text-red-500" />
                            </div>
                            <span className="text-sm font-medium text-neutral-700">Document.pdf</span>
                        </div>
                    )}
                    {template.headerType === 'text' && template.headerContent && (
                        <div className="px-3 pt-3 font-bold text-neutral-900 text-sm">
                            {template.headerContent}
                        </div>
                    )}

                    <div className="px-3 py-2 text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
                        {template.bodyText || 'Message body...'}
                    </div>

                    {template.footerText && (
                        <div className="px-3 pb-1 text-[11px] text-neutral-500">
                            {template.footerText}
                        </div>
                    )}

                    <div className="px-3 pb-2 text-right">
                        <span className="text-[10px] text-neutral-400">12:00 PM</span>
                    </div>
                </div>

                {template.buttons.length > 0 && (
                    <div className="space-y-2 max-w-[90%] ml-auto">
                        {template.buttons.map((btn, i) => (
                            <div key={i} className="bg-white rounded-lg shadow-sm py-2.5 px-4 text-center cursor-pointer hover:bg-neutral-50 transition-colors">
                                <span className="text-[#00a5f4] text-sm font-medium flex items-center justify-center gap-2">
                                    {btn.type === 'url' && <ExternalLink className="h-3.5 w-3.5" />}
                                    {btn.type === 'phone' && <Phone className="h-3.5 w-3.5" />}
                                    {btn.type === 'quick_reply' && <MessageSquare className="h-3.5 w-3.5" />}
                                    {btn.text || 'Button'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">WhatsApp Templates</h1>
                    <p className="text-neutral-400 mt-1">Manage approved WhatsApp templates and message flows</p>
                </div>
                <div className="flex gap-2">

                    <Button
                        variant="outline"
                        className="border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                        disabled={loading}
                        onClick={fetchTemplates}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20" onClick={handleCreateNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                    </Button>
                </div>
            </div>

            <GlassCard className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-neutral-900/50 border-neutral-700 text-white placeholder:text-neutral-600 focus:border-neutral-600/50 focus:ring-green-500/20"
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-56 bg-neutral-900/50 border-neutral-700 text-white focus:border-neutral-600/50 focus:ring-green-500/20">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-neutral-300" />
                                <span className="capitalize">
                                    {categoryFilter === 'all' ? 'All Categories' : categoryOptions.find(c => c.value === categoryFilter)?.label || categoryFilter}
                                </span>
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-700">
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
                        <MessageSquare className="h-12 w-12 text-green-500" />
                    </div>
                    <p className="text-sm font-medium text-neutral-400">Total Templates</p>
                    <p className="text-2xl font-bold text-white mt-1">{templates.length}</p>
                </GlassCard>
                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Check className="h-12 w-12 text-neutral-400" />
                    </div>
                    <p className="text-sm font-medium text-neutral-400">Active</p>
                    <p className="text-2xl font-bold text-neutral-300 mt-1">
                        {templates.filter(t => t.status === 'active').length}
                    </p>
                </GlassCard>
                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Eye className="h-12 w-12 text-neutral-400" />
                    </div>
                    <p className="text-sm font-medium text-neutral-400">Total Usage</p>
                    <p className="text-2xl font-bold text-white mt-1">
                        {templates.reduce((sum, t) => sum + t.usageCount, 0).toLocaleString()}
                    </p>
                </GlassCard>
                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Edit className="h-12 w-12 text-neutral-400" />
                    </div>
                    <p className="text-sm font-medium text-neutral-400">Drafts</p>
                    <p className="text-2xl font-bold text-white mt-1">
                        {templates.filter(t => t.status === 'draft').length}
                    </p>
                </GlassCard>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                    <GlassCard key={template.id} className="flex flex-col h-full group hover:border-neutral-600/30 transition-all duration-300">
                        <div className="p-5 flex-1 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-neutral-800 border border-neutral-600/20 group-hover:bg-neutral-700 transition-colors">
                                        <MessageSquare className="h-5 w-5 text-neutral-300" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-white font-semibold text-base leading-none truncate pr-2">{template.displayName}</h3>
                                        <p className="text-xs text-neutral-500 font-mono mt-1.5">{template.name}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={template.status === 'active'}
                                    onCheckedChange={(_checked) => {
                                        // Simple toggle for now
                                    }}
                                    className="data-[state=checked]:bg-white"
                                />
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                                <Badge variant="outline" className={cn("border-0 px-2", getCategoryColor(template.category))}>
                                    {template.category}
                                </Badge>
                                <span className="text-neutral-600">|</span>
                                <span className="text-neutral-400 uppercase">{template.language}</span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800 text-sm text-neutral-300 line-clamp-3 leading-relaxed relative group/preview">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/10 pointer-events-none" />
                                {template.bodyText || <span className="text-neutral-600 italic">No message body</span>}
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {template.allowedPlans.map(plan => (
                                    <Badge key={plan} variant="secondary" className="bg-neutral-800 text-neutral-400 border-transparent text-[10px] uppercase tracking-wider px-1.5">
                                        {plan}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="px-5 py-3 border-t border-white/5 bg-white/5 flex items-center justify-between mt-auto">
                            <div className="text-xs text-neutral-400 font-medium">
                                <span className="text-neutral-200">{template.usageCount}</span> active uses
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-neutral-400 hover:text-white hover:bg-neutral-700/50 rounded-full"
                                    onClick={() => {
                                        setPreviewTemplate(template);
                                        setPreviewDialog(true);
                                    }}
                                >
                                    <Smartphone className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-neutral-400 hover:text-white hover:bg-neutral-700/50 rounded-full"
                                    onClick={() => handleDuplicate(template)}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-neutral-300 hover:text-green-300 hover:bg-neutral-800 rounded-full"
                                    onClick={() => handleEdit(template)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800 rounded-full"
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
                    <GlassCard className="inline-flex p-6 mb-6 rounded-full bg-neutral-900/50 border-neutral-800">
                        <MessageSquare className="h-10 w-10 text-neutral-500" />
                    </GlassCard>
                    <h3 className="text-xl font-medium text-white">No templates found</h3>
                    <p className="text-neutral-400 mt-2 max-w-sm mx-auto">
                        No WhatsApp templates match your search. Try adjusting your filters or create a new template.
                    </p>
                    <Button className="mt-8 bg-green-600 hover:bg-green-700 text-white" onClick={handleCreateNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                    </Button>
                </div>
            )}

            <Dialog open={editDialog} onOpenChange={setEditDialog}>
                <DialogContent className="bg-neutral-900/95 backdrop-blur-xl border-white/10 max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-6 border-b border-white/10">
                        <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                            {editingTemplate?.id?.startsWith('new_') ? <Plus className="h-5 w-5 text-neutral-300" /> : <Edit className="h-5 w-5 text-neutral-300" />}
                            {editingTemplate?.id?.startsWith('new_') ? 'Create WhatsApp Template' : 'Edit WhatsApp Template'}
                        </DialogTitle>
                    </DialogHeader>

                    {editingTemplate && (
                        <div className="flex flex-1 overflow-hidden">
                            <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
                                <div className="px-6 pt-4">
                                    <Tabs defaultValue="content" className="flex-1 flex flex-col h-full">
                                        <TabsList className="bg-neutral-950/50 border border-white/5 w-full justify-start h-auto p-1 mb-4">
                                            <TabsTrigger value="content" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-green-300 py-2">Content</TabsTrigger>
                                            <TabsTrigger value="buttons" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-green-300 py-2">Buttons ({editingTemplate.buttons.length})</TabsTrigger>
                                            <TabsTrigger value="settings" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-green-300 py-2">Settings</TabsTrigger>
                                        </TabsList>

                                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-6">
                                            <TabsContent value="content" className="space-y-6 mt-0">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-neutral-300">Display Name</Label>
                                                        <Input
                                                            value={editingTemplate.displayName}
                                                            onChange={(e) => setEditingTemplate({ ...editingTemplate, displayName: e.target.value })}
                                                            placeholder="e.g., Welcome Message"
                                                            className="bg-neutral-950/50 border-neutral-800 text-white focus:border-neutral-600/50"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-neutral-300">Template ID</Label>
                                                        <Input
                                                            value={editingTemplate.name}
                                                            onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                                            placeholder="welcome_message"
                                                            className="bg-neutral-950/50 border-neutral-800 text-white font-mono focus:border-neutral-600/50"
                                                        />
                                                    </div>
                                                </div>

                                                <GlassCard className="p-4 bg-neutral-950/30">
                                                    <div className="space-y-4">
                                                        <Label className="text-neutral-300">Header Content (Optional)</Label>
                                                        <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-none">
                                                            {headerTypes.map(ht => {
                                                                const Icon = ht.icon;
                                                                return (
                                                                    <Button
                                                                        key={ht.value}
                                                                        size="sm"
                                                                        variant={editingTemplate.headerType === ht.value ? 'default' : 'outline'}
                                                                        className={cn(
                                                                            "whitespace-nowrap",
                                                                            editingTemplate.headerType === ht.value
                                                                                ? 'bg-green-600 hover:bg-green-700'
                                                                                : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                                                                        )}
                                                                        onClick={() => setEditingTemplate({ ...editingTemplate, headerType: ht.value as any })}
                                                                    >
                                                                        <Icon className="h-3.5 w-3.5 mr-2" />
                                                                        {ht.label}
                                                                    </Button>
                                                                );
                                                            })}
                                                        </div>

                                                        {editingTemplate.headerType !== 'none' && (
                                                            <Input
                                                                value={editingTemplate.headerContent}
                                                                onChange={(e) => setEditingTemplate({ ...editingTemplate, headerContent: e.target.value })}
                                                                placeholder={editingTemplate.headerType === 'text' ? 'Enter header text' : 'Enter media URL'}
                                                                className="bg-neutral-900 border-neutral-700 text-white focus:border-neutral-600/50"
                                                            />
                                                        )}
                                                    </div>
                                                </GlassCard>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <Label className="text-neutral-300">Body Text</Label>
                                                        <span className="text-xs text-neutral-500">Variables: {'{{1}}'}, {'{{2}}'}</span>
                                                    </div>
                                                    <Textarea
                                                        value={editingTemplate.bodyText}
                                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, bodyText: e.target.value })}
                                                        placeholder="Enter your message here..."
                                                        className="bg-neutral-950/50 border-neutral-800 text-white min-h-[150px] focus:border-neutral-600/50 leading-relaxed"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-neutral-300">Footer Text</Label>
                                                    <Input
                                                        value={editingTemplate.footerText}
                                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, footerText: e.target.value })}
                                                        placeholder="e.g., Reply STOP to unsubscribe"
                                                        className="bg-neutral-950/50 border-neutral-800 text-white focus:border-neutral-600/50"
                                                    />
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="buttons" className="space-y-6 mt-0">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <Label className="text-white text-base">Interactive Buttons</Label>
                                                        <p className="text-sm text-neutral-400">Add actions for quick user responses</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-green-300 hover:border-neutral-600/50"
                                                        onClick={addButton}
                                                        disabled={editingTemplate.buttons.length >= 3}
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" /> Add Button
                                                    </Button>
                                                </div>

                                                <div className="space-y-3">
                                                    {editingTemplate.buttons.map((btn, i) => (
                                                        <GlassCard key={i} className="p-3 bg-neutral-950/30 flex gap-3 items-start group">
                                                            <div className="grid gap-3 flex-1">
                                                                <div className="flex gap-3">
                                                                    <Select
                                                                        value={btn.type}
                                                                        // @ts-ignore
                                                                        onValueChange={(v) => updateButton(i, 'type', v)}
                                                                    >
                                                                        <SelectTrigger className="w-[140px] bg-neutral-900 border-neutral-700 text-white">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-neutral-800 border-neutral-700">
                                                                            <SelectItem value="quick_reply" className="text-white">Quick Reply</SelectItem>
                                                                            <SelectItem value="url" className="text-white">Website Link</SelectItem>
                                                                            <SelectItem value="phone" className="text-white">Phone Number</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Input
                                                                        value={btn.text}
                                                                        onChange={(e) => updateButton(i, 'text', e.target.value)}
                                                                        placeholder="Button Text"
                                                                        className="flex-1 bg-neutral-900 border-neutral-700 text-white"
                                                                    />
                                                                </div>
                                                                {btn.type !== 'quick_reply' && (
                                                                    <Input
                                                                        value={btn.value}
                                                                        onChange={(e) => updateButton(i, 'value', e.target.value)}
                                                                        placeholder={btn.type === 'url' ? 'https://example.com' : '+1234567890'}
                                                                        className="bg-neutral-900 border-neutral-700 text-white"
                                                                    />
                                                                )}
                                                            </div>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="text-neutral-500 hover:text-neutral-400 hover:bg-neutral-800"
                                                                onClick={() => removeButton(i)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </GlassCard>
                                                    ))}
                                                    {editingTemplate.buttons.length === 0 && (
                                                        <div className="text-center py-8 border border-dashed border-neutral-700 rounded-lg text-neutral-500">
                                                            No buttons added yet
                                                        </div>
                                                    )}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="settings" className="space-y-6 mt-0">
                                                <GlassCard className="p-5 space-y-4">
                                                    <h3 className="text-base font-medium text-white">Template Details</h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-neutral-300">Category</Label>
                                                            <Select
                                                                value={editingTemplate.category}
                                                                onValueChange={(v) => setEditingTemplate({ ...editingTemplate, category: v as any })}
                                                            >
                                                                <SelectTrigger className="bg-neutral-900/50 border-neutral-700 text-white">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-neutral-900 border-neutral-700">
                                                                    {categoryOptions.map(cat => (
                                                                        <SelectItem key={cat.value} value={cat.value} className="text-white">
                                                                            {cat.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-neutral-300">Language</Label>
                                                            <Select
                                                                value={editingTemplate.language}
                                                                onValueChange={(v) => setEditingTemplate({ ...editingTemplate, language: v })}
                                                            >
                                                                <SelectTrigger className="bg-neutral-900/50 border-neutral-700 text-white">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-neutral-900 border-neutral-700">
                                                                    {languageOptions.map(lang => (
                                                                        <SelectItem key={lang.value} value={lang.value} className="text-white">
                                                                            {lang.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </GlassCard>

                                                <GlassCard className="p-5 space-y-4">
                                                    <h3 className="text-base font-medium text-white">Access Control</h3>
                                                    <div className="space-y-3">
                                                        <Label className="text-neutral-300 block mb-2">Available on Plans</Label>
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
                                                                                ? "bg-green-600/20 border-neutral-600/50 text-green-100"
                                                                                : "bg-neutral-900/50 border-neutral-700 text-neutral-400 hover:border-neutral-600"
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
                            </div>

                            {/* Live Preview Side Panel */}
                            <div className="w-[380px] bg-neutral-950/50 border-l border-white/5 flex flex-col">
                                <div className="p-4 border-b border-white/5">
                                    <h3 className="text-sm font-medium text-white flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-neutral-300" /> Live Preview
                                    </h3>
                                </div>
                                <div className="flex-1 p-6 flex items-center justify-center bg-[url('https://i.pinimg.com/originals/97/c0/07/97c00759d90d786d9b6096d274ad3e07.png')] bg-cover">
                                    <div className="scale-90">
                                        <PhonePreview template={editingTemplate} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="p-6 border-t border-white/10 bg-neutral-950/30">
                        <Button variant="ghost" onClick={() => setEditDialog(false)} className="text-neutral-400 hover:text-white mr-2">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white min-w-[100px]">
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

            <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
                <DialogContent className="bg-neutral-900/95 backdrop-blur-xl border-white/10 max-w-sm p-8 overflow-hidden">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-white text-center">Preview</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center">
                        {previewTemplate && <PhonePreview template={previewTemplate} />}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
