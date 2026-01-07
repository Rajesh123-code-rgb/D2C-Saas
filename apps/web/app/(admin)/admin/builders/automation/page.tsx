'use client';

import { useState, useEffect } from 'react';
import { buildersApi } from '@/lib/admin/api';
import { templateLibrary } from '@/lib/api';
import {
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    Loader2,
    RefreshCw,
    Zap,
    Play,
    Copy,
    Eye,
    ChevronRight,
    MessageSquare,
    Mail,
    Clock,
    GitBranch,
    Tag,
    Users,
    Filter,
    Search,
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

interface WorkflowNode {
    id: string;
    type: 'trigger' | 'action' | 'condition' | 'delay';
    name: string;
    config: Record<string, any>;
}

interface AutomationTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    triggerType: string;
    nodes: WorkflowNode[];
    isActive: boolean;
    allowedPlans: string[];
    usageCount: number;
    createdAt: string;
    updatedAt: string;
}

const categories = [
    { value: 'Orders', label: 'Orders', icon: Users },
    { value: 'Cart Recovery', label: 'Cart Recovery', icon: Tag },
    { value: 'Payments', label: 'Payments', icon: Tag },
    { value: 'Customer Lifecycle', label: 'Customer Lifecycle', icon: Users },
    { value: 'Engagement', label: 'Engagement', icon: MessageSquare },
    { value: 'Support', label: 'Support', icon: Mail },
    { value: 'Instagram', label: 'Instagram', icon: MessageSquare },
    { value: 'Reviews', label: 'Reviews', icon: GitBranch },
];

const triggerTypes = [
    { value: 'contact_created', label: 'Contact Created' },
    { value: 'message_received', label: 'Message Received' },
    { value: 'tag_added', label: 'Tag Added' },
    { value: 'form_submitted', label: 'Form Submitted' },
    { value: 'order_placed', label: 'Order Placed' },
    { value: 'cart_abandoned', label: 'Cart Abandoned' },
    { value: 'scheduled', label: 'Scheduled Time' },
];

const nodeTypes = [
    { type: 'action', subtype: 'send_whatsapp', label: 'Send WhatsApp', icon: MessageSquare, color: 'emerald' },
    { type: 'action', subtype: 'send_email', label: 'Send Email', icon: Mail, color: 'blue' },
    { type: 'action', subtype: 'add_tag', label: 'Add Tag', icon: Tag, color: 'purple' },
    { type: 'action', subtype: 'remove_tag', label: 'Remove Tag', icon: Tag, color: 'rose' },
    { type: 'action', subtype: 'assign_agent', label: 'Assign Agent', icon: Users, color: 'indigo' },
    { type: 'delay', subtype: 'wait', label: 'Wait/Delay', icon: Clock, color: 'amber' },
    { type: 'condition', subtype: 'if_else', label: 'If/Else Condition', icon: GitBranch, color: 'slate' },
];

