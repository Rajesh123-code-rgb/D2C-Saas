'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Search,
    Zap,
    CheckCircle,
    XCircle,
    Play,
    Pause,
    Edit,
    Trash2,
    MessageSquare,
    Loader2,
    ShoppingCart,
    CreditCard,
    Heart,
    Sparkles,
    Package,
    Workflow,
    Instagram,
    Star,
    Headphones,
    ChevronDown,
    ChevronUp,
    X,
    Save,
    Clock,
    Tag,
    Send,
    Settings2,
    AlertCircle,
    History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Automation {
    id: string;
    name: string;
    description: string;
    status: string;
    triggerType: string;
    triggerConfig?: any;
    actions?: ActionConfig[];
    runCount: number;
    successCount: number;
    lastRunAt: string | null;
    createdAt: string;
}

interface Template {
    id: string;
    name: string;
    description: string;
    category: string;
    triggerType: string;
    preview: string;
    useCase?: string;
    flowSteps?: string[];
}

interface TemplateConfig {
    id: string;
    name: string;
    description: string;
    category: string;
    triggerType: string;
    triggerConfig?: any;
    actions?: ActionConfig[];
}

interface ActionConfig {
    type: string;
    templateId?: string;
    message?: string;
    channel?: string;
    tagName?: string;
    waitDuration?: number;
    waitUnit?: string;
    conditions?: any[];
    thenActions?: ActionConfig[];
    elseActions?: ActionConfig[];
    fieldName?: string;
    fieldValue?: any;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    active: { color: 'bg-green-100 text-green-700', icon: Play, label: 'Active' },
    paused: { color: 'bg-orange-100 text-orange-700', icon: Pause, label: 'Paused' },
    draft: { color: 'bg-gray-100 text-gray-700', icon: Edit, label: 'Draft' },
    error: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Error' },
};

const categoryConfig: Record<string, { icon: any; color: string }> = {
    'Orders': { icon: Package, color: 'bg-blue-500' },
    'Cart Recovery': { icon: ShoppingCart, color: 'bg-orange-500' },
    'Payments': { icon: CreditCard, color: 'bg-green-500' },
    'Customer Lifecycle': { icon: Heart, color: 'bg-pink-500' },
    'Engagement': { icon: MessageSquare, color: 'bg-purple-500' },
    'Support': { icon: Headphones, color: 'bg-cyan-500' },
    'Instagram': { icon: Instagram, color: 'bg-gradient-to-br from-purple-600 to-pink-500' },
    'Reviews': { icon: Star, color: 'bg-yellow-500' },
};

const triggerLabels: Record<string, string> = {
    order_created: 'Order Created',
    cod_order_created: 'COD Order',
    order_shipped: 'Order Shipped',
    order_delivered: 'Order Delivered',
    order_cancelled: 'Order Cancelled',
    cart_abandoned: 'Cart Abandoned',
    payment_failed: 'Payment Failed',
    payment_success: 'Payment Success',
    refund_processed: 'Refund Processed',
    first_order: 'First Order',
    repeat_order: 'Repeat Order',
    high_value_order: 'High Value Order',
    contact_created: 'Contact Created',
    contact_birthday: 'Birthday',
    customer_inactive: 'Customer Inactive',
    tag_added: 'Tag Added',
    message_received: 'Message Received',
    keyword_match: 'Keyword Match',
    conversation_closed: 'Conversation Closed',
    instagram_comment: 'Instagram Comment',
    instagram_dm: 'Instagram DM',
    instagram_story_mention: 'Story Mention',
    instagram_story_reply: 'Story Reply',
    positive_review: 'Positive Review',
    negative_review: 'Negative Review',
    sla_warning: 'SLA Warning',
};

const actionTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
    send_whatsapp_template: { label: 'Send WhatsApp Template', icon: Send, color: 'bg-green-500' },
    send_whatsapp_message: { label: 'Send WhatsApp Message', icon: MessageSquare, color: 'bg-green-500' },
    send_instagram_dm: { label: 'Send Instagram DM', icon: Instagram, color: 'bg-pink-500' },
    send_email: { label: 'Send Email', icon: Send, color: 'bg-blue-500' },
    add_tag: { label: 'Add Tag', icon: Tag, color: 'bg-purple-500' },
    remove_tag: { label: 'Remove Tag', icon: Tag, color: 'bg-gray-500' },
    wait: { label: 'Wait', icon: Clock, color: 'bg-orange-500' },
    condition: { label: 'Condition', icon: AlertCircle, color: 'bg-yellow-500' },
    update_contact: { label: 'Update Contact', icon: Settings2, color: 'bg-cyan-500' },
    assign_to_agent: { label: 'Assign to Agent', icon: Headphones, color: 'bg-indigo-500' },
};

// ==================== WORKFLOW EDITOR MODAL ====================
function WorkflowEditorModal({
    isOpen,
    onClose,
    template,
    automation,
    onSave,
}: {
    isOpen: boolean;
    onClose: () => void;
    template?: TemplateConfig | null;
    automation?: Automation | null;
    onSave: (data: any, status: 'draft' | 'active') => Promise<void>;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [triggerType, setTriggerType] = useState('');
    const [triggerConfig, setTriggerConfig] = useState<any>({});
    const [actions, setActions] = useState<ActionConfig[]>([]);
    const [saving, setSaving] = useState(false);
    const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

    // Initialize form when template or automation changes
    useEffect(() => {
        if (template) {
            setName(template.name || '');
            setDescription(template.description || '');
            setTriggerType(template.triggerType || '');
            setTriggerConfig(template.triggerConfig || {});
            setActions(template.actions || []);
        } else if (automation) {
            setName(automation.name || '');
            setDescription(automation.description || '');
            setTriggerType(automation.triggerType || '');
            setTriggerConfig(automation.triggerConfig || {});
            setActions(automation.actions || []);
        }
    }, [template, automation]);

    const handleSave = async (status: 'draft' | 'active') => {
        setSaving(true);
        try {
            await onSave({
                id: automation?.id,
                templateId: template?.id,
                name,
                description,
                triggerType,
                triggerConfig,
                actions,
            }, status);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const updateAction = (index: number, updates: Partial<ActionConfig>) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], ...updates };
        setActions(newActions);
    };

    const deleteAction = (index: number) => {
        setActions(actions.filter((_, i) => i !== index));
        setEditingStepIndex(null);
    };

    const addAction = (type: string) => {
        const newAction: ActionConfig = { type };
        if (type === 'wait') {
            newAction.waitDuration = 1;
            newAction.waitUnit = 'hours';
        }
        setActions([...actions, newAction]);
        setEditingStepIndex(actions.length);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col m-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Workflow className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">
                                {automation ? 'Edit Automation' : 'Configure Workflow'}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {automation ? 'Modify your automation settings' : 'Customize this template before activation'}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Workflow Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter workflow name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="trigger">Trigger</Label>
                            <Select value={triggerType} onValueChange={setTriggerType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select trigger" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(triggerLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what this automation does"
                            rows={2}
                        />
                    </div>

                    {/* Trigger Info Card */}
                    <Card className="border-primary/30 bg-primary/5">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-primary/20">
                                    <Zap className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Trigger: {triggerLabels[triggerType] || triggerType}</p>
                                    <p className="text-xs text-muted-foreground">This workflow starts when this event occurs</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Workflow Steps */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Workflow Steps
                            </h3>
                            <span className="text-sm text-muted-foreground">{actions.length} steps</span>
                        </div>

                        {actions.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-8">
                                    <Sparkles className="h-8 w-8 text-muted-foreground opacity-30 mb-2" />
                                    <p className="text-sm text-muted-foreground">No steps yet. Add your first action below.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {actions.map((action, index) => {
                                    const actionInfo = actionTypeLabels[action.type] || {
                                        label: action.type,
                                        icon: Settings2,
                                        color: 'bg-gray-500'
                                    };
                                    const ActionIcon = actionInfo.icon;
                                    const isEditing = editingStepIndex === index;

                                    return (
                                        <Card
                                            key={index}
                                            className={cn(
                                                "transition-all cursor-pointer hover:shadow-md",
                                                isEditing && "ring-2 ring-primary"
                                            )}
                                            onClick={() => setEditingStepIndex(isEditing ? null : index)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-3">
                                                    {/* Step Number */}
                                                    <div className="flex flex-col items-center">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold",
                                                            actionInfo.color
                                                        )}>
                                                            {index + 1}
                                                        </div>
                                                        {index < actions.length - 1 && (
                                                            <div className="w-0.5 h-4 bg-border mt-1" />
                                                        )}
                                                    </div>

                                                    {/* Action Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <ActionIcon className="h-4 w-4" />
                                                                <span className="font-medium text-sm">{actionInfo.label}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        deleteAction(index);
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Action Summary */}
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {action.type === 'send_whatsapp_template' && (
                                                                <span>Template: {action.templateId || 'Not set'}</span>
                                                            )}
                                                            {action.type === 'add_tag' && (
                                                                <span>Tag: {action.tagName || 'Not set'}</span>
                                                            )}
                                                            {action.type === 'wait' && (
                                                                <span>Wait {action.waitDuration || 1} {action.waitUnit || 'hours'}</span>
                                                            )}
                                                            {action.type === 'send_whatsapp_message' && (
                                                                <span className="truncate block">{action.message || 'No message'}</span>
                                                            )}
                                                        </div>

                                                        {/* Expanded Edit Form */}
                                                        {isEditing && (
                                                            <div className="mt-4 pt-4 border-t space-y-3" onClick={(e) => e.stopPropagation()}>
                                                                {(action.type === 'send_whatsapp_template' || action.type === 'send_instagram_dm') && (
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs">Template ID</Label>
                                                                        <Input
                                                                            value={action.templateId || ''}
                                                                            onChange={(e) => updateAction(index, { templateId: e.target.value })}
                                                                            placeholder="e.g., order_confirmation"
                                                                            className="h-8 text-sm"
                                                                        />
                                                                    </div>
                                                                )}
                                                                {action.type === 'send_whatsapp_message' && (
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs">Message</Label>
                                                                        <Textarea
                                                                            value={action.message || ''}
                                                                            onChange={(e) => updateAction(index, { message: e.target.value })}
                                                                            placeholder="Enter your message..."
                                                                            rows={2}
                                                                            className="text-sm"
                                                                        />
                                                                    </div>
                                                                )}
                                                                {(action.type === 'add_tag' || action.type === 'remove_tag') && (
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs">Tag Name</Label>
                                                                        <Input
                                                                            value={action.tagName || ''}
                                                                            onChange={(e) => updateAction(index, { tagName: e.target.value })}
                                                                            placeholder="e.g., vip-customer"
                                                                            className="h-8 text-sm"
                                                                        />
                                                                    </div>
                                                                )}
                                                                {action.type === 'wait' && (
                                                                    <div className="flex gap-2">
                                                                        <div className="space-y-2 flex-1">
                                                                            <Label className="text-xs">Duration</Label>
                                                                            <Input
                                                                                type="number"
                                                                                value={action.waitDuration || 1}
                                                                                onChange={(e) => updateAction(index, { waitDuration: Number(e.target.value) })}
                                                                                className="h-8 text-sm"
                                                                                min={1}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2 flex-1">
                                                                            <Label className="text-xs">Unit</Label>
                                                                            <Select
                                                                                value={action.waitUnit || 'hours'}
                                                                                onValueChange={(v) => updateAction(index, { waitUnit: v })}
                                                                            >
                                                                                <SelectTrigger className="h-8 text-sm">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
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
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {/* Add Step Dropdown */}
                        <div className="pt-2">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addAction('send_whatsapp_template')}
                                    className="gap-1"
                                >
                                    <Send className="h-3 w-3" /> WhatsApp Template
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addAction('add_tag')}
                                    className="gap-1"
                                >
                                    <Tag className="h-3 w-3" /> Add Tag
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addAction('wait')}
                                    className="gap-1"
                                >
                                    <Clock className="h-3 w-3" /> Wait
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addAction('send_whatsapp_message')}
                                    className="gap-1"
                                >
                                    <MessageSquare className="h-3 w-3" /> Custom Message
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => handleSave('draft')}
                            disabled={saving || !name}
                        >
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Draft
                        </Button>
                        <Button
                            onClick={() => handleSave('active')}
                            disabled={saving || !name}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            Activate
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==================== MAIN PAGE COMPONENT ====================
export default function AutomationsPage() {
    const [activeTab, setActiveTab] = useState('automations');
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

    // Workflow Editor State
    const [showWorkflowEditor, setShowWorkflowEditor] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
    const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
    const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

    useEffect(() => {
        fetchAutomations();
        fetchTemplates();
    }, []);

    const fetchAutomations = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/automations');
            if (!response.ok) throw new Error('Failed to fetch automations');
            const data = await response.json();
            setAutomations(Array.isArray(data) ? data : data.automations || []);
        } catch (error) {
            console.error('Error fetching automations:', error);
            setAutomations([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        // Fallback templates
        const fallbackTemplates: Template[] = [
            { id: 'order_confirmation', name: 'Order Confirmation', description: 'Send WhatsApp message when a new order is placed', category: 'Orders', triggerType: 'order_created', preview: 'Order Created → Send WhatsApp Template → Add Tag', useCase: 'Instantly confirm orders to build customer trust. Reduces support inquiries by 40%.', flowSteps: ['Order placed on your store', 'WhatsApp confirmation sent', 'Customer tagged as "Order Placed"'] },
            { id: 'cod_confirmation', name: 'COD Order Confirmation', description: 'Request confirmation for Cash on Delivery orders', category: 'Orders', triggerType: 'cod_order_created', preview: 'COD Order → Send Confirmation → Wait 6h → Remind', useCase: 'Reduce COD order failures by getting customer commitment upfront.', flowSteps: ['COD order received', 'Confirmation request sent', 'Wait 6 hours', 'Send reminder if no response'] },
            { id: 'shipping_update', name: 'Shipping Update', description: 'Notify customers with tracking info when their order ships', category: 'Orders', triggerType: 'order_shipped', preview: 'Order Shipped → Send Tracking Info → Add Tag', useCase: 'Keep customers informed about shipment status.', flowSteps: ['Order marked as shipped', 'WhatsApp notification with tracking', 'Customer tagged as "In Transit"'] },
            { id: 'delivery_confirmation', name: 'Delivery Confirmation', description: 'Confirm delivery and request feedback after 24 hours', category: 'Orders', triggerType: 'order_delivered', preview: 'Order Delivered → Confirm → Wait 24h → Request Review', useCase: 'Close the loop on orders and capture valuable feedback.', flowSteps: ['Delivery status updated', 'Confirmation message sent', 'Wait 24 hours', 'Request product review'] },
            { id: 'abandoned_cart_1h', name: 'Abandoned Cart (1 Hour)', description: 'Gentle reminder about forgotten cart items', category: 'Cart Recovery', triggerType: 'cart_abandoned', preview: 'Cart Abandoned → Wait 1h → Send Reminder', useCase: 'Recover lost sales with timely reminders.', flowSteps: ['Cart abandoned detected', 'Wait 1 hour', 'Send friendly reminder'] },
            { id: 'abandoned_cart_24h', name: 'Abandoned Cart (24 Hours)', description: 'Follow up with exclusive discount after 24 hours', category: 'Cart Recovery', triggerType: 'cart_abandoned', preview: 'Cart Abandoned → Wait 24h → Send 10% Discount', useCase: 'Win back hesitant shoppers with an incentive.', flowSteps: ['Cart still abandoned after 24h', 'Generate discount code', 'Send 10% off offer'] },
            { id: 'payment_failed', name: 'Payment Failed Retry', description: 'Help customers complete failed payments', category: 'Payments', triggerType: 'payment_failed', preview: 'Payment Failed → Send Retry Link → Wait 2h → Remind', useCase: 'Salvage orders lost to payment issues.', flowSteps: ['Payment failure detected', 'Send retry payment link', 'Wait 2 hours', 'Send reminder'] },
            { id: 'first_order_welcome', name: 'First Order Welcome', description: 'Welcome new customers with personalized message', category: 'Customer Lifecycle', triggerType: 'first_order', preview: 'First Order → Welcome Message → Add Tag', useCase: 'Make a great first impression on new customers.', flowSteps: ['First order detected', 'Send welcome message', 'Tag as "New Customer"'] },
            { id: 'insta_comment_auto_reply', name: 'Instagram Comment Auto-Reply', description: 'Automatically reply to comments on your posts', category: 'Instagram', triggerType: 'instagram_comment', preview: 'Comment Received → Send Auto DM → Add to Contacts', useCase: 'Never miss a potential lead from Instagram comments.', flowSteps: ['Comment received on post', 'Send personalized DM', 'Add to contact database'] },
            { id: 'insta_dm_welcome', name: 'Instagram DM Welcome', description: 'Auto-respond to new Instagram DMs', category: 'Instagram', triggerType: 'instagram_dm', preview: 'New DM → Welcome Message → Quick Replies Menu', useCase: 'Respond instantly to DMs 24/7.', flowSteps: ['New DM received', 'Send welcome message', 'Present quick reply options'] },
            { id: 'new_contact_welcome', name: 'New Contact Welcome', description: 'Welcome new contacts with introductory message', category: 'Engagement', triggerType: 'contact_created', preview: 'Contact Created → Welcome Message → Set Lifecycle', useCase: 'Start every relationship on the right foot.', flowSteps: ['New contact added', 'Send welcome message', 'Set lifecycle to "New"'] },
            { id: 'review_request', name: 'Review Request', description: 'Request product review after delivery', category: 'Reviews', triggerType: 'order_delivered', preview: 'Delivered + 3d → Request Review → Offer Discount', useCase: 'Build social proof on autopilot.', flowSteps: ['Order delivered confirmed', 'Wait 3 days', 'Send review request'] },
        ];

        try {
            setLoadingTemplates(true);
            const response = await fetch('/api/automations/templates');
            if (!response.ok) throw new Error('Failed to fetch templates');
            const data = await response.json();
            const fetchedTemplates = Array.isArray(data) ? data : [];
            setTemplates(fetchedTemplates.length > 0 ? fetchedTemplates : fallbackTemplates);
        } catch (error) {
            console.error('Error fetching templates, using fallback:', error);
            setTemplates(fallbackTemplates);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleOpenTemplateEditor = async (templateId: string) => {
        try {
            setLoadingTemplate(templateId);
            const response = await fetch(`/api/automations/templates/${templateId}`);
            if (response.ok) {
                const templateConfig = await response.json();
                setSelectedTemplate(templateConfig);
                setEditingAutomation(null);
                setShowWorkflowEditor(true);
            } else {
                // Fallback: use basic template info
                const template = templates.find(t => t.id === templateId);
                if (template) {
                    setSelectedTemplate({
                        id: template.id,
                        name: template.name,
                        description: template.description,
                        category: template.category,
                        triggerType: template.triggerType,
                        actions: [],
                    });
                    setEditingAutomation(null);
                    setShowWorkflowEditor(true);
                }
            }
        } catch (error) {
            console.error('Error loading template config:', error);
        } finally {
            setLoadingTemplate(null);
        }
    };

    const handleEditAutomation = (automation: Automation) => {
        setEditingAutomation(automation);
        setSelectedTemplate(null);
        setShowWorkflowEditor(true);
    };

    const handleSaveWorkflow = async (data: any, status: 'draft' | 'active') => {
        try {
            if (data.id) {
                // Update existing automation
                const response = await fetch(`/api/automations/${data.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...data, status }),
                });
                if (!response.ok) throw new Error('Failed to update automation');
            } else {
                // Create new automation from template
                const response = await fetch('/api/automations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...data, status }),
                });
                if (!response.ok) throw new Error('Failed to create automation');
            }
            await fetchAutomations();
            setActiveTab('automations');
        } catch (error) {
            console.error('Error saving workflow:', error);
            throw error;
        }
    };

    const handleToggleStatus = async (automation: Automation) => {
        try {
            const action = automation.status === 'active' ? 'pause' : 'activate';
            const response = await fetch(`/api/automations/${automation.id}/${action}`, {
                method: 'POST',
            });
            if (response.ok) {
                fetchAutomations();
            }
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleDeleteAutomation = async (id: string) => {
        if (!confirm('Are you sure you want to delete this automation?')) return;

        try {
            const response = await fetch(`/api/automations/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchAutomations();
            }
        } catch (error) {
            console.error('Error deleting automation:', error);
        }
    };

    const filteredAutomations = automations.filter((automation) => {
        const matchesSearch = automation.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || automation.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const filteredTemplates = templates.filter((template) => {
        const matchesSearch = template.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = [...new Set(templates.map(t => t.category))];
    const totalRuns = automations.reduce((acc, a) => acc + (a.runCount || 0), 0);
    const activeCount = automations.filter((a) => a.status === 'active').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Workflow Editor Modal */}
            <WorkflowEditorModal
                isOpen={showWorkflowEditor}
                onClose={() => {
                    setShowWorkflowEditor(false);
                    setSelectedTemplate(null);
                    setEditingAutomation(null);
                }}
                template={selectedTemplate}
                automation={editingAutomation}
                onSave={handleSaveWorkflow}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Workflow className="h-8 w-8" />
                        Automations
                    </h1>
                    <p className="text-muted-foreground">Build automated workflows from templates</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Automations</p>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{automations.length}</div>
                        <p className="text-xs text-muted-foreground">{activeCount} active</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Runs</p>
                        <Play className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRuns.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">all time</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Success Rate</p>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalRuns > 0
                                ? Math.round(
                                    (automations.reduce((acc, a) => acc + (a.successCount || 0), 0) / totalRuns) * 100
                                )
                                : 0}
                            %
                        </div>
                        <p className="text-xs text-muted-foreground">executions succeeded</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Templates</p>
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{templates.length}</div>
                        <p className="text-xs text-muted-foreground">ready to use</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <TabsList>
                        <TabsTrigger value="automations" className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            My Automations
                            {automations.length > 0 && (
                                <Badge variant="secondary" className="ml-1">{automations.length}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="templates" className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Automation Gallery
                        </TabsTrigger>
                    </TabsList>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={activeTab === 'automations' ? 'Search automations...' : 'Search templates...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-64"
                        />
                    </div>
                </div>

                {/* My Automations Tab */}
                <TabsContent value="automations" className="space-y-4 mt-6">
                    {/* Status Filter */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium">Status:</span>
                                <div className="flex gap-2">
                                    {['all', 'active', 'paused', 'draft'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setFilterStatus(status)}
                                            className={cn(
                                                'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                                                filterStatus === status
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted hover:bg-muted/80'
                                            )}
                                        >
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Automations List */}
                    <div className="space-y-3">
                        {filteredAutomations.map((automation) => {
                            const statusConf = statusConfig[automation.status] || statusConfig.draft;
                            const StatusIcon = statusConf.icon;

                            return (
                                <Card key={automation.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-4">
                                            {/* Icon */}
                                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                                                <Zap className="h-5 w-5" />
                                            </div>

                                            {/* Name & Description */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold truncate">{automation.name}</h3>
                                                <p className="text-sm text-muted-foreground truncate">
                                                    {automation.description || triggerLabels[automation.triggerType] || 'No description'}
                                                </p>
                                            </div>

                                            {/* Stats */}
                                            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Play className="h-4 w-4" />
                                                    {automation.runCount || 0} runs
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <CheckCircle className="h-4 w-4" />
                                                    {automation.successCount || 0} success
                                                </span>
                                            </div>

                                            {/* Status Badge */}
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0",
                                                statusConf.color
                                            )}>
                                                <StatusIcon className="h-3 w-3" />
                                                {statusConf.label}
                                            </span>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1 border-l pl-4 ml-2">
                                                {/* Logs Button */}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="gap-1.5"
                                                    onClick={() => window.open(`/automations/${automation.id}/logs`, '_blank')}
                                                    title="View execution logs"
                                                >
                                                    <History className="h-3.5 w-3.5" />
                                                </Button>

                                                {/* Edit Button */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1.5"
                                                    onClick={() => handleEditAutomation(automation)}
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                    Edit
                                                </Button>

                                                {/* Activate/Deactivate Toggle */}
                                                <Button
                                                    size="sm"
                                                    variant={automation.status === 'active' ? 'secondary' : 'default'}
                                                    className={cn(
                                                        "gap-1.5",
                                                        automation.status === 'active'
                                                            ? "bg-orange-100 hover:bg-orange-200 text-orange-700"
                                                            : "bg-green-600 hover:bg-green-700 text-white"
                                                    )}
                                                    onClick={() => handleToggleStatus(automation)}
                                                >
                                                    {automation.status === 'active' ? (
                                                        <>
                                                            <Pause className="h-3.5 w-3.5" />
                                                            Pause
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="h-3.5 w-3.5" />
                                                            Activate
                                                        </>
                                                    )}
                                                </Button>

                                                {/* Delete Button */}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteAutomation(automation.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {filteredAutomations.length === 0 && (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <Zap className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No automations yet</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Browse our templates to get started quickly
                                    </p>
                                    <Button onClick={() => setActiveTab('templates')}>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Browse Templates
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-4 mt-6">
                    {/* Category Filter */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-sm font-medium">Category:</span>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => setFilterCategory('all')}
                                        className={cn(
                                            'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                                            filterCategory === 'all'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted hover:bg-muted/80'
                                        )}
                                    >
                                        All
                                    </button>
                                    {categories.map((category) => {
                                        const catConfig = categoryConfig[category];
                                        const Icon = catConfig?.icon || Package;
                                        return (
                                            <button
                                                key={category}
                                                onClick={() => setFilterCategory(category)}
                                                className={cn(
                                                    'px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5',
                                                    filterCategory === category
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted hover:bg-muted/80'
                                                )}
                                            >
                                                <Icon className="h-3 w-3" />
                                                {category}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Templates Grid */}
                    {loadingTemplates ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredTemplates.map((template) => {
                                const catConfig = categoryConfig[template.category];
                                const CategoryIcon = catConfig?.icon || Package;
                                const isExpanded = expandedTemplates.has(template.id);
                                const isLoading = loadingTemplate === template.id;

                                const toggleExpanded = () => {
                                    const newSet = new Set(expandedTemplates);
                                    if (isExpanded) {
                                        newSet.delete(template.id);
                                    } else {
                                        newSet.add(template.id);
                                    }
                                    setExpandedTemplates(newSet);
                                };

                                return (
                                    <Card key={template.id} className="flex flex-col hover:shadow-lg transition-shadow">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-lg text-white",
                                                    catConfig?.color || 'bg-gray-500'
                                                )}>
                                                    <CategoryIcon className="h-4 w-4" />
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {template.category}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                                            <CardDescription className="line-clamp-2">
                                                {template.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1 flex flex-col">
                                            {/* Use Case Section */}
                                            {template.useCase && (
                                                <div className="mb-4 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                                                    <p className="text-xs font-medium text-primary mb-1">💡 Why use this?</p>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                                        {template.useCase}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Flow Steps - Collapsible */}
                                            {template.flowSteps && template.flowSteps.length > 0 && (
                                                <div className="mb-4">
                                                    <button
                                                        onClick={toggleExpanded}
                                                        className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
                                                    >
                                                        <span className="flex items-center gap-1">
                                                            <Sparkles className="h-3 w-3" />
                                                            Automation Flow ({template.flowSteps.length} steps)
                                                        </span>
                                                        {isExpanded ? (
                                                            <ChevronUp className="h-3 w-3" />
                                                        ) : (
                                                            <ChevronDown className="h-3 w-3" />
                                                        )}
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="mt-2 space-y-1.5 pl-1">
                                                            {template.flowSteps.map((step, index) => (
                                                                <div key={index} className="flex items-start gap-2 text-xs">
                                                                    <div className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">
                                                                        {index + 1}
                                                                    </div>
                                                                    <span className="text-muted-foreground">{step}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Spacer */}
                                            <div className="flex-1" />

                                            {/* Trigger Badge & Action */}
                                            <div className="flex items-center justify-between pt-2 border-t mt-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {triggerLabels[template.triggerType] || template.triggerType}
                                                </Badge>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenTemplateEditor(template.id)}
                                                    disabled={isLoading}
                                                    className="shadow-sm"
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                            Loading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Settings2 className="mr-2 h-3 w-3" />
                                                            Use Template
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {!loadingTemplates && filteredTemplates.length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <Sparkles className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                                <p className="text-sm text-muted-foreground">
                                    Try adjusting your search or category filter
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
