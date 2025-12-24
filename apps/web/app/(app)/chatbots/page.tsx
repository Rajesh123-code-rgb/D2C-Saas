'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Plus,
    Search,
    Bot,
    MessageSquare,
    Instagram,
    Mail,
    Play,
    Pause,
    Edit,
    Copy,
    Trash2,
    MoreVertical,
    Loader2,
    Users,
    TrendingUp,
    Clock,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Chatbot {
    id: string;
    name: string;
    description: string;
    channel: 'whatsapp' | 'instagram' | 'email';
    status: 'active' | 'paused' | 'draft';
    conversationsCount: number;
    messagesCount: number;
    completedCount: number;
    handoffCount: number;
    createdAt: string;
    lastActiveAt: string | null;
}

interface ChatbotStats {
    total: number;
    active: number;
    paused: number;
    draft: number;
    byChannel: Record<string, number>;
    totalConversations: number;
    totalMessages: number;
}

const channelConfig = {
    whatsapp: {
        icon: MessageSquare,
        color: 'bg-green-100 text-green-700 border-green-200',
        bgColor: 'bg-green-500',
        label: 'WhatsApp'
    },
    instagram: {
        icon: Instagram,
        color: 'bg-pink-100 text-pink-700 border-pink-200',
        bgColor: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
        label: 'Instagram'
    },
    email: {
        icon: Mail,
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        bgColor: 'bg-blue-500',
        label: 'Email'
    },
};

const statusConfig = {
    active: { color: 'bg-green-100 text-green-700', icon: Play, label: 'Active' },
    paused: { color: 'bg-orange-100 text-orange-700', icon: Pause, label: 'Paused' },
    draft: { color: 'bg-gray-100 text-gray-700', icon: Edit, label: 'Draft' },
};