const mockTemplates: AutomationTemplate[] = [
    {
        id: '1',
        name: 'Welcome New Contact',
        description: 'Send a welcome message when a new contact is created',
        category: 'welcome',
        triggerType: 'contact_created',
        nodes: [
            { id: 'n1', type: 'trigger', name: 'Contact Created', config: {} },
            { id: 'n2', type: 'delay', name: 'Wait 5 minutes', config: { duration: 5, unit: 'minutes' } },
            { id: 'n3', type: 'action', name: 'Send WhatsApp', config: { template: 'welcome_message' } },
        ],
        isActive: true,
        allowedPlans: ['starter', 'pro', 'enterprise'],
        usageCount: 245,
        createdAt: '2024-12-01T10:00:00',
        updatedAt: '2024-12-20T15:30:00',
    },
    {
        id: '2',
        name: 'Abandoned Cart Recovery',
        description: 'Follow up with customers who abandoned their cart',
        category: 'cart',
        triggerType: 'cart_abandoned',
        nodes: [
            { id: 'n1', type: 'trigger', name: 'Cart Abandoned', config: {} },
            { id: 'n2', type: 'delay', name: 'Wait 1 hour', config: { duration: 1, unit: 'hours' } },
            { id: 'n3', type: 'action', name: 'Send WhatsApp', config: { template: 'cart_reminder' } },
            { id: 'n4', type: 'delay', name: 'Wait 24 hours', config: { duration: 24, unit: 'hours' } },
            { id: 'n5', type: 'condition', name: 'Check if purchased', config: { field: 'has_purchased', operator: 'equals', value: false } },
            { id: 'n6', type: 'action', name: 'Send Email', config: { template: 'cart_discount' } },
        ],
        isActive: true,
        allowedPlans: ['pro', 'enterprise'],
        usageCount: 189,
        createdAt: '2024-11-15T09:00:00',
        updatedAt: '2024-12-18T11:00:00',
    },
    {
        id: '3',
        name: 'Lead Nurture Sequence',
        description: '5-day email nurture sequence for new leads',
        category: 'nurture',
        triggerType: 'form_submitted',
        nodes: [
            { id: 'n1', type: 'trigger', name: 'Form Submitted', config: { formId: 'lead_capture' } },
            { id: 'n2', type: 'action', name: 'Add Tag', config: { tag: 'new_lead' } },
            { id: 'n3', type: 'action', name: 'Send Email', config: { template: 'day1_intro' } },
            { id: 'n4', type: 'delay', name: 'Wait 2 days', config: { duration: 2, unit: 'days' } },
            { id: 'n5', type: 'action', name: 'Send Email', config: { template: 'day3_value' } },
        ],
        isActive: false,
        allowedPlans: ['pro', 'enterprise'],
        usageCount: 78,
        createdAt: '2024-10-20T14:00:00',
        updatedAt: '2024-12-10T09:00:00',
    },
    {
        id: '4',
        name: 'Order Confirmation',
        description: 'Send order confirmation via WhatsApp',
        category: 'notification',
        triggerType: 'order_placed',
        nodes: [
            { id: 'n1', type: 'trigger', name: 'Order Placed', config: {} },
            { id: 'n2', type: 'action', name: 'Send WhatsApp', config: { template: 'order_confirmed' } },
        ],
        isActive: true,
        allowedPlans: ['starter', 'pro', 'enterprise'],
        usageCount: 512,
        createdAt: '2024-09-01T08:00:00',
        updatedAt: '2024-12-22T16:00:00',
    },
];

const plans = ['free', 'starter', 'pro', 'enterprise'];

const defaultTemplates = [
    { name: 'order_confirmation', displayName: 'Order Confirmation', description: 'Send WhatsApp message when a new order is placed', category: 'Orders', trigger: 'order_created' },
    { name: 'cod_confirmation', displayName: 'COD Order Confirmation', description: 'Request confirmation for Cash on Delivery orders', category: 'Orders', trigger: 'cod_order_created' },
    { name: 'shipping_update', displayName: 'Shipping Update', description: 'Notify customers with tracking info when their order ships', category: 'Orders', trigger: 'order_shipped' },
    { name: 'delivery_confirmation', displayName: 'Delivery Confirmation', description: 'Confirm delivery and request feedback after 24 hours', category: 'Orders', trigger: 'order_delivered' },
    { name: 'abandoned_cart_1h', displayName: 'Abandoned Cart (1 Hour)', description: 'Gentle reminder about forgotten cart items', category: 'Cart Recovery', trigger: 'cart_abandoned' },
    { name: 'abandoned_cart_24h', displayName: 'Abandoned Cart (24 Hours)', description: 'Follow up with exclusive discount after 24 hours', category: 'Cart Recovery', trigger: 'cart_abandoned' },
    { name: 'payment_failed', displayName: 'Payment Failed Retry', description: 'Help customers complete failed payments', category: 'Payments', trigger: 'payment_failed' },
    { name: 'first_order_welcome', displayName: 'First Order Welcome', description: 'Welcome new customers with personalized message', category: 'Customer Lifecycle', trigger: 'first_order' },
    { name: 'insta_comment_auto_reply', displayName: 'Instagram Comment Auto-Reply', description: 'Automatically reply to comments on your posts', category: 'Instagram', trigger: 'instagram_comment' },
    { name: 'insta_dm_welcome', displayName: 'Instagram DM Welcome', description: 'Auto-respond to new Instagram DMs', category: 'Instagram', trigger: 'instagram_dm' },
    { name: 'new_contact_welcome', displayName: 'New Contact Welcome', description: 'Welcome new contacts with introductory message', category: 'Engagement', trigger: 'contact_created' },
    { name: 'review_request', displayName: 'Review Request', description: 'Request product review after delivery', category: 'Reviews', trigger: 'order_delivered' },
    // Email Templates
    { name: 'welcome_email_sequence', displayName: 'Welcome Email Sequence', description: 'Send a welcome email to new subscribers', category: 'Engagement', trigger: 'contact_created' },
    { name: 'order_confirmation_email', displayName: 'Order Confirmation Email', description: 'Send detailed order receipt via email', category: 'Orders', trigger: 'order_created' },
    { name: 'abandoned_cart_email_recovery', displayName: 'Abandoned Cart Email Recovery', description: 'Recover lost sales with an email reminder', category: 'Cart Recovery', trigger: 'cart_abandoned' },
];

