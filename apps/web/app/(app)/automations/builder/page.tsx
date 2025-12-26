'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Play,
    MessageSquare,
    Clock,
    Tag,
    Users,
    GitBranch,
    Webhook,
    Bell,
    Mail,
    Zap,
    ChevronRight,
    Package,
    ShoppingCart,
    CreditCard,
    Heart,
    Loader2,
    Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Node type definitions
const triggerTypes = {
    order_created: { label: 'Order Created', icon: Package, color: 'bg-blue-500' },
    cod_order_created: { label: 'COD Order Created', icon: Package, color: 'bg-blue-500' },
    order_shipped: { label: 'Order Shipped', icon: Package, color: 'bg-blue-500' },
    order_delivered: { label: 'Order Delivered', icon: Package, color: 'bg-blue-500' },
    cart_abandoned: { label: 'Cart Abandoned', icon: ShoppingCart, color: 'bg-orange-500' },
    cart_recovered: { label: 'Cart Recovered', icon: ShoppingCart, color: 'bg-green-500' },
    payment_failed: { label: 'Payment Failed', icon: CreditCard, color: 'bg-red-500' },
    payment_success: { label: 'Payment Success', icon: CreditCard, color: 'bg-green-500' },
    first_order: { label: 'First Order', icon: Heart, color: 'bg-pink-500' },
    repeat_order: { label: 'Repeat Order', icon: Heart, color: 'bg-pink-500' },
    high_value_order: { label: 'High Value Order', icon: Heart, color: 'bg-pink-500' },
    contact_created: { label: 'Contact Created', icon: Users, color: 'bg-purple-500' },
    tag_added: { label: 'Tag Added', icon: Tag, color: 'bg-yellow-500' },
    tag_removed: { label: 'Tag Removed', icon: Tag, color: 'bg-yellow-500' },
    message_received: { label: 'Message Received', icon: MessageSquare, color: 'bg-green-500' },
    keyword_match: { label: 'Keyword Match', icon: MessageSquare, color: 'bg-green-500' },
    schedule: { label: 'Schedule', icon: Clock, color: 'bg-gray-500' },
    inactivity: { label: 'Inactivity', icon: Clock, color: 'bg-gray-500' },
};

const actionTypes = {
    send_whatsapp_template: { label: 'Send WhatsApp Template', icon: MessageSquare, color: 'bg-green-500' },
    send_whatsapp_message: { label: 'Send WhatsApp Message', icon: MessageSquare, color: 'bg-green-500' },
    send_email: { label: 'Send Email', icon: Mail, color: 'bg-blue-500' },
    add_tag: { label: 'Add Tag', icon: Tag, color: 'bg-yellow-500' },
    remove_tag: { label: 'Remove Tag', icon: Tag, color: 'bg-yellow-500' },
    update_contact: { label: 'Update Contact', icon: Users, color: 'bg-purple-500' },
    update_lifecycle: { label: 'Update Lifecycle', icon: Users, color: 'bg-purple-500' },
    assign_to_agent: { label: 'Assign to Agent', icon: Users, color: 'bg-cyan-500' },
    notify_team: { label: 'Notify Team', icon: Bell, color: 'bg-orange-500' },
    wait: { label: 'Wait/Delay', icon: Clock, color: 'bg-gray-500' },
    condition: { label: 'Condition (If/Else)', icon: GitBranch, color: 'bg-purple-500' },
    webhook: { label: 'Webhook', icon: Webhook, color: 'bg-indigo-500' },
};

const categories = ['Orders', 'Cart Recovery', 'Payments', 'Customer Lifecycle', 'Engagement', 'Support'];

interface ActionNode {
    id: string;
    type: string;
    config: Record<string, any>;
}

interface WorkflowTemplate {
    name: string;
    description: string;
    category: string;
    triggerType: string;
    triggerConfig: Record<string, any>;
    actions: ActionNode[];
}

