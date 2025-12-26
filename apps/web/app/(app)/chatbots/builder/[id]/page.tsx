'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ArrowLeft,
    Save,
    Play,
    Pause,
    TestTube2,
    MessageSquare,
    HelpCircle,
    GitBranch,
    Clock,
    Tag,
    Users,
    Webhook,
    Plus,
    Trash2,
    Loader2,
    ChevronRight,
    X,
    Instagram,
    Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatbotFlowNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, any>;
}

interface ChatbotFlowConnection {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string;
    label?: string;
}

interface Chatbot {
    id: string;
    name: string;
    description: string;
    channel: 'whatsapp' | 'instagram' | 'email';
    status: 'active' | 'paused' | 'draft';
    triggerConfig: any;
    nodes: ChatbotFlowNode[];
    connections: ChatbotFlowConnection[];
    welcomeMessage: string;
    fallbackMessage: string;
    offHoursMessage: string;
    variables: any[];
}

const nodeTypes = {
    start: { label: 'Start', icon: Play, color: 'bg-green-500', description: 'Entry point of the flow' },
    message: { label: 'Message', icon: MessageSquare, color: 'bg-blue-500', description: 'Send a text message' },
    buttons: { label: 'Buttons', icon: MessageSquare, color: 'bg-indigo-500', description: 'Message with quick reply buttons' },
    question: { label: 'Question', icon: HelpCircle, color: 'bg-purple-500', description: 'Ask and wait for user input' },
    condition: { label: 'Condition', icon: GitBranch, color: 'bg-orange-500', description: 'Branch based on conditions' },
    delay: { label: 'Delay', icon: Clock, color: 'bg-yellow-500', description: 'Wait before next step' },
    action: { label: 'Action', icon: Tag, color: 'bg-teal-500', description: 'Add tag, update contact' },
    assign_agent: { label: 'Assign Agent', icon: Users, color: 'bg-pink-500', description: 'Hand off to human' },
    webhook: { label: 'Webhook', icon: Webhook, color: 'bg-gray-500', description: 'Call external API' },
    end: { label: 'End', icon: X, color: 'bg-red-500', description: 'End of the flow' },
};