export default function AutomationBuilderPage() {
    const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [editingTemplate, setEditingTemplate] = useState<AutomationTemplate | null>(null);
    const [editDialog, setEditDialog] = useState(false);
    const [previewDialog, setPreviewDialog] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<AutomationTemplate | null>(null);
    const [editingNode, setEditingNode] = useState<WorkflowNode | null>(null);
    const [emailTemplates, setEmailTemplates] = useState<any[]>([]);

    useEffect(() => {
        const loadEmailTemplates = async () => {
            try {
                const temps = await templateLibrary.getEmailTemplates();
                setEmailTemplates(temps);
            } catch (err) {
                console.error('Failed to load email templates', err);
            }
        };
        loadEmailTemplates();
    }, []);

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Fetch templates on mount
    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const data = await buildersApi.getAutomationTemplates();
            setTemplates((data || []) as AutomationTemplate[]);
        } catch (error) {
            console.error('Error fetching templates:', error);
            // Use mock templates as fallback
            setTemplates(mockTemplates);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        const newTemplate: AutomationTemplate = {
            id: `new_${Date.now()}`,
            name: '',
            description: '',
            category: 'welcome',
            triggerType: 'contact_created',
            nodes: [
                { id: 'trigger_1', type: 'trigger', name: 'Trigger', config: {} }
            ],
            isActive: false,
            allowedPlans: ['starter', 'pro', 'enterprise'],
            usageCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setEditingTemplate(newTemplate);
        setEditDialog(true);
    };

    const handleEdit = (template: AutomationTemplate) => {
        setEditingTemplate(JSON.parse(JSON.stringify(template)));
        setEditDialog(true);
    };

    const handleSave = async () => {
        if (!editingTemplate) return;

        try {
            setSaving(true);
            const isNew = !templates.find(t => t.id === editingTemplate.id) || editingTemplate.id.startsWith('new_');

            if (isNew) {
                // Create new template
                const { id, createdAt, updatedAt, usageCount, ...createData } = editingTemplate;
                await buildersApi.createAutomationTemplate(createData);
            } else {
                // Update existing template
                const { id, createdAt, updatedAt, usageCount, ...updateData } = editingTemplate;
                await buildersApi.updateAutomationTemplate(id, updateData);
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
            await buildersApi.deleteAutomationTemplate(id);
            await fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
        }
    };

    const handleDuplicate = (template: AutomationTemplate) => {
        const duplicate: AutomationTemplate = {
            ...template,
            id: `dup_${Date.now()}`,
            name: `${template.name} (Copy)`,
            usageCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setTemplates(prev => [...prev, duplicate]);
    };

    const toggleActive = async (id: string) => {
        const template = templates.find(t => t.id === id);
        if (!template) return;
        try {
            await buildersApi.updateAutomationTemplate(id, { isActive: !template.isActive });
            await fetchTemplates();
        } catch (error) {
            console.error('Error toggling template status:', error);
        }
    };

    const seedDefaults = async () => {
        if (!confirm('This will create default templates if they don\'t exist. Continue?')) return;
        setLoading(true);
        try {
            for (const t of defaultTemplates) {
                // Check if template with this name already exists
                const exists = templates.find(existing => existing.name === t.name);
                if (!exists) {
                    await buildersApi.createAutomationTemplate({
                        name: t.name,
                        description: t.description,
                        category: t.category,
                        triggerType: t.trigger,
                        isActive: true,
                        allowedPlans: ['starter', 'pro', 'enterprise'], // Default plans
                        nodes: [
                            {
                                id: 'trigger',
                                type: 'trigger',
                                name: t.displayName, // Use display name for readable node
                                config: { type: t.trigger }
                            }
                        ]
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

    const addNode = (type: string, subtype: string, label: string) => {
        if (!editingTemplate) return;
        const newNode: WorkflowNode = {
            id: `node_${Date.now()}`,
            type: type as WorkflowNode['type'],
            name: label,
            config: { subtype },
        };
        setEditingTemplate({
            ...editingTemplate,
            nodes: [...editingTemplate.nodes, newNode],
        });
        // Auto-open edit for new nodes if they require config
        if (subtype === 'send_email' || subtype === 'send_whatsapp' || type === 'delay') {
            setEditingNode(newNode);
        }
    };

    const updateNodeConfig = (nodeId: string, updates: Record<string, any>) => {
        if (!editingTemplate) return;
        setEditingTemplate({
            ...editingTemplate,
            nodes: editingTemplate.nodes.map(n =>
                n.id === nodeId ? { ...n, config: { ...n.config, ...updates } } : n
            ),
        });
        // Update local editing node state too
        setEditingNode(prev => prev && prev.id === nodeId ? { ...prev, config: { ...prev.config, ...updates } } : prev);
    };

    const removeNode = (nodeId: string) => {
        if (!editingTemplate) return;
        setEditingTemplate({
            ...editingTemplate,
            nodes: editingTemplate.nodes.filter(n => n.id !== nodeId),
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

    const getCategoryInfo = (category: string) => {
        return categories.find(c => c.value === category) || categories[0];
    };

    const getNodeIcon = (node: WorkflowNode) => {
        const nodeType = nodeTypes.find(nt => nt.subtype === node.config.subtype);
        if (nodeType) {
            const Icon = nodeType.icon;
            // Map color string to Tailwind class
            const colorClass =
                nodeType.color === 'emerald' ? 'text-emerald-400' :
                    nodeType.color === 'blue' ? 'text-blue-400' :
                        nodeType.color === 'purple' ? 'text-purple-400' :
                            nodeType.color === 'rose' ? 'text-rose-400' :
                                nodeType.color === 'indigo' ? 'text-indigo-400' :
                                    nodeType.color === 'amber' ? 'text-amber-400' :
                                        'text-slate-400';

            return <Icon className={cn("h-4 w-4", colorClass)} />;
        }
        if (node.type === 'trigger') return <Zap className="h-4 w-4 text-amber-400" />;
        if (node.type === 'delay') return <Clock className="h-4 w-4 text-amber-400" />;
        if (node.type === 'condition') return <GitBranch className="h-4 w-4 text-slate-400" />;
        return <Zap className="h-4 w-4 text-slate-400" />;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Automation Templates</h1>
                    <p className="text-slate-400 mt-1">Create and manage pre-built workflow templates for users</p>
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
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20" onClick={handleCreateNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <GlassCard className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-56 bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500/50 focus:ring-indigo-500/20">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-indigo-400" />
                                <span className="capitalize">
                                    {categoryFilter === 'all' ? 'All Categories' : categories.find(c => c.value === categoryFilter)?.label || categoryFilter}
                                </span>
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="all" className="text-white">All Categories</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.value} value={cat.value} className="text-white">
                                    {cat.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </GlassCard>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="h-12 w-12 text-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Total Templates</p>
                    <p className="text-2xl font-bold text-white mt-1">{templates.length}</p>
                </GlassCard>
                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="h-12 w-12 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Active</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                        {templates.filter(t => t.isActive).length}
                    </p>
                </GlassCard>
                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Play className="h-12 w-12 text-indigo-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Total Usage</p>
                    <p className="text-2xl font-bold text-white mt-1">
                        {templates.reduce((sum, t) => sum + t.usageCount, 0).toLocaleString()}
                    </p>
                </GlassCard>
                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Tag className="h-12 w-12 text-purple-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Categories</p>
                    <p className="text-2xl font-bold text-white mt-1">
                        {new Set(templates.map(t => t.category)).size}
                    </p>
                </GlassCard>
            </div>

            {/* Templates Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => {
                    const catInfo = getCategoryInfo(template.category);
                    const CatIcon = catInfo.icon;
                    return (
                        <GlassCard key={template.id} className="flex flex-col h-full group">
                            <div className="p-5 flex-1 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                                            <CatIcon className="h-5 w-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold text-base leading-none">{template.name}</h3>
                                            <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700 mt-1.5 px-1.5 py-0 h-5">
                                                {catInfo.label}
                                            </Badge>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={template.isActive}
                                        onCheckedChange={() => toggleActive(template.id)}
                                        className="data-[state=checked]:bg-emerald-500"
                                    />
                                </div>

                                <p className="text-sm text-slate-400 line-clamp-2 min-h-[40px]">
                                    {template.description}
                                </p>

                                {/* Workflow Preview */}
                                <div className="flex items-center gap-1 overflow-x-auto pb-2 pt-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                    {template.nodes.slice(0, 4).map((node, i) => (
                                        <div key={node.id} className="flex items-center flex-shrink-0">
                                            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-slate-900/50 border border-slate-700/50 text-xs text-slate-300 whitespace-nowrap">
                                                {getNodeIcon(node)}
                                                <span className="max-w-[80px] truncate">{node.name}</span>
                                            </div>
                                            {i < Math.min(template.nodes.length - 1, 3) && (
                                                <ChevronRight className="h-3 w-3 text-slate-600 mx-0.5 flex-shrink-0" />
                                            )}
                                        </div>
                                    ))}
                                    {template.nodes.length > 4 && (
                                        <Badge variant="outline" className="text-slate-500 border-slate-700 text-[10px] ml-1 flex-shrink-0 h-6">
                                            +{template.nodes.length - 4}
                                        </Badge>
                                    )}
                                </div>

                                {/* Plan Badges */}
                                <div className="flex flex-wrap gap-1.5">
                                    {template.allowedPlans.map(plan => (
                                        <Badge key={plan} variant="secondary" className="bg-slate-800 text-slate-400 border-transparent text-[10px] uppercase tracking-wider px-1.5">
                                            {plan}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Stats & Actions */}
                            <div className="px-5 py-3 border-t border-white/5 bg-white/5 flex items-center justify-between mt-auto">
                                <div className="text-xs text-slate-400 font-medium">
                                    <span className="text-slate-200">{template.usageCount}</span> active uses
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full"
                                        onClick={() => {
                                            setPreviewTemplate(template);
                                            setPreviewDialog(true);
                                        }}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
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
                                        className="h-8 w-8 p-0 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-full"
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
                    );
                })}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="text-center py-20 px-4">
                    <GlassCard className="inline-flex p-6 mb-6 rounded-full bg-slate-900/50 border-slate-800">
                        <Zap className="h-10 w-10 text-slate-500" />
                    </GlassCard>
                    <h3 className="text-xl font-medium text-white">No templates found</h3>
                    <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                        No automation templates match your search. Try adjusting your filters or create a new template.
                    </p>
                    <Button className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCreateNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                    </Button>
                </div>
            )}

            {/* Edit/Create Dialog */}
            <Dialog open={editDialog} onOpenChange={setEditDialog}>
                <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
                    <DialogHeader className="p-6 border-b border-white/10">
                        <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                            {editingTemplate?.id?.startsWith('new_') ? <Plus className="h-5 w-5 text-indigo-400" /> : <Edit className="h-5 w-5 text-indigo-400" />}
                            {editingTemplate?.id?.startsWith('new_') ? 'Create Analysis Template' : 'Edit Automation Template'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Configure triggers, actions, and logical flow for this automation.
                        </DialogDescription>
                    </DialogHeader>

                    {editingTemplate && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <Tabs defaultValue="details" className="flex-1 flex flex-col h-full">
                                <div className="px-6 pt-4">
                                    <TabsList className="bg-slate-950/50 border border-white/5 w-full justify-start h-auto p-1">
                                        <TabsTrigger value="details" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300 py-2">Details</TabsTrigger>
                                        <TabsTrigger value="workflow" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300 py-2">Workflow ({editingTemplate.nodes.length})</TabsTrigger>
                                        <TabsTrigger value="access" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300 py-2">Access Control</TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    <TabsContent value="details" className="space-y-6 mt-0">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Template Name</Label>
                                                <Input
                                                    value={editingTemplate.name}
                                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                                    placeholder="e.g., Welcome New Contact"
                                                    className="bg-slate-950/50 border-slate-800 text-white focus:border-indigo-500/50"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Category</Label>
                                                <Select
                                                    value={editingTemplate.category}
                                                    onValueChange={(v) => setEditingTemplate({ ...editingTemplate, category: v })}
                                                >
                                                    <SelectTrigger className="bg-slate-950/50 border-slate-800 text-white focus:border-indigo-500/50">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-slate-800">
                                                        {categories.map(cat => (
                                                            <SelectItem key={cat.value} value={cat.value} className="text-white focus:bg-slate-800 focus:text-white">
                                                                {cat.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Description</Label>
                                            <Textarea
                                                value={editingTemplate.description}
                                                onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                                                placeholder="Describe what this automation does..."
                                                className="bg-slate-950/50 border-slate-800 text-white min-h-[100px] focus:border-indigo-500/50"
                                            />
                                        </div>

                                        <GlassCard className="p-4 bg-amber-500/5 border-amber-500/10">
                                            <div className="space-y-2">
                                                <Label className="text-amber-300 font-medium flex items-center gap-2">
                                                    <Zap className="h-4 w-4" /> Trigger Event
                                                </Label>
                                                <Select
                                                    value={editingTemplate.triggerType}
                                                    onValueChange={(v) => setEditingTemplate({ ...editingTemplate, triggerType: v })}
                                                >
                                                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-slate-700">
                                                        {triggerTypes.map(trigger => (
                                                            <SelectItem key={trigger.value} value={trigger.value} className="text-white">
                                                                {trigger.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-amber-500/60 mt-2">
                                                    This event will start the automation for users who install this template.
                                                </p>
                                            </div>
                                        </GlassCard>
                                    </TabsContent>

                                    <TabsContent value="workflow" className="space-y-6 mt-0">
                                        <div className="flex flex-col gap-4">
                                            {/* Workflow Nodes */}
                                            <div className="space-y-3">
                                                {editingTemplate.nodes.map((node, index) => (
                                                    <div key={node.id} className="relative pl-8 group">
                                                        {/* Connector Line */}
                                                        {index < editingTemplate.nodes.length - 1 && (
                                                            <div className="absolute left-[19px] top-10 bottom-[-20px] w-0.5 bg-slate-800 group-last:hidden" />
                                                        )}

                                                        {/* Number Badge */}
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 font-mono text-sm z-10 shadow-sm">
                                                            {index + 1}
                                                        </div>

                                                        <GlassCard
                                                            className="flex items-center gap-4 p-4 hover:border-indigo-500/50 transition-all cursor-pointer group-hover/node:bg-slate-800/50"
                                                            onClick={() => setEditingNode(node)}
                                                        >
                                                            <div className={cn(
                                                                "p-3 rounded-lg flex-shrink-0",
                                                                node.type === 'trigger' ? 'bg-amber-500/20' :
                                                                    node.type === 'action' ? 'bg-indigo-500/20' :
                                                                        node.type === 'delay' ? 'bg-blue-500/20' :
                                                                            'bg-slate-700'
                                                            )}>
                                                                {getNodeIcon(node)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-white truncate">{node.name}</p>
                                                                <p className="text-xs text-slate-400 capitalize flex items-center gap-1 mt-0.5">
                                                                    {node.type} <span className="text-slate-600">•</span> {node.config.subtype || 'Default'}
                                                                </p>
                                                            </div>
                                                            {node.type !== 'trigger' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8 p-0 rounded-full"
                                                                    onClick={() => removeNode(node.id)}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </GlassCard>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Node Panel */}
                                            <div className="mt-4 pt-6 border-t border-white/5">
                                                <Label className="text-slate-300 mb-4 block">Add Next Step</Label>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {nodeTypes.map((nt) => {
                                                        const Icon = nt.icon;
                                                        // Get the mapped color styles
                                                        const colorStyle =
                                                            nt.color === 'emerald' ? 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10' :
                                                                nt.color === 'blue' ? 'text-blue-400 border-blue-500/20 hover:bg-blue-500/10' :
                                                                    nt.color === 'purple' ? 'text-purple-400 border-purple-500/20 hover:bg-purple-500/10' :
                                                                        nt.color === 'rose' ? 'text-rose-400 border-rose-500/20 hover:bg-rose-500/10' :
                                                                            nt.color === 'indigo' ? 'text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10' :
                                                                                nt.color === 'amber' ? 'text-amber-400 border-amber-500/20 hover:bg-amber-500/10' :
                                                                                    'text-slate-400 border-slate-700 hover:bg-slate-700';

                                                        return (
                                                            <Button
                                                                key={nt.subtype}
                                                                variant="outline"
                                                                className={cn("justify-start h-auto py-3 bg-slate-900/50", colorStyle)}
                                                                onClick={() => addNode(nt.type, nt.subtype, nt.label)}
                                                            >
                                                                <Icon className="h-4 w-4 mr-2.5 flex-shrink-0" />
                                                                <span className="text-sm truncate">{nt.label}</span>
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="access" className="space-y-6 mt-0">
                                        <GlassCard className="flex items-center justify-between p-5">
                                            <div>
                                                <Label className="text-white text-base">Activate Template</Label>
                                                <p className="text-sm text-slate-400 mt-1">Make this template visible in the public library</p>
                                            </div>
                                            <Switch
                                                checked={editingTemplate.isActive}
                                                onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, isActive: checked })}
                                                className="data-[state=checked]:bg-emerald-500"
                                            />
                                        </GlassCard>

                                        <div className="space-y-4">
                                            <Label className="text-slate-300">Available on Plans</Label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {plans.map(plan => {
                                                    const isSelected = editingTemplate.allowedPlans.includes(plan);
                                                    return (
                                                        <div
                                                            key={plan}
                                                            onClick={() => togglePlan(plan)}
                                                            className={cn(
                                                                "cursor-pointer px-4 py-3 rounded-lg border transition-all relative overflow-hidden",
                                                                isSelected
                                                                    ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-100"
                                                                    : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="capitalize font-medium">{plan}</span>
                                                                {isSelected && <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
                                                            </div>
                                                            <p className="text-[10px] opacity-70">
                                                                {isSelected ? 'Access Granted' : 'Locked'}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    )}

                    <DialogFooter className="p-6 border-t border-white/10 bg-slate-950/30">
                        <Button variant="ghost" onClick={() => setEditDialog(false)} className="text-slate-400 hover:text-white mr-2">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]">
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

            {/* Edit Node Dialog */}
            <Dialog open={!!editingNode} onOpenChange={(open) => !open && setEditingNode(null)}>
                <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Configure Node</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Set parameters for {editingNode?.name}
                        </DialogDescription>
                    </DialogHeader>

                    {editingNode && (
                        <div className="space-y-4 py-4">
                            {editingNode.config.subtype === 'send_email' && (
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Email Template</Label>
                                    <Select
                                        value={editingNode.config.templateId || ''}
                                        onValueChange={(v) => updateNodeConfig(editingNode.id, { templateId: v })}
                                    >
                                        <SelectTrigger className="bg-slate-950/50 border-slate-800 text-white">
                                            <SelectValue placeholder="Select a template" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800">
                                            {emailTemplates.length === 0 ? (
                                                <SelectItem value="none" disabled>No templates available</SelectItem>
                                            ) : (
                                                emailTemplates.map(t => (
                                                    <SelectItem key={t.id} value={t.id} className="text-white">
                                                        {t.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-slate-500">
                                        Select the email template to send.
                                    </p>
                                </div>
                            )}

                            {editingNode.config.subtype === 'send_whatsapp' && (
                                <div className="space-y-2">
                                    <Label className="text-slate-300">WhatsApp Template</Label>
                                    <Input
                                        placeholder="Template Name (e.g. welcome_msg)"
                                        value={editingNode.config.template || ''}
                                        onChange={(e) => updateNodeConfig(editingNode.id, { template: e.target.value })}
                                        className="bg-slate-950/50 border-slate-800 text-white"
                                    />
                                </div>
                            )}

                            {editingNode.type === 'delay' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Duration</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={editingNode.config.duration || 1}
                                            onChange={(e) => updateNodeConfig(editingNode.id, { duration: parseInt(e.target.value) })}
                                            className="bg-slate-950/50 border-slate-800 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Unit</Label>
                                        <Select
                                            value={editingNode.config.unit || 'hours'}
                                            onValueChange={(v) => updateNodeConfig(editingNode.id, { unit: v })}
                                        >
                                            <SelectTrigger className="bg-slate-950/50 border-slate-800 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800">
                                                <SelectItem value="minutes">Minutes</SelectItem>
                                                <SelectItem value="hours">Hours</SelectItem>
                                                <SelectItem value="days">Days</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={() => setEditingNode(null)} className="bg-indigo-600 text-white hover:bg-indigo-700">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Node Dialog */}
            <Dialog open={!!editingNode} onOpenChange={(open) => !open && setEditingNode(null)}>
                <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Configure Node</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Set parameters for {editingNode?.name}
                        </DialogDescription>
                    </DialogHeader>

                    {editingNode && (
                        <div className="space-y-4 py-4">
                            {editingNode.config.subtype === 'send_email' && (
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Email Template</Label>
                                    <Select
                                        value={editingNode.config.templateId || ''}
                                        onValueChange={(v) => updateNodeConfig(editingNode.id, { templateId: v })}
                                    >
                                        <SelectTrigger className="bg-slate-950/50 border-slate-800 text-white">
                                            <SelectValue placeholder="Select a template" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800">
                                            {emailTemplates.length === 0 ? (
                                                <SelectItem value="none" disabled>No templates available</SelectItem>
                                            ) : (
                                                emailTemplates.map(t => (
                                                    <SelectItem key={t.id} value={t.id} className="text-white">
                                                        {t.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-slate-500">
                                        Select the email template to send.
                                    </p>
                                </div>
                            )}

                            {editingNode.config.subtype === 'send_whatsapp' && (
                                <div className="space-y-2">
                                    <Label className="text-slate-300">WhatsApp Template</Label>
                                    <Input
                                        placeholder="Template Name (e.g. welcome_msg)"
                                        value={editingNode.config.template || ''}
                                        onChange={(e) => updateNodeConfig(editingNode.id, { template: e.target.value })}
                                        className="bg-slate-950/50 border-slate-800 text-white"
                                    />
                                </div>
                            )}

                            {editingNode.type === 'delay' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Duration</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={editingNode.config.duration || 1}
                                            onChange={(e) => updateNodeConfig(editingNode.id, { duration: parseInt(e.target.value) })}
                                            className="bg-slate-950/50 border-slate-800 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Unit</Label>
                                        <Select
                                            value={editingNode.config.unit || 'hours'}
                                            onValueChange={(v) => updateNodeConfig(editingNode.id, { unit: v })}
                                        >
                                            <SelectTrigger className="bg-slate-950/50 border-slate-800 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800">
                                                <SelectItem value="minutes">Minutes</SelectItem>
                                                <SelectItem value="hours">Hours</SelectItem>
                                                <SelectItem value="days">Days</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={() => setEditingNode(null)} className="bg-indigo-600 text-white hover:bg-indigo-700">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
                <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white">Template Preview</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Structure of the automation workflow
                        </DialogDescription>
                    </DialogHeader>

                    {previewTemplate && (
                        <div className="py-4 relative">
                            <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-slate-800" />
                            <div className="space-y-4 relative z-10">
                                {previewTemplate.nodes.map((node, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-14 w-14 rounded-xl flex items-center justify-center border-4 border-slate-900",
                                            node.type === 'trigger' ? 'bg-amber-500 text-white' :
                                                node.type === 'action' ? 'bg-indigo-600 text-white' :
                                                    node.type === 'delay' ? 'bg-blue-500 text-white' :
                                                        'bg-slate-700 text-slate-300'
                                        )}>
                                            {getNodeIcon(node)}
                                        </div>
                                        <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex-1">
                                            <p className="text-sm font-medium text-white">{node.name}</p>
                                            <p className="text-xs text-slate-400 capitalize">{node.type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={() => setPreviewDialog(false)} className="bg-indigo-600 hover:bg-indigo-700">
                            Close Preview
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
