'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    MessageCircle,
    Instagram,
    Mail,
    Plus,
    Settings as SettingsIcon,
    Trash2,
    AlertCircle,
    Clock,
    Loader2,
    RefreshCw,
    Wifi,
    WifiOff,
    CheckCircle2,
    XCircle,
    Phone,
    AtSign,
    ChevronDown,
    ChevronUp,
    Building2,
    Database,
    FileSpreadsheet,
    Table2,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WhatsAppModal } from './components/WhatsAppModal';
import { InstagramModal } from './components/InstagramModal';
import { EmailModal } from './components/EmailModal';

interface Channel {
    id: string;
    channelType: 'whatsapp' | 'instagram' | 'email';
    name: string;
    status: 'connected' | 'disconnected' | 'error' | 'pending';
    lastSyncAt: string | null;
    createdAt: string;
    credentials?: {
        phoneNumberId?: string;
        email?: string;
        instagramAccountId?: string;
    };
}

const channelTypes = [
    {
        type: 'whatsapp',
        name: 'WhatsApp Business',
        description: 'Connect multiple WhatsApp Business numbers to send and receive messages',
        icon: MessageCircle,
        color: 'text-primary-foreground',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/20',
        gradient: 'from-primary to-primary/80',
        buttonText: 'Add WhatsApp Number',
    },
    {
        type: 'instagram',
        name: 'Instagram Direct',
        description: 'Connect Instagram accounts to manage direct messages',
        icon: Instagram,
        color: 'text-primary-foreground',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/20',
        gradient: 'from-primary to-primary/80',
        buttonText: 'Add Instagram Account',
        comingSoon: true,
    },
    {
        type: 'email',
        name: 'Email',
        description: 'Connect multiple email accounts via SMTP/IMAP or OAuth',
        icon: Mail,
        color: 'text-primary-foreground',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/20',
        gradient: 'from-primary to-primary/80',
        buttonText: 'Add Email Account',
    },
];

