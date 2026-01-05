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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WhatsAppModal } from './components/WhatsAppModal';
import { InstagramModal } from './components/InstagramModal';
import { EmailModal } from './components/EmailModal';
import { channelsApi } from '@/lib/api';

interface Channel {
    id: string;
    channelType: 'whatsapp' | 'instagram' | 'email';
    name: string;
    status: 'connected' | 'disconnected' | 'error' | 'pending';
    lastSyncAt: string | null;
    createdAt: string;
}

const channelTypes = [
    {
        type: 'whatsapp',
        name: 'WhatsApp Business',
        description: 'Connect your WhatsApp Business Account to send and receive messages',
        icon: MessageCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        gradient: 'from-green-500 to-green-600',
    },
    {
        type: 'instagram',
        name: 'Instagram Direct',
        description: 'Connect Instagram to manage direct messages from your business account',
        icon: Instagram,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        gradient: 'from-pink-500 to-purple-600',
    },
    {
        type: 'email',
        name: 'Email',
        description: 'Connect your email account via SMTP/IMAP to send and receive emails',
        icon: Mail,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        gradient: 'from-blue-500 to-blue-600',
    },
];

export default function ChannelsPage() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [testingChannel, setTestingChannel] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
            const data = await channelsApi.getChannels();
            setChannels(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error('Error fetching channels:', error);
            if (error.response?.status === 401) {
                setChannels([]);
            }
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
            await channelsApi.deleteChannel(channelId);
            setChannels(channels.filter(c => c.id !== channelId));
            setSuccessMessage('Channel disconnected successfully');
        } catch (error: any) {
            console.error('Error disconnecting channel:', error);
            alert(error.response?.data?.message || 'Failed to disconnect channel');
        }
    };

    const handleTestConnection = async (channelId: string) => {
        setTestingChannel(channelId);
        setTestResult(null);

        try {
            const data: any = await channelsApi.testConnection(channelId);
            setTestResult({
                id: channelId,
                success: data.success !== false,
                message: data.message || (data.success !== false ? 'Connection successful' : 'Connection failed'),
            }); setTestResult({
                id: channelId,
                success: data.success !== false,
                message: data.message || (data.success !== false ? 'Connection successful' : 'Connection failed'),
            });

            // Update channel status if test was successful
            if (data.success !== false) {
                setChannels(channels.map(c =>
                    c.id === channelId ? { ...c, status: 'connected' as const } : c
                ));
            }
        } catch (error: any) {
            setTestResult({
                id: channelId,
                success: false,
                message: error.response?.data?.message || 'Connection test failed',
            });
        } finally {
            setTestingChannel(null);
        }
    };

    const handleChannelSuccess = () => {
        setSuccessMessage('Channel connected successfully!');
        fetchChannels();
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
                        Connect and manage your communication channels in one place
                    </p>
                </div>
                <Button onClick={() => fetchChannels()} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-green-500/10">
                                <Wifi className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-700">
                                    {channels.filter(c => c.status === 'connected').length}
                                </p>
                                <p className="text-sm text-green-600">Connected Channels</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-yellow-500/10">
                                <Clock className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-yellow-700">
                                    {channels.filter(c => c.status === 'pending').length}
                                </p>
                                <p className="text-sm text-yellow-600">Pending Setup</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-red-500/10">
                                <AlertCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-700">
                                    {channels.filter(c => c.status === 'error').length}
                                </p>
                                <p className="text-sm text-red-600">Needs Attention</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Available Channels */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Available Channels</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {channelTypes.map((channelType) => {
                        const Icon = channelType.icon;
                        const connectedChannel = channels.find(c => c.channelType === channelType.type);
                        const isConnected = !!connectedChannel;
                        const isTestingThis = testingChannel === connectedChannel?.id;
                        const testResultForThis = testResult?.id === connectedChannel?.id ? testResult : null;

                        return (
                            <Card
                                key={channelType.type}
                                className={cn(
                                    'relative overflow-hidden transition-all hover:shadow-lg group',
                                    isConnected && 'ring-2 ring-offset-2',
                                    isConnected && connectedChannel.status === 'connected' && 'ring-green-500',
                                    isConnected && connectedChannel.status === 'error' && 'ring-red-500',
                                    isConnected && connectedChannel.status === 'pending' && 'ring-yellow-500'
                                )}
                            >
                                {/* Gradient header */}
                                <div className={cn('h-2 bg-gradient-to-r', channelType.gradient)} />

                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className={cn('p-3 rounded-xl shadow-sm', channelType.bgColor)}>
                                            <Icon className={cn('h-6 w-6', channelType.color)} />
                                        </div>
                                        {isConnected && connectedChannel && (
                                            <div>{getStatusBadge(connectedChannel.status)}</div>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl mt-2">{channelType.name}</CardTitle>
                                    <CardDescription>{channelType.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {isConnected && connectedChannel ? (
                                        <>
                                            <div className="text-sm text-muted-foreground space-y-1">
                                                <p className="font-medium text-foreground">{connectedChannel.name}</p>
                                                {connectedChannel.lastSyncAt && (
                                                    <p className="text-xs">
                                                        Last synced: {new Date(connectedChannel.lastSyncAt).toLocaleString()}
                                                    </p>
                                                )}
                                                <p className="text-xs">
                                                    Connected: {new Date(connectedChannel.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>

                                            {/* Test Result */}
                                            {testResultForThis && (
                                                <div className={cn(
                                                    'p-3 rounded-lg text-sm flex items-center gap-2',
                                                    testResultForThis.success
                                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                                        : 'bg-red-50 text-red-700 border border-red-200'
                                                )}>
                                                    {testResultForThis.success ? (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4" />
                                                    )}
                                                    {testResultForThis.message}
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleTestConnection(connectedChannel.id)}
                                                    disabled={isTestingThis}
                                                >
                                                    {isTestingThis ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Testing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Wifi className="mr-2 h-4 w-4" />
                                                            Test
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleConnect(channelType.type)}
                                                >
                                                    <SettingsIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDisconnect(connectedChannel.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <Button
                                            className={cn('w-full bg-gradient-to-r text-white hover:opacity-90', channelType.gradient)}
                                            onClick={() => handleConnect(channelType.type)}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Connect {channelType.name}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Connected Channels List */}
            {channels.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wifi className="h-5 w-5 text-green-600" />
                            All Connected Channels
                        </CardTitle>
                        <CardDescription>Manage all your active channel connections</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {channels.map((channel) => {
                                const channelType = channelTypes.find(ct => ct.type === channel.channelType);
                                const Icon = channelType?.icon || MessageCircle;
                                const isTestingThis = testingChannel === channel.id;

                                return (
                                    <div
                                        key={channel.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn('p-2.5 rounded-lg', channelType?.bgColor)}>
                                                <Icon className={cn('h-5 w-5', channelType?.color)} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{channel.name}</h4>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span className="capitalize">{channel.channelType}</span>
                                                    <span>•</span>
                                                    <span>Added {new Date(channel.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {getStatusBadge(channel.status)}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleTestConnection(channel.id)}
                                                disabled={isTestingThis}
                                            >
                                                {isTestingThis ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Wifi className="h-4 w-4" />
                                                )}
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
                </Card>
            )}

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
