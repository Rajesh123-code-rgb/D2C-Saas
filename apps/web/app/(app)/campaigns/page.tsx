'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    MessageSquare,
    Plus,
    Search,
    Play,
    Pause,
    Calendar,
    Send,
    BarChart3,
    Users,
    Clock,
    CheckCircle,
    XCircle,
    MoreVertical,
    Mail,
    TrendingUp,
    Eye,
    ShoppingBag,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CampaignStats {
    totalTargeted: number;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalReplied: number;
    totalConverted: number;
    conversionValue: number;
}

interface Campaign {
    id: string;
    name: string;
    description: string;
    type: string;
    primaryChannel: string;
    status: string;
    scheduledAt?: string;
    completedAt?: string;
    startedAt?: string;
    stats: CampaignStats;
}

const statusConfig = {
    draft: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Draft' },
    scheduled: { color: 'bg-blue-100 text-blue-700', icon: Calendar, label: 'Scheduled' },
    running: { color: 'bg-green-100 text-green-700', icon: Play, label: 'Running' },
    paused: { color: 'bg-yellow-100 text-yellow-700', icon: Pause, label: 'Paused' },
    completed: { color: 'bg-purple-100 text-purple-700', icon: CheckCircle, label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Cancelled' },
};

const channelIcons = {
    whatsapp: MessageSquare,
    email: Mail,
};

export default function CampaignsPage() {
    const searchParams = useSearchParams();
    const initialSegmentId = searchParams.get('segmentId');

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [segments, setSegments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/campaigns');
            if (!response.ok) throw new Error('Failed to fetch campaigns');
            const data = await response.json();
            setCampaigns(data.campaigns || data || []);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    // Fetch segments for the create modal
    useEffect(() => {
        const fetchSegments = async () => {
            try {
                const response = await fetch('/api/segments');
                if (response.ok) {
                    const data = await response.json();
                    setSegments(data.segments || data || []);
                }
            } catch (error) {
                console.error('Error fetching segments:', error);
            }
        };
        fetchSegments();
    }, []);

    // Auto-open modal when segmentId is in URL
    useEffect(() => {
        if (initialSegmentId && !loading) {
            setShowCreateModal(true);
        }
    }, [initialSegmentId, loading]);

    const filteredCampaigns = campaigns.filter((campaign) => {
        const matchesSearch = campaign.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || campaign.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    // Calculate overall stats
    const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.totalSent || 0), 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + (c.stats?.totalDelivered || 0), 0);
    const totalConverted = campaigns.reduce((sum, c) => sum + (c.stats?.totalConverted || 0), 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.stats?.conversionValue || 0), 0);

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
                    <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
                    <p className="text-muted-foreground">Create and manage marketing campaigns</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-violet-500/10 via-transparent to-transparent border-violet-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Messages Sent</p>
                        <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <Send className="h-4 w-4 text-violet-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalSent.toLocaleString()}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-2 bg-violet-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-violet-500 rounded-full transition-all"
                                    style={{ width: `${totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0}%` }}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0}% delivered
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 via-transparent to-transparent border-blue-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Open Rate</p>
                        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Eye className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {totalDelivered > 0 ? Math.round((campaigns.reduce((sum, c) => sum + (c.stats?.totalOpened || 0), 0) / totalDelivered) * 100) : 0}%
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-green-600 font-medium">+5%</span>
                            <span className="text-xs text-muted-foreground">from last month</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500/10 via-transparent to-transparent border-orange-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Conversions</p>
                        <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <ShoppingBag className="h-4 w-4 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalConverted.toLocaleString()}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-2 bg-orange-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-orange-500 rounded-full transition-all"
                                    style={{ width: `${totalSent > 0 ? Math.min(Math.round((totalConverted / totalSent) * 100), 100) : 0}%` }}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {totalSent > 0 ? Math.round((totalConverted / totalSent) * 100) : 0}% rate
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border-emerald-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Revenue Generated</p>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">₹{totalRevenue.toLocaleString()}</div>
                        <div className="flex items-center gap-1 mt-2">
                            <BarChart3 className="h-3 w-3 text-emerald-500" />
                            <span className="text-xs text-muted-foreground">From {campaigns.length} campaigns</span>
                        </div>
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
                                placeholder="Search campaigns..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex gap-2 flex-wrap">
                                {['all', 'draft', 'scheduled', 'running', 'completed'].map((status) => (
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

            {/* Campaigns List */}
            <div className="space-y-4">
                {filteredCampaigns.map((campaign) => {
                    const StatusIcon = statusConfig[campaign.status as keyof typeof statusConfig]?.icon || Clock;
                    const ChannelIcon = channelIcons[campaign.primaryChannel as keyof typeof channelIcons] || MessageSquare;
                    const stats = campaign.stats;
                    const deliveryRate = stats.totalSent > 0 ? Math.round((stats.totalDelivered / stats.totalSent) * 100) : 0;
                    const openRate = stats.totalDelivered > 0 ? Math.round((stats.totalOpened / stats.totalDelivered) * 100) : 0;
                    const clickRate = stats.totalOpened > 0 ? Math.round((stats.totalClicked / stats.totalOpened) * 100) : 0;

                    return (
                        <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            'flex h-12 w-12 items-center justify-center rounded-lg',
                                            campaign.primaryChannel === 'whatsapp' ? 'bg-green-100' : 'bg-blue-100'
                                        )}>
                                            <ChannelIcon className={cn(
                                                'h-6 w-6',
                                                campaign.primaryChannel === 'whatsapp' ? 'text-green-600' : 'text-blue-600'
                                            )} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{campaign.name}</h3>
                                            <p className="text-sm text-muted-foreground">{campaign.description}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className={cn(
                                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                                                    statusConfig[campaign.status as keyof typeof statusConfig]?.color
                                                )}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {statusConfig[campaign.status as keyof typeof statusConfig]?.label}
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {stats.totalTargeted.toLocaleString()} targeted
                                                </span>
                                                {campaign.scheduledAt && (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(campaign.scheduledAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button size="icon" variant="ghost">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Stats Row */}
                                {stats.totalSent > 0 ? (
                                    <div className="grid grid-cols-5 gap-4 mt-6 pt-4 border-t">
                                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                                            <div className="text-lg font-bold text-violet-600">{stats.totalSent.toLocaleString()}</div>
                                            <div className="text-xs text-muted-foreground">Sent</div>
                                        </div>
                                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                                            <div className="text-lg font-bold text-blue-600">{deliveryRate}%</div>
                                            <div className="text-xs text-muted-foreground">Delivered</div>
                                        </div>
                                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                                            <div className="text-lg font-bold text-cyan-600">{openRate}%</div>
                                            <div className="text-xs text-muted-foreground">Opened</div>
                                        </div>
                                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                                            <div className="text-lg font-bold text-orange-600">{clickRate}%</div>
                                            <div className="text-xs text-muted-foreground">Clicked</div>
                                        </div>
                                        <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <div className="text-lg font-bold text-emerald-600">₹{stats.conversionValue.toLocaleString()}</div>
                                            <div className="text-xs text-emerald-600/80">Revenue</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-6 pt-4 border-t">
                                        <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground bg-muted/30 rounded-lg">
                                            <BarChart3 className="h-4 w-4" />
                                            <span className="text-sm">Analytics will appear once the campaign is sent</span>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                    <div className="flex gap-2">
                                        {campaign.status === 'draft' && (
                                            <>
                                                <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                                                    <Send className="mr-2 h-4 w-4" />
                                                    Send Now
                                                </Button>
                                                <Button size="sm" variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50">
                                                    <Calendar className="mr-2 h-4 w-4" />
                                                    Schedule
                                                </Button>
                                            </>
                                        )}
                                        {campaign.status === 'scheduled' && (
                                            <>
                                                <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Send Now
                                                </Button>
                                                <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                                                    <XCircle className="mr-2 h-4 w-4" />
                                                    Cancel
                                                </Button>
                                            </>
                                        )}
                                        {campaign.status === 'running' && (
                                            <Button size="sm" variant="outline" className="border-yellow-200 text-yellow-700 hover:bg-yellow-50">
                                                <Pause className="mr-2 h-4 w-4" />
                                                Pause Campaign
                                            </Button>
                                        )}
                                        {campaign.status === 'completed' && (
                                            <>
                                                <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                                                    <BarChart3 className="mr-2 h-4 w-4" />
                                                    View Report
                                                </Button>
                                                <Button size="sm" variant="outline">
                                                    <Mail className="mr-2 h-4 w-4" />
                                                    Duplicate
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="icon" variant="ghost" className="h-8 w-8">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {filteredCampaigns.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <MessageSquare className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery || filterStatus !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'Create your first campaign to get started'}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateCampaignModal
                    onClose={() => setShowCreateModal(false)}
                    segments={segments}
                    initialSegmentId={initialSegmentId || undefined}
                    onCampaignCreated={fetchCampaigns}
                />
            )}
        </div>
    );
}

function CreateCampaignModal({
    onClose,
    segments = [],
    initialSegmentId,
    onCampaignCreated
}: {
    onClose: () => void;
    segments?: any[];
    initialSegmentId?: string;
    onCampaignCreated?: () => void;
}) {
    const [step, setStep] = useState(1);
    const [channel, setChannel] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedSegment, setSelectedSegment] = useState(initialSegmentId || '');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [scheduleType, setScheduleType] = useState<'now' | 'scheduled'>('now');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Find the segment name for display
    const selectedSegmentData = segments.find(s => s.id === selectedSegment);

    // Fetch templates when WhatsApp is selected
    useEffect(() => {
        if (channel === 'whatsapp') {
            const fetchTemplates = async () => {
                try {
                    const response = await fetch('/api/templates');
                    if (response.ok) {
                        const data = await response.json();
                        setTemplates(data.templates || data || []);
                    }
                } catch (error) {
                    console.error('Error fetching templates:', error);
                }
            };
            fetchTemplates();
        }
    }, [channel]);

    const handleCreateCampaign = async () => {
        if (!name || !selectedSegment || !channel) {
            setError('Please fill in all required fields');
            return;
        }

        if (channel === 'whatsapp' && !selectedTemplate) {
            setError('Please select a template');
            return;
        }

        if (channel === 'email' && (!emailSubject || !emailBody)) {
            setError('Please fill in email subject and body');
            return;
        }

        if (scheduleType === 'scheduled' && (!scheduledDate || !scheduledTime)) {
            setError('Please set a schedule date and time');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Determine the correct campaign type based on channel
            const campaignType = channel === 'whatsapp' ? 'whatsapp_template' : 'email';

            const campaignData: any = {
                name,
                description,
                primaryChannel: channel,
                type: campaignType,
                targeting: {
                    segmentIds: [selectedSegment],
                },
            };

            // Add content based on channel
            if (channel === 'whatsapp') {
                campaignData.content = {
                    channel: 'whatsapp',
                    templateId: selectedTemplate,
                };
            } else {
                campaignData.content = {
                    channel: 'email',
                    emailSubject: emailSubject,
                    emailBody: emailBody,
                };
            }

            if (scheduleType === 'scheduled') {
                campaignData.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
            }

            const response = await fetch('/api/campaigns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(campaignData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to create campaign');
            }

            // Success!
            if (onCampaignCreated) {
                onCampaignCreated();
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create campaign');
        } finally {
            setLoading(false);
        }
    };

    const totalSteps = 4;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Create Campaign</CardTitle>
                            <CardDescription>Step {step} of {totalSteps}</CardDescription>
                        </div>
                        <Button size="icon" variant="ghost" onClick={onClose}>×</Button>
                    </div>
                    {/* Show pre-selected segment banner */}
                    {initialSegmentId && selectedSegmentData && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                <span className="text-sm text-blue-800">
                                    Creating campaign for segment: <strong>{selectedSegmentData.name}</strong>
                                    {selectedSegmentData.contactCount !== undefined && (
                                        <span className="ml-1">({selectedSegmentData.contactCount} contacts)</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    )}
                    {/* Progress bar */}
                    <div className="mt-4 flex gap-1">
                        {[1, 2, 3, 4].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    'h-1 flex-1 rounded-full transition-colors',
                                    s <= step ? 'bg-primary' : 'bg-muted'
                                )}
                            />
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Channel Selection */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold">Choose Channel</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setChannel('whatsapp')}
                                    className={cn(
                                        'flex items-center gap-4 p-6 rounded-lg border-2 transition-colors text-left',
                                        channel === 'whatsapp' ? 'border-green-500 bg-green-50' : 'border-muted hover:border-muted-foreground/50'
                                    )}
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                                        <MessageSquare className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">WhatsApp</p>
                                        <p className="text-sm text-muted-foreground">Send template messages</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setChannel('email')}
                                    className={cn(
                                        'flex items-center gap-4 p-6 rounded-lg border-2 transition-colors text-left',
                                        channel === 'email' ? 'border-blue-500 bg-blue-50' : 'border-muted hover:border-muted-foreground/50'
                                    )}
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                                        <Mail className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Email</p>
                                        <p className="text-sm text-muted-foreground">Send email campaigns</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Campaign Details */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold">Campaign Details</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Campaign Name *</label>
                                    <Input
                                        placeholder="e.g., Holiday Sale Announcement"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Input
                                        placeholder="Brief description of the campaign"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Target Segment *</label>
                                    <select
                                        className="w-full h-10 rounded-md border px-3 bg-background"
                                        value={selectedSegment}
                                        onChange={(e) => setSelectedSegment(e.target.value)}
                                    >
                                        <option value="">Select a segment...</option>
                                        {segments.map((segment) => (
                                            <option key={segment.id} value={segment.id}>
                                                {segment.name} ({segment.contactCount || 0} contacts)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Message Content */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold">Message Content</h3>
                            <div className="grid grid-cols-2 gap-6">
                                {/* Left: Form inputs */}
                                <div className="space-y-4">
                                    {channel === 'whatsapp' ? (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">WhatsApp Template *</label>
                                                <select
                                                    className="w-full h-10 rounded-md border px-3 bg-background"
                                                    value={selectedTemplate}
                                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                                >
                                                    <option value="">Select a template...</option>
                                                    {templates.length > 0 ? (
                                                        templates.map((template) => (
                                                            <option key={template.id} value={template.id}>
                                                                {template.name} ({template.status})
                                                            </option>
                                                        ))
                                                    ) : (
                                                        <>
                                                            <option value="order_confirmation">Order Confirmation</option>
                                                            <option value="abandoned_cart">Abandoned Cart Reminder</option>
                                                            <option value="promotional">Promotional Offer</option>
                                                        </>
                                                    )}
                                                </select>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Only approved WhatsApp templates can be used for campaigns
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Subject Line *</label>
                                                <Input
                                                    placeholder="Enter email subject..."
                                                    value={emailSubject}
                                                    onChange={(e) => setEmailSubject(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Email Body *</label>
                                                <textarea
                                                    className="w-full h-32 rounded-md border px-3 py-2 bg-background"
                                                    placeholder="Write your email content..."
                                                    value={emailBody}
                                                    onChange={(e) => setEmailBody(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Preview */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Preview</label>
                                    {channel === 'whatsapp' ? (
                                        /* WhatsApp Style Preview */
                                        <div className="bg-[#075E54] rounded-lg overflow-hidden">
                                            {/* WhatsApp Header */}
                                            <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                                    B
                                                </div>
                                                <div>
                                                    <p className="text-white text-sm font-medium">Your Business</p>
                                                    <p className="text-white/70 text-xs">Business Account</p>
                                                </div>
                                            </div>
                                            {/* Chat Area */}
                                            <div className="bg-[#ECE5DD] p-4 min-h-[200px]">
                                                {selectedTemplate ? (
                                                    <div className="bg-white rounded-lg p-3 max-w-[90%] shadow-sm">
                                                        <p className="text-sm text-gray-800">
                                                            {templates.find(t => t.id === selectedTemplate)?.content ||
                                                                `📢 Template: ${selectedTemplate}\n\nHello {{1}},\n\nYour message content will appear here based on the selected template.`}
                                                        </p>
                                                        <p className="text-right text-xs text-gray-500 mt-1">
                                                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center h-[150px] text-gray-500 text-sm">
                                                        Select a template to preview
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Email Style Preview */
                                        <div className="border rounded-lg overflow-hidden bg-white">
                                            {/* Email Inbox Header */}
                                            <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 border-b">
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Mail className="h-4 w-4" />
                                                    <span>Inbox</span>
                                                </div>
                                            </div>
                                            {/* Email Content */}
                                            <div className="p-4">
                                                {emailSubject || emailBody ? (
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-3">
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
                                                        <div className="pl-[52px]">
                                                            <h4 className="font-semibold text-base mb-2">
                                                                {emailSubject || 'No subject'}
                                                            </h4>
                                                            <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded min-h-[80px]">
                                                                {emailBody || 'No content yet...'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center h-[150px] text-gray-500 text-sm">
                                                        Enter subject and body to preview
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Scheduling */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold">Schedule Campaign</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setScheduleType('now')}
                                        className={cn(
                                            'flex items-center gap-3 p-4 rounded-lg border-2 transition-colors text-left',
                                            scheduleType === 'now' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                                        )}
                                    >
                                        <Send className="h-5 w-5" />
                                        <div>
                                            <p className="font-medium">Send Now</p>
                                            <p className="text-xs text-muted-foreground">Start immediately</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setScheduleType('scheduled')}
                                        className={cn(
                                            'flex items-center gap-3 p-4 rounded-lg border-2 transition-colors text-left',
                                            scheduleType === 'scheduled' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                                        )}
                                    >
                                        <Calendar className="h-5 w-5" />
                                        <div>
                                            <p className="font-medium">Schedule</p>
                                            <p className="text-xs text-muted-foreground">Set date & time</p>
                                        </div>
                                    </button>
                                </div>

                                {scheduleType === 'scheduled' && (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Date</label>
                                            <Input
                                                type="date"
                                                value={scheduledDate}
                                                onChange={(e) => setScheduledDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Time</label>
                                            <Input
                                                type="time"
                                                value={scheduledTime}
                                                onChange={(e) => setScheduledTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Summary */}
                                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                                    <h4 className="text-sm font-medium">Campaign Summary</h4>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <p><strong>Name:</strong> {name || '-'}</p>
                                        <p><strong>Channel:</strong> {channel === 'whatsapp' ? 'WhatsApp' : 'Email'}</p>
                                        <p><strong>Segment:</strong> {selectedSegmentData?.name || '-'} ({selectedSegmentData?.contactCount || 0} contacts)</p>
                                        <p><strong>Schedule:</strong> {scheduleType === 'now' ? 'Send immediately' : `${scheduledDate} at ${scheduledTime}`}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between pt-4 border-t">
                        <Button variant="outline" onClick={step === 1 ? onClose : () => setStep(step - 1)}>
                            {step === 1 ? 'Cancel' : 'Back'}
                        </Button>
                        {step < totalSteps ? (
                            <Button
                                onClick={() => setStep(step + 1)}
                                disabled={
                                    (step === 1 && !channel) ||
                                    (step === 2 && (!name || !selectedSegment)) ||
                                    (step === 3 && channel === 'whatsapp' && !selectedTemplate) ||
                                    (step === 3 && channel === 'email' && (!emailSubject || !emailBody))
                                }
                            >
                                Continue
                            </Button>
                        ) : (
                            <Button onClick={handleCreateCampaign} disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        {scheduleType === 'now' ? 'Create & Send' : 'Schedule Campaign'}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