export default function ChannelsPage() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [testingChannel, setTestingChannel] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['whatsapp', 'instagram', 'email']));

    // Modal states
    const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const [instagramModalOpen, setInstagramModalOpen] = useState(false);
    const [emailModalOpen, setEmailModalOpen] = useState(false);

    useEffect(() => {
        fetchChannels();
    }, []);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [successMessage]);

    useEffect(() => {
        if (testResult) {
            const timer = setTimeout(() => setTestResult(null), 5000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [testResult]);

    const fetchChannels = async () => {
        try {
            const response = await fetch('/api/channels');
            if (response.ok) {
                const data = await response.json();
                setChannels(Array.isArray(data) ? data : []);
            } else if (response.status === 401) {
                setChannels([]);
            }
        } catch (error) {
            console.error('Error fetching channels:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = (type: string) => {
        if (type === 'whatsapp') {
            setWhatsappModalOpen(true);
        } else if (type === 'instagram') {
            setInstagramModalOpen(true);
        } else if (type === 'email') {
            setEmailModalOpen(true);
        }
    };

    const handleDisconnect = async (channelId: string) => {
        if (!confirm('Are you sure you want to disconnect this channel? This action cannot be undone.')) return;

        try {
            const response = await fetch(`/api/channels/${channelId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setChannels(channels.filter(c => c.id !== channelId));
                setSuccessMessage('Channel disconnected successfully');
            } else {
                const data = await response.json();
                alert(data.message || 'Failed to disconnect channel');
            }
        } catch (error) {
            console.error('Error disconnecting channel:', error);
            alert('Failed to disconnect channel');
        }
    };

    const handleTestConnection = async (channelId: string) => {
        setTestingChannel(channelId);
        setTestResult(null);

        try {
            const response = await fetch(`/api/channels/${channelId}`, {
                method: 'PATCH',
            });
            const data = await response.json();
            setTestResult({
                id: channelId,
                success: data.success !== false,
                message: data.message || (data.success !== false ? 'Connection successful' : 'Connection failed'),
            });

            if (data.success !== false) {
                setChannels(channels.map(c =>
                    c.id === channelId ? { ...c, status: 'connected' as const } : c
                ));
            }
        } catch (error) {
            setTestResult({
                id: channelId,
                success: false,
                message: 'Connection test failed',
            });
        } finally {
            setTestingChannel(null);
        }
    };

    const handleChannelSuccess = () => {
        setSuccessMessage('Channel connected successfully!');
        fetchChannels();
    };

    const toggleExpanded = (type: string) => {
        const newExpanded = new Set(expandedTypes);
        if (newExpanded.has(type)) {
            newExpanded.delete(type);
        } else {
            newExpanded.add(type);
        }
        setExpandedTypes(newExpanded);
    };

    const getStatusBadge = (status: Channel['status']) => {
        const config = {
            connected: {
                icon: CheckCircle2,
                label: 'Connected',
                className: 'bg-green-100 text-green-700 border-green-200',
            },
            disconnected: {
                icon: WifiOff,
                label: 'Disconnected',
                className: 'bg-gray-100 text-gray-700 border-gray-200',
            },
            error: {
                icon: XCircle,
                label: 'Error',
                className: 'bg-red-100 text-red-700 border-red-200',
            },
            pending: {
                icon: Clock,
                label: 'Pending',
                className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            },
        };

        const { icon: Icon, label, className } = config[status];
        return (
            <Badge variant="outline" className={cn('gap-1.5 font-medium', className)}>
                <Icon className="h-3 w-3" />
                {label}
            </Badge>
        );
    };

    const getChannelsByType = (type: string) => {
        return channels.filter(c => c.channelType === type);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading channels...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Success Message Toast */}
            {successMessage && (
                <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        {successMessage}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Channels</h1>
                    <p className="text-muted-foreground">
                        Connect and manage multiple communication channels in one place
                    </p>
                </div>
                <Button onClick={() => fetchChannels()} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-violet-500/10 via-transparent to-transparent border-violet-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Channels</p>
                        <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <Wifi className="h-4 w-4 text-violet-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-violet-700">{channels.length}</div>
                        <p className="text-xs text-muted-foreground">All communication channels</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border-emerald-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Connected</p>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">
                            {channels.filter(c => c.status === 'connected').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Active connections</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500/10 via-transparent to-transparent border-orange-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Pending</p>
                        <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700">
                            {channels.filter(c => c.status === 'pending').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Awaiting setup</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-500/10 via-transparent to-transparent border-red-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Errors</p>
                        <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">
                            {channels.filter(c => c.status === 'error').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Need attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Channel Type Sections */}
            <div className="space-y-4">
                {channelTypes.map((channelType) => {
                    const Icon = channelType.icon;
                    const channelsOfType = getChannelsByType(channelType.type);
                    const isExpanded = expandedTypes.has(channelType.type);

                    return (
                        <Card key={channelType.type} className="overflow-hidden">
                            {/* Gradient header */}
                            <div className={cn('h-1.5 bg-gradient-to-r', channelType.gradient)} />

                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn('p-2.5 rounded-xl', channelType.bgColor)}>
                                            <Icon className={cn('h-6 w-6', channelType.color)} />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {channelType.name}
                                                <Badge variant="secondary" className="ml-2">
                                                    {channelsOfType.length} connected
                                                </Badge>
                                            </CardTitle>
                                            <CardDescription className="text-sm">
                                                {channelType.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(channelType as any).comingSoon ? (
                                            <Badge variant="secondary" className="bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 border-pink-200 px-4 py-2">
                                                <Clock className="mr-2 h-4 w-4" />
                                                Coming Soon
                                            </Badge>
                                        ) : (
                                            <Button
                                                onClick={() => handleConnect(channelType.type)}
                                                className={cn('bg-gradient-to-r text-primary-foreground hover:opacity-90 font-medium', channelType.gradient)}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                {channelType.buttonText}
                                            </Button>
                                        )}
                                        {channelsOfType.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleExpanded(channelType.type)}
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            {/* Connected Channels List */}
                            {isExpanded && channelsOfType.length > 0 && (
                                <CardContent className="pt-0">
                                    <div className="space-y-3 border-t pt-4">
                                        {channelsOfType.map((channel) => {
                                            const isTestingThis = testingChannel === channel.id;
                                            const testResultForThis = testResult?.id === channel.id ? testResult : null;

                                            return (
                                                <div
                                                    key={channel.id}
                                                    className={cn(
                                                        'flex items-center justify-between p-4 rounded-lg border transition-all',
                                                        channel.status === 'connected' && 'border-green-200 bg-green-50/50',
                                                        channel.status === 'error' && 'border-red-200 bg-red-50/50',
                                                        channel.status === 'pending' && 'border-yellow-200 bg-yellow-50/50',
                                                        channel.status === 'disconnected' && 'border-gray-200 bg-gray-50/50'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn('p-2 rounded-lg', channelType.bgColor)}>
                                                            {channelType.type === 'whatsapp' && <Phone className={cn('h-4 w-4', channelType.color)} />}
                                                            {channelType.type === 'instagram' && <AtSign className={cn('h-4 w-4', channelType.color)} />}
                                                            {channelType.type === 'email' && <Mail className={cn('h-4 w-4', channelType.color)} />}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold">{channel.name}</h4>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <span>Added {new Date(channel.createdAt).toLocaleDateString()}</span>
                                                                {channel.lastSyncAt && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>Last sync: {new Date(channel.lastSyncAt).toLocaleString()}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {/* Test Result Inline */}
                                                        {testResultForThis && (
                                                            <span className={cn(
                                                                'text-sm px-2 py-1 rounded',
                                                                testResultForThis.success
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-red-100 text-red-700'
                                                            )}>
                                                                {testResultForThis.message}
                                                            </span>
                                                        )}
                                                        {getStatusBadge(channel.status)}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleTestConnection(channel.id)}
                                                            disabled={isTestingThis}
                                                            className="gap-1"
                                                        >
                                                            {isTestingThis ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Wifi className="h-4 w-4" />
                                                            )}
                                                            Test
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleConnect(channel.channelType)}
                                                        >
                                                            <SettingsIcon className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDisconnect(channel.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            )}

                            {/* Empty State */}
                            {channelsOfType.length === 0 && (
                                <CardContent className="pt-0 pb-6">
                                    <div className="text-center py-6 border-t border-dashed">
                                        <Icon className={cn('mx-auto h-10 w-10 opacity-30 mb-2', channelType.color)} />
                                        <p className="text-muted-foreground text-sm">
                                            No {channelType.name.toLowerCase()} accounts connected yet
                                        </p>
                                        <p className="text-muted-foreground text-xs mt-1">
                                            Click &quot;{channelType.buttonText}&quot; to get started
                                        </p>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* CRM Integrations Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-purple-600" />
                            CRM Integrations
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Connect your CRM to sync contacts, leads, and customer data
                        </p>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Zoho CRM */}
                    <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
                        <div className="h-1.5 bg-gradient-to-r from-red-500 to-red-600" />
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="p-3 rounded-xl bg-red-50">
                                    <Database className="h-8 w-8 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Zoho CRM</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Sync contacts and leads
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                                    Coming Soon
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* HubSpot */}
                    <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
                        <div className="h-1.5 bg-gradient-to-r from-orange-500 to-orange-600" />
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="p-3 rounded-xl bg-orange-50">
                                    <Database className="h-8 w-8 text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">HubSpot</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Marketing & sales hub
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                                    Coming Soon
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Salesforce */}
                    <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
                        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500" />
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="p-3 rounded-xl bg-blue-50">
                                    <Database className="h-8 w-8 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Salesforce</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Enterprise CRM platform
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                                    Coming Soon
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pipedrive */}
                    <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
                        <div className="h-1.5 bg-gradient-to-r from-green-500 to-emerald-600" />
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="p-3 rounded-xl bg-green-50">
                                    <Database className="h-8 w-8 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Pipedrive</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Sales pipeline CRM
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                                    Coming Soon
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Tools & Productivity Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Tools & Productivity
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Connect spreadsheets, databases, and automation tools
                        </p>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    {/* Google Sheets */}
                    <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
                        <div className="h-1.5 bg-gradient-to-r from-green-500 to-green-600" />
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="p-3 rounded-xl bg-green-50">
                                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">Google Sheets</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Sync with spreadsheets
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 text-xs">
                                    Coming Soon
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Excel Online */}
                    <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
                        <div className="h-1.5 bg-gradient-to-r from-green-600 to-green-700" />
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="p-3 rounded-xl bg-green-50">
                                    <Table2 className="h-8 w-8 text-green-700" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">Excel Online</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Microsoft Excel sync
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 text-xs">
                                    Coming Soon
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Airtable */}
                    <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
                        <div className="h-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500" />
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="p-3 rounded-xl bg-yellow-50">
                                    <Table2 className="h-8 w-8 text-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">Airtable</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Database & tables
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 text-xs">
                                    Coming Soon
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notion */}
                    <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
                        <div className="h-1.5 bg-gradient-to-r from-gray-700 to-gray-800" />
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="p-3 rounded-xl bg-gray-100">
                                    <FileSpreadsheet className="h-8 w-8 text-gray-700" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">Notion</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Notes & databases
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 text-xs">
                                    Coming Soon
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Zapier */}
                    <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
                        <div className="h-1.5 bg-gradient-to-r from-orange-500 to-red-500" />
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="p-3 rounded-xl bg-orange-50">
                                    <Zap className="h-8 w-8 text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">Zapier</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Automate workflows
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 text-xs">
                                    Coming Soon
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            <WhatsAppModal
                open={whatsappModalOpen}
                onOpenChange={setWhatsappModalOpen}
                onSuccess={handleChannelSuccess}
            />
            <InstagramModal
                open={instagramModalOpen}
                onOpenChange={setInstagramModalOpen}
                onSuccess={handleChannelSuccess}
            />
            <EmailModal
                open={emailModalOpen}
                onOpenChange={setEmailModalOpen}
                onSuccess={handleChannelSuccess}
            />
        </div>
    );
}