const channelConfig = {
    whatsapp: { icon: MessageSquare, label: 'WhatsApp', color: 'bg-green-500' },
    instagram: { icon: Instagram, label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500' },
    email: { icon: Mail, label: 'Email', color: 'bg-blue-500' },
};

export default function ChatbotBuilderPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const router = useRouter();
    const [chatbot, setChatbot] = useState<Chatbot | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedNode, setSelectedNode] = useState<ChatbotFlowNode | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);

    useEffect(() => {
        fetchChatbot();
    }, [id]);

    const fetchChatbot = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/chatbots/${id}`);
            if (!response.ok) throw new Error('Failed to fetch chatbot');
            const data = await response.json();
            setChatbot(data);
        } catch (error) {
            console.error('Error fetching chatbot:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!chatbot) return;

        setSaving(true);
        try {
            const response = await fetch(`/api/chatbots/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: chatbot.name,
                    description: chatbot.description,
                    nodes: chatbot.nodes,
                    connections: chatbot.connections,
                    welcomeMessage: chatbot.welcomeMessage,
                    fallbackMessage: chatbot.fallbackMessage,
                    offHoursMessage: chatbot.offHoursMessage,
                    triggerConfig: chatbot.triggerConfig,
                }),
            });

            if (!response.ok) throw new Error('Failed to save');
            setHasChanges(false);
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleActivate = async () => {
        if (!chatbot) return;

        try {
            const action = chatbot.status === 'active' ? 'deactivate' : 'activate';
            const response = await fetch(`/api/chatbots/${id}/${action}`, {
                method: 'POST',
            });

            if (response.ok) {
                fetchChatbot();
            }
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleInsertNode = (type: string, afterIndex: number) => {
        if (!chatbot) return;

        const newNode: ChatbotFlowNode = {
            id: `node-${Date.now()}`,
            type,
            position: { x: 250, y: (afterIndex + 2) * 100 },
            data: {
                label: nodeTypes[type as keyof typeof nodeTypes]?.label || type,
                message: '',
            },
        };

        // Insert the new node after the specified index
        const newNodes = [...chatbot.nodes];
        newNodes.splice(afterIndex + 1, 0, newNode);

        setChatbot({
            ...chatbot,
            nodes: newNodes,
        });
        setSelectedNode(newNode);
        setInsertAtIndex(null);
        setHasChanges(true);
    };

    const handleAddNode = (type: string) => {
        if (!chatbot) return;

        const newNode: ChatbotFlowNode = {
            id: `node-${Date.now()}`,
            type,
            position: { x: 250, y: (chatbot.nodes.length + 1) * 100 },
            data: {
                label: nodeTypes[type as keyof typeof nodeTypes]?.label || type,
                message: '',
            },
        };

        setChatbot({
            ...chatbot,
            nodes: [...chatbot.nodes, newNode],
        });
        setSelectedNode(newNode);
        setHasChanges(true);
    };

    const handleDeleteNode = (nodeId: string) => {
        if (!chatbot) return;

        setChatbot({
            ...chatbot,
            nodes: chatbot.nodes.filter(n => n.id !== nodeId),
            connections: chatbot.connections.filter(
                c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
            ),
        });
        setSelectedNode(null);
        setHasChanges(true);
    };

    const handleUpdateNode = (nodeId: string, data: Partial<ChatbotFlowNode['data']>) => {
        if (!chatbot) return;

        setChatbot({
            ...chatbot,
            nodes: chatbot.nodes.map(n =>
                n.id === nodeId
                    ? { ...n, data: { ...n.data, ...data } }
                    : n
            ),
        });
        setHasChanges(true);
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!chatbot) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-muted-foreground mb-4">Chatbot not found</p>
                <Button onClick={() => router.push('/chatbots')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Chatbots
                </Button>
            </div>
        );
    }

    const channelConf = channelConfig[chatbot.channel];
    const ChannelIcon = channelConf.icon;

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/chatbots')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg text-white", channelConf.color)}>
                            <ChannelIcon className="h-4 w-4" />
                        </div>
                        <div>
                            <h1 className="font-semibold">{chatbot.name}</h1>
                            <p className="text-xs text-muted-foreground">
                                {channelConf.label} Chatbot
                            </p>
                        </div>
                    </div>
                    {hasChanges && (
                        <span className="text-xs text-orange-500 font-medium">• Unsaved changes</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <TestTube2 className="mr-2 h-4 w-4" />
                        Test
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                    >
                        {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save
                    </Button>
                    <Button
                        size="sm"
                        variant={chatbot.status === 'active' ? 'destructive' : 'default'}
                        onClick={handleActivate}
                    >
                        {chatbot.status === 'active' ? (
                            <>
                                <Pause className="mr-2 h-4 w-4" />
                                Deactivate
                            </>
                        ) : (
                            <>
                                <Play className="mr-2 h-4 w-4" />
                                Activate
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Node Palette */}
                <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
                    <h3 className="font-semibold mb-3 text-sm">Add Node</h3>
                    <div className="space-y-2">
                        {Object.entries(nodeTypes)
                            .filter(([type]) => type !== 'start') // Can't add start nodes
                            .map(([type, config]) => {
                                const Icon = config.icon;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => handleAddNode(type)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg border bg-background hover:border-primary transition-colors text-left"
                                    >
                                        <div className={cn("p-1.5 rounded text-white", config.color)}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{config.label}</p>
                                            <p className="text-xs text-muted-foreground">{config.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>

                {/* Center - Flow Canvas */}
                <div className="flex-1 bg-muted/10 overflow-auto p-8">
                    <div className="min-h-full">
                        {/* Flow Visualization */}
                        <div className="space-y-4">
                            {chatbot.nodes.map((node, index) => {
                                const nodeConfig = nodeTypes[node.type as keyof typeof nodeTypes];
                                const Icon = nodeConfig?.icon || MessageSquare;
                                const isSelected = selectedNode?.id === node.id;


                                return (
                                    <div key={node.id}>
                                        <div
                                            onClick={() => setSelectedNode(node)}
                                            className={cn(
                                                "group w-full max-w-md mx-auto p-4 rounded-lg border-2 bg-background cursor-pointer transition-all",
                                                isSelected
                                                    ? "border-primary shadow-lg"
                                                    : "border-muted hover:border-muted-foreground/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-lg text-white", nodeConfig?.color || 'bg-gray-500')}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{node.data?.label || nodeConfig?.label}</p>
                                                    {node.data?.message && (
                                                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                            {node.data.message}
                                                        </p>
                                                    )}
                                                </div>
                                                {node.type !== 'start' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteNode(node.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Connection arrow with insert button */}
                                        {index < chatbot.nodes.length - 1 && (
                                            <div className="flex justify-center py-2 relative group/connector">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-0.5 h-3 bg-muted-foreground/30" />

                                                    {/* Insert node button */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setInsertAtIndex(insertAtIndex === index ? null : index)}
                                                            className={cn(
                                                                "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                                                insertAtIndex === index
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "bg-muted text-muted-foreground opacity-0 group-hover/connector:opacity-100 hover:bg-primary hover:text-primary-foreground"
                                                            )}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </button>

                                                        {/* Dropdown menu for node selection */}
                                                        {insertAtIndex === index && (
                                                            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-popover border rounded-lg shadow-lg p-2 min-w-[180px]">
                                                                <p className="text-xs text-muted-foreground mb-2 px-2">Add node here</p>
                                                                {Object.entries(nodeTypes)
                                                                    .filter(([type]) => type !== 'start')
                                                                    .map(([type, config]) => {
                                                                        const NodeIcon = config.icon;
                                                                        return (
                                                                            <button
                                                                                key={type}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleInsertNode(type, index);
                                                                                }}
                                                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm text-left"
                                                                            >
                                                                                <div className={cn("p-1 rounded text-white", config.color)}>
                                                                                    <NodeIcon className="h-3 w-3" />
                                                                                </div>
                                                                                <span>{config.label}</span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="w-0.5 h-3 bg-muted-foreground/30" />
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 rotate-90" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Node Properties */}
                <div className="w-80 border-l bg-background overflow-y-auto">
                    {selectedNode ? (
                        <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Node Properties</h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedNode(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <Tabs defaultValue="content" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="content">Content</TabsTrigger>
                                    <TabsTrigger value="settings">Settings</TabsTrigger>
                                </TabsList>

                                <TabsContent value="content" className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label>Label</Label>
                                        <Input
                                            value={selectedNode.data?.label || ''}
                                            onChange={(e) => handleUpdateNode(selectedNode.id, { label: e.target.value })}
                                            placeholder="Node label"
                                        />
                                    </div>

                                    {(selectedNode.type === 'message' || selectedNode.type === 'buttons' || selectedNode.type === 'question') && (
                                        <div className="space-y-2">
                                            <Label>Message</Label>
                                            <Textarea
                                                value={selectedNode.data?.message || ''}
                                                onChange={(e) => handleUpdateNode(selectedNode.id, { message: e.target.value })}
                                                placeholder="Enter message text..."
                                                rows={4}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Use {'{{variableName}}'} to insert variables
                                            </p>
                                        </div>
                                    )}

                                    {selectedNode.type === 'buttons' && (
                                        <div className="space-y-2">
                                            <Label>Buttons</Label>
                                            <div className="space-y-2">
                                                {(selectedNode.data?.buttons || []).map((btn: any, idx: number) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <Input
                                                            value={btn.text}
                                                            onChange={(e) => {
                                                                const buttons = [...(selectedNode.data?.buttons || [])];
                                                                buttons[idx] = { ...btn, text: e.target.value };
                                                                handleUpdateNode(selectedNode.id, { buttons });
                                                            }}
                                                            placeholder="Button text"
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                const buttons = (selectedNode.data?.buttons || []).filter((_: any, i: number) => i !== idx);
                                                                handleUpdateNode(selectedNode.id, { buttons });
                                                            }}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const buttons = [...(selectedNode.data?.buttons || []), { id: `btn-${Date.now()}`, text: '', type: 'reply' }];
                                                        handleUpdateNode(selectedNode.id, { buttons });
                                                    }}
                                                    disabled={(selectedNode.data?.buttons?.length || 0) >= 3}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Add Button
                                                </Button>
                                                <p className="text-xs text-muted-foreground">Max 3 buttons</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedNode.type === 'question' && (
                                        <div className="space-y-2">
                                            <Label>Save Response As</Label>
                                            <Input
                                                value={selectedNode.data?.variableName || ''}
                                                onChange={(e) => handleUpdateNode(selectedNode.id, { variableName: e.target.value })}
                                                placeholder="e.g., customerName"
                                            />
                                        </div>
                                    )}

                                    {selectedNode.type === 'delay' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-2">
                                                <Label>Duration</Label>
                                                <Input
                                                    type="number"
                                                    value={selectedNode.data?.delayValue || 5}
                                                    onChange={(e) => handleUpdateNode(selectedNode.id, { delayValue: parseInt(e.target.value) })}
                                                    min={1}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Unit</Label>
                                                <Select
                                                    value={selectedNode.data?.delayType || 'seconds'}
                                                    onValueChange={(v) => handleUpdateNode(selectedNode.id, { delayType: v })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="seconds">Seconds</SelectItem>
                                                        <SelectItem value="minutes">Minutes</SelectItem>
                                                        <SelectItem value="hours">Hours</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}

                                    {selectedNode.type === 'action' && (
                                        <div className="space-y-2">
                                            <Label>Action Type</Label>
                                            <Select
                                                value={selectedNode.data?.actionType || 'add_tag'}
                                                onValueChange={(v) => handleUpdateNode(selectedNode.id, { actionType: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="add_tag">Add Tag</SelectItem>
                                                    <SelectItem value="remove_tag">Remove Tag</SelectItem>
                                                    <SelectItem value="update_field">Update Contact Field</SelectItem>
                                                    <SelectItem value="subscribe">Subscribe to Newsletter</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="settings" className="space-y-4 mt-4">
                                    <div className="text-sm text-muted-foreground">
                                        Advanced settings for this node
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    ) : (
                        <div className="p-4">
                            <Tabs defaultValue="settings" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="settings">Bot Settings</TabsTrigger>
                                    <TabsTrigger value="trigger">Trigger</TabsTrigger>
                                </TabsList>

                                <TabsContent value="settings" className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label>Bot Name</Label>
                                        <Input
                                            value={chatbot.name}
                                            onChange={(e) => {
                                                setChatbot({ ...chatbot, name: e.target.value });
                                                setHasChanges(true);
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            value={chatbot.description || ''}
                                            onChange={(e) => {
                                                setChatbot({ ...chatbot, description: e.target.value });
                                                setHasChanges(true);
                                            }}
                                            rows={2}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Fallback Message</Label>
                                        <Textarea
                                            value={chatbot.fallbackMessage || ''}
                                            onChange={(e) => {
                                                setChatbot({ ...chatbot, fallbackMessage: e.target.value });
                                                setHasChanges(true);
                                            }}
                                            placeholder="Message when bot doesn't understand"
                                            rows={2}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="trigger" className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label>Trigger Type</Label>
                                        <Select
                                            value={chatbot.triggerConfig?.type || 'any_message'}
                                            onValueChange={(v) => {
                                                setChatbot({
                                                    ...chatbot,
                                                    triggerConfig: { ...chatbot.triggerConfig, type: v },
                                                });
                                                setHasChanges(true);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="any_message">Any Message</SelectItem>
                                                <SelectItem value="keyword">Keyword Match</SelectItem>
                                                <SelectItem value="new_conversation">New Conversation</SelectItem>
                                                {chatbot.channel === 'whatsapp' && (
                                                    <SelectItem value="template_reply">Template Reply</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {chatbot.triggerConfig?.type === 'keyword' && (
                                        <div className="space-y-2">
                                            <Label>Keywords (comma separated)</Label>
                                            <Input
                                                value={(chatbot.triggerConfig?.keywords || []).join(', ')}
                                                onChange={(e) => {
                                                    setChatbot({
                                                        ...chatbot,
                                                        triggerConfig: {
                                                            ...chatbot.triggerConfig,
                                                            keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean),
                                                        },
                                                    });
                                                    setHasChanges(true);
                                                }}
                                                placeholder="help, support, order"
                                            />
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