export default function ChatbotsPage() {
    const router = useRouter();
    const [chatbots, setChatbots] = useState<Chatbot[]>([]);
    const [stats, setStats] = useState<ChatbotStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterChannel, setFilterChannel] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newBotData, setNewBotData] = useState({
        name: '',
        description: '',
        channel: '' as 'whatsapp' | 'instagram' | 'email' | '',
    });

    useEffect(() => {
        fetchChatbots();
    }, []);

    const fetchChatbots = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/chatbots');
            if (!response.ok) throw new Error('Failed to fetch chatbots');
            const data = await response.json();
            setChatbots(Array.isArray(data) ? data : []);

            // Calculate stats
            const bots = Array.isArray(data) ? data : [];
            setStats({
                total: bots.length,
                active: bots.filter((b: Chatbot) => b.status === 'active').length,
                paused: bots.filter((b: Chatbot) => b.status === 'paused').length,
                draft: bots.filter((b: Chatbot) => b.status === 'draft').length,
                byChannel: {
                    whatsapp: bots.filter((b: Chatbot) => b.channel === 'whatsapp').length,
                    instagram: bots.filter((b: Chatbot) => b.channel === 'instagram').length,
                    email: bots.filter((b: Chatbot) => b.channel === 'email').length,
                },
                totalConversations: bots.reduce((sum: number, b: Chatbot) => sum + (b.conversationsCount || 0), 0),
                totalMessages: bots.reduce((sum: number, b: Chatbot) => sum + (b.messagesCount || 0), 0),
            });
        } catch (error) {
            console.error('Error fetching chatbots:', error);
            setChatbots([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBot = async () => {
        if (!newBotData.name || !newBotData.channel) return;

        setCreating(true);
        try {
            const response = await fetch('/api/chatbots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBotData),
            });

            if (!response.ok) throw new Error('Failed to create chatbot');

            const newBot = await response.json();
            setShowCreateModal(false);
            setNewBotData({ name: '', description: '', channel: '' });

            // Navigate to the builder
            router.push(`/chatbots/builder/${newBot.id}`);
        } catch (error) {
            console.error('Error creating chatbot:', error);
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStatus = async (bot: Chatbot) => {
        try {
            const action = bot.status === 'active' ? 'deactivate' : 'activate';
            const response = await fetch(`/api/chatbots/${bot.id}/${action}`, {
                method: 'POST',
            });
            if (response.ok) {
                fetchChatbots();
            }
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleDeleteBot = async (id: string) => {
        if (!confirm('Are you sure you want to delete this chatbot?')) return;

        try {
            const response = await fetch(`/api/chatbots/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchChatbots();
            }
        } catch (error) {
            console.error('Error deleting chatbot:', error);
        }
    };

    const filteredChatbots = chatbots.filter((bot) => {
        const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bot.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesChannel = filterChannel === 'all' || bot.channel === filterChannel;
        const matchesStatus = filterStatus === 'all' || bot.status === filterStatus;
        return matchesSearch && matchesChannel && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Bot className="h-8 w-8" />
                        Chatbots
                    </h1>
                    <p className="text-muted-foreground">Build conversational bots for your channels</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Chatbot
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Chatbots</p>
                        <Bot className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.active || 0} active
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Conversations</p>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalConversations?.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">Total handled</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Messages Sent</p>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalMessages?.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">Automated responses</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Resolution Rate</p>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">Resolved without agent</p>
                    </CardContent>
                </Card>
            </div>


            {/* Filters */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search chatbots..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex gap-2">
                                {['all', 'active', 'paused', 'draft'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={cn(
                                            'px-3 py-1 rounded-full text-xs font-medium transition-colors',
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
                    </div>
                </CardContent>
            </Card>

            {/* Chatbots List */}
            <div className="space-y-2">
                {filteredChatbots.map((bot) => {
                    const channelConf = channelConfig[bot.channel];
                    const statusConf = statusConfig[bot.status];
                    const ChannelIcon = channelConf.icon;
                    const StatusIcon = statusConf.icon;

                    return (
                        <Card
                            key={bot.id}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => router.push(`/chatbots/builder/${bot.id}`)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                    {/* Channel Icon */}
                                    <div className={cn("p-2 rounded-lg text-white flex-shrink-0", channelConf.bgColor)}>
                                        <ChannelIcon className="h-5 w-5" />
                                    </div>

                                    {/* Name & Description */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold truncate">{bot.name}</h3>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {bot.description || 'No description'}
                                        </p>
                                    </div>

                                    {/* Stats */}
                                    <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Users className="h-4 w-4" />
                                            {bot.conversationsCount || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageSquare className="h-4 w-4" />
                                            {bot.messagesCount || 0}
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

                                    {/* Actions */}
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => router.push(`/chatbots/builder/${bot.id}`)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => handleDeleteBot(bot.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {filteredChatbots.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Bot className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No chatbots found</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery || filterChannel !== 'all' || filterStatus !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'Create your first chatbot to automate conversations'}
                        </p>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Chatbot
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Create Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            Create New Chatbot
                        </DialogTitle>
                        <DialogDescription>
                            Choose a channel and give your chatbot a name
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Channel Selection */}
                        <div className="space-y-3">
                            <Label>Select Channel</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {(['whatsapp', 'instagram', 'email'] as const).map((channel) => {
                                    const config = channelConfig[channel];
                                    const Icon = config.icon;

                                    return (
                                        <button
                                            key={channel}
                                            onClick={() => setNewBotData({ ...newBotData, channel })}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                                                newBotData.channel === channel
                                                    ? "border-primary bg-primary/5"
                                                    : "border-muted hover:border-primary/50"
                                            )}
                                        >
                                            <div className={cn("p-2 rounded-lg text-white", config.bgColor)}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <span className="text-sm font-medium">{config.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="bot-name">Chatbot Name</Label>
                            <Input
                                id="bot-name"
                                placeholder="e.g., Customer Support Bot"
                                value={newBotData.name}
                                onChange={(e) => setNewBotData({ ...newBotData, name: e.target.value })}
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="bot-desc">Description (optional)</Label>
                            <Textarea
                                id="bot-desc"
                                placeholder="What does this bot do?"
                                value={newBotData.description}
                                onChange={(e) => setNewBotData({ ...newBotData, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateBot}
                            disabled={!newBotData.name || !newBotData.channel || creating}
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Zap className="mr-2 h-4 w-4" />
                                    Create & Build
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