export default function AutomationBuilderPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [template, setTemplate] = useState<WorkflowTemplate>({
        name: '',
        description: '',
        category: 'Orders',
        triggerType: 'order_created',
        triggerConfig: {},
        actions: [],
    });
    const [selectedAction, setSelectedAction] = useState<ActionNode | null>(null);

    const handleAddAction = (type: string) => {
        const newAction: ActionNode = {
            id: `action-${Date.now()}`,
            type,
            config: {},
        };
        setTemplate({
            ...template,
            actions: [...template.actions, newAction],
        });
        setSelectedAction(newAction);
    };

    const handleDeleteAction = (actionId: string) => {
        setTemplate({
            ...template,
            actions: template.actions.filter(a => a.id !== actionId),
        });
        if (selectedAction?.id === actionId) {
            setSelectedAction(null);
        }
    };

    const handleUpdateAction = (actionId: string, config: Record<string, any>) => {
        setTemplate({
            ...template,
            actions: template.actions.map(a =>
                a.id === actionId ? { ...a, config: { ...a.config, ...config } } : a
            ),
        });
    };

    const handleSaveTemplate = async () => {
        if (!template.name || !template.triggerType) {
            alert('Please fill in template name and select a trigger');
            return;
        }

        setSaving(true);
        try {
            const response = await fetch('/api/automations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: template.name,
                    description: template.description,
                    triggerType: template.triggerType,
                    triggerConfig: template.triggerConfig,
                    actions: template.actions.map(a => ({
                        type: a.type,
                        ...a.config,
                    })),
                    isTemplate: true,
                }),
            });

            if (!response.ok) throw new Error('Failed to save template');

            router.push('/automations');
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const selectedTrigger = triggerTypes[template.triggerType as keyof typeof triggerTypes];
    const TriggerIcon = selectedTrigger?.icon || Zap;

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col">
            {/* Header */}
            <div className="border-b bg-background px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold flex items-center gap-2">
                            <Settings2 className="h-5 w-5" />
                            Workflow Builder
                        </h1>
                        <p className="text-sm text-muted-foreground">Create automation templates (Super Admin)</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleSaveTemplate} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Template
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Actions Palette */}
                <div className="w-64 border-r bg-muted/30 overflow-y-auto p-4">
                    <h3 className="font-semibold mb-4">Add Actions</h3>
                    <div className="space-y-2">
                        {Object.entries(actionTypes).map(([type, config]) => {
                            const Icon = config.icon;
                            return (
                                <button
                                    key={type}
                                    onClick={() => handleAddAction(type)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg border bg-background hover:border-primary hover:shadow-sm transition-all text-left"
                                >
                                    <div className={cn("p-1.5 rounded text-white", config.color)}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm">{config.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Center Panel - Workflow Canvas */}
                <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
                    <div className="max-w-2xl mx-auto space-y-4">
                        {/* Template Info Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Template Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Template Name</Label>
                                        <Input
                                            placeholder="e.g., Order Confirmation"
                                            value={template.name}
                                            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <Select
                                            value={template.category}
                                            onValueChange={(v) => setTemplate({ ...template, category: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        placeholder="What does this automation do?"
                                        value={template.description}
                                        onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                                        rows={2}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Trigger Node */}
                        <Card className={cn("border-2", "border-primary")}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg text-white", selectedTrigger?.color || 'bg-blue-500')}>
                                        <TriggerIcon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Trigger</p>
                                        <Select
                                            value={template.triggerType}
                                            onValueChange={(v) => setTemplate({ ...template, triggerType: v })}
                                        >
                                            <SelectTrigger className="border-0 p-0 h-auto font-semibold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(triggerTypes).map(([type, config]) => (
                                                    <SelectItem key={type} value={type}>{config.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Play className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        {template.actions.map((action) => {
                            const actionConfig = actionTypes[action.type as keyof typeof actionTypes];
                            const ActionIcon = actionConfig?.icon || Zap;
                            const isSelected = selectedAction?.id === action.id;

                            return (
                                <div key={action.id}>
                                    {/* Connection arrow */}
                                    <div className="flex justify-center py-2">
                                        <div className="flex flex-col items-center">
                                            <div className="w-0.5 h-4 bg-muted-foreground/30" />
                                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 rotate-90" />
                                        </div>
                                    </div>

                                    {/* Action Node */}
                                    <Card
                                        className={cn(
                                            "border-2 cursor-pointer transition-all group",
                                            isSelected ? "border-primary shadow-lg" : "border-muted hover:border-muted-foreground/50"
                                        )}
                                        onClick={() => setSelectedAction(action)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-lg text-white", actionConfig?.color || 'bg-gray-500')}>
                                                    <ActionIcon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm">{actionConfig?.label}</p>
                                                    {action.config.templateId && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Template: {action.config.templateId}
                                                        </p>
                                                    )}
                                                    {action.config.tagName && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Tag: {action.config.tagName}
                                                        </p>
                                                    )}
                                                    {action.config.waitDuration && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Wait: {action.config.waitDuration} {action.config.waitUnit || 'seconds'}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteAction(action.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })}

                        {/* Add action placeholder */}
                        {template.actions.length === 0 && (
                            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
                                <Plus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Click an action from the left panel to add it to your workflow
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Action Properties */}
                <div className="w-80 border-l bg-background overflow-y-auto p-4">
                    {selectedAction ? (
                        <div className="space-y-4">
                            <h3 className="font-semibold">Action Properties</h3>

                            {/* Send WhatsApp Template */}
                            {selectedAction.type === 'send_whatsapp_template' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Template ID</Label>
                                        <Input
                                            placeholder="e.g., order_confirmation"
                                            value={selectedAction.config.templateId || ''}
                                            onChange={(e) => handleUpdateAction(selectedAction.id, { templateId: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Add/Remove Tag */}
                            {(selectedAction.type === 'add_tag' || selectedAction.type === 'remove_tag') && (
                                <div className="space-y-2">
                                    <Label>Tag Name</Label>
                                    <Input
                                        placeholder="e.g., vip_customer"
                                        value={selectedAction.config.tagName || ''}
                                        onChange={(e) => handleUpdateAction(selectedAction.id, { tagName: e.target.value })}
                                    />
                                </div>
                            )}

                            {/* Wait/Delay */}
                            {selectedAction.type === 'wait' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Duration</Label>
                                        <Input
                                            type="number"
                                            placeholder="e.g., 1"
                                            value={selectedAction.config.waitDuration || ''}
                                            onChange={(e) => handleUpdateAction(selectedAction.id, { waitDuration: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unit</Label>
                                        <Select
                                            value={selectedAction.config.waitUnit || 'hours'}
                                            onValueChange={(v) => handleUpdateAction(selectedAction.id, { waitUnit: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="seconds">Seconds</SelectItem>
                                                <SelectItem value="minutes">Minutes</SelectItem>
                                                <SelectItem value="hours">Hours</SelectItem>
                                                <SelectItem value="days">Days</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* Update Lifecycle */}
                            {selectedAction.type === 'update_lifecycle' && (
                                <div className="space-y-2">
                                    <Label>New Lifecycle Stage</Label>
                                    <Select
                                        value={selectedAction.config.newLifecycle || ''}
                                        onValueChange={(v) => handleUpdateAction(selectedAction.id, { newLifecycle: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select stage" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="lead">Lead</SelectItem>
                                            <SelectItem value="prospect">Prospect</SelectItem>
                                            <SelectItem value="customer">Customer</SelectItem>
                                            <SelectItem value="repeat_customer">Repeat Customer</SelectItem>
                                            <SelectItem value="vip">VIP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Notify Team */}
                            {selectedAction.type === 'notify_team' && (
                                <div className="space-y-2">
                                    <Label>Notification Message</Label>
                                    <Textarea
                                        placeholder="e.g., High value order received!"
                                        value={selectedAction.config.message || ''}
                                        onChange={(e) => handleUpdateAction(selectedAction.id, { message: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                            )}

                            {/* Webhook */}
                            {selectedAction.type === 'webhook' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Webhook URL</Label>
                                        <Input
                                            placeholder="https://..."
                                            value={selectedAction.config.webhookUrl || ''}
                                            onChange={(e) => handleUpdateAction(selectedAction.id, { webhookUrl: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Method</Label>
                                        <Select
                                            value={selectedAction.config.webhookMethod || 'POST'}
                                            onValueChange={(v) => handleUpdateAction(selectedAction.id, { webhookMethod: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="GET">GET</SelectItem>
                                                <SelectItem value="POST">POST</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Select an action to configure its properties</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
