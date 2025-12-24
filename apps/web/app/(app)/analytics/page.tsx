'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BarChart3,
    MessageSquare,
    TrendingUp,
    CheckCircle,
    Loader2,
    RefreshCw,
    Zap,
} from 'lucide-react';

interface CampaignMetrics {
    totalCampaigns: number;
    activeCampaigns: number;
    completedCampaigns: number;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalReplied: number;
    totalConverted: number;
    conversionValue: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    conversionRate: number;
    campaignPerformance: Array<{
        id: string;
        name: string;
        status: string;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
    }>;
}

interface AutomationMetrics {
    totalAutomations: number;
    activeAutomations: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    topAutomations: Array<{
        id: string;
        name: string;
        executions: number;
        successRate: number;
    }>;
}

interface ChannelMetrics {
    channels: Array<{
        type: string;
        name: string;
        messageCount: number;
        conversationCount: number;
        percentage: number;
    }>;
    totalMessages: number;
}

interface WeeklyData {
    day: string;
    inbound: number;
    outbound: number;
}

export default function AnalyticsPage() {
    const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetrics | null>(null);
    const [automationMetrics, setAutomationMetrics] = useState<AutomationMetrics | null>(null);
    const [channelMetrics, setChannelMetrics] = useState<ChannelMetrics | null>(null);
    const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState('30'); // days

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        try {
            const [campaignsRes, automationsRes, channelsRes, weeklyRes] = await Promise.all([
                fetch(`${apiUrl}/api/v1/analytics/campaigns`, { credentials: 'include' }),
                fetch(`${apiUrl}/api/v1/analytics/automations`, { credentials: 'include' }),
                fetch(`${apiUrl}/api/v1/analytics/channels`, { credentials: 'include' }),
                fetch(`${apiUrl}/api/v1/analytics/messages/weekly`, { credentials: 'include' }),
            ]);

            if (campaignsRes.ok) {
                const data = await campaignsRes.json();
                setCampaignMetrics(data);
            }
            if (automationsRes.ok) {
                const data = await automationsRes.json();
                setAutomationMetrics(data);
            }
            if (channelsRes.ok) {
                const data = await channelsRes.json();
                setChannelMetrics(data);
            }
            if (weeklyRes.ok) {
                const data = await weeklyRes.json();
                setWeeklyData(data);
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const maxMessages = weeklyData.length > 0
        ? Math.max(...weeklyData.map((d) => Math.max(d.inbound, d.outbound, 1)))
        : 1;

    const channelColors: Record<string, string> = {
        whatsapp: 'bg-green-500',
        instagram: 'bg-pink-500',
        email: 'bg-blue-500',
    };

    if (loading && !campaignMetrics) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                    <p className="text-muted-foreground">Track your performance and insights</p>
                </div>
                <div className="flex gap-2">
                    <select
                        className="h-10 rounded-md border px-3 bg-background"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                    </select>
                    <Button variant="outline" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Campaign Overview Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Campaigns</p>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{campaignMetrics?.totalCampaigns || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {campaignMetrics?.activeCampaigns || 0} active, {campaignMetrics?.completedCampaigns || 0} completed
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Messages Sent</p>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(campaignMetrics?.totalSent || 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {((campaignMetrics?.deliveryRate || 0)).toFixed(1)}% delivery rate
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Open Rate</p>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(campaignMetrics?.openRate || 0).toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            {campaignMetrics?.totalOpened || 0} opened
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Conversion Rate</p>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(campaignMetrics?.conversionRate || 0).toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            {campaignMetrics?.totalConverted || 0} conversions
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Messages Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Messages This Week</CardTitle>
                        <CardDescription>Inbound vs Outbound messages</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between gap-2 h-64">
                            {weeklyData.length > 0 ? (
                                weeklyData.map((day) => (
                                    <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                                        <div className="w-full flex gap-1 h-48 items-end">
                                            <div
                                                className="flex-1 bg-primary rounded-t"
                                                style={{ height: `${(day.inbound / maxMessages) * 100}%` }}
                                                title={`Inbound: ${day.inbound}`}
                                            />
                                            <div
                                                className="flex-1 bg-primary/40 rounded-t"
                                                style={{ height: `${(day.outbound / maxMessages) * 100}%` }}
                                                title={`Outbound: ${day.outbound}`}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground">{day.day}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                    No message data available
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-primary" />
                                <span className="text-sm text-muted-foreground">Inbound</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-primary/40" />
                                <span className="text-sm text-muted-foreground">Outbound</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Channel Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Channel Distribution</CardTitle>
                        <CardDescription>Messages by channel</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {channelMetrics?.channels?.map((channel) => (
                                <div key={channel.type} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${channelColors[channel.type] || 'bg-gray-500'}`} />
                                            <span className="font-medium">{channel.name}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {channel.conversationCount} conversations ({channel.percentage}%)
                                        </div>
                                    </div>
                                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={`h-full ${channelColors[channel.type] || 'bg-gray-500'} transition-all`}
                                            style={{ width: `${channel.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )) || (
                                    <div className="text-center text-muted-foreground py-8">
                                        No channel data available
                                    </div>
                                )}
                        </div>

                        {/* Total */}
                        {channelMetrics && (
                            <div className="flex justify-center mt-8">
                                <div className="text-center">
                                    <p className="text-3xl font-bold">{channelMetrics.totalMessages.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">Total Messages</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Automation Stats */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Automation Performance
                        </CardTitle>
                        <CardDescription>Success rates and executions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <p className="text-2xl font-bold">{automationMetrics?.totalAutomations || 0}</p>
                                <p className="text-sm text-muted-foreground">Total Automations</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <p className="text-2xl font-bold text-green-600">{automationMetrics?.activeAutomations || 0}</p>
                                <p className="text-sm text-muted-foreground">Active</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <p className="text-2xl font-bold">{automationMetrics?.totalExecutions || 0}</p>
                                <p className="text-sm text-muted-foreground">Total Executions</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <p className="text-2xl font-bold text-green-600">{(automationMetrics?.successRate || 0).toFixed(1)}%</p>
                                <p className="text-sm text-muted-foreground">Success Rate</p>
                            </div>
                        </div>

                        <h4 className="font-medium mb-3">Top Automations</h4>
                        <div className="space-y-3">
                            {automationMetrics?.topAutomations?.slice(0, 5).map((automation, index) => (
                                <div key={automation.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                            {index + 1}
                                        </div>
                                        <span className="font-medium">{automation.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{automation.executions}</p>
                                        <p className="text-xs text-muted-foreground">{automation.successRate.toFixed(0)}% success</p>
                                    </div>
                                </div>
                            )) || (
                                    <p className="text-muted-foreground text-center py-4">No automations yet</p>
                                )}
                        </div>
                    </CardContent>
                </Card>

                {/* Campaign Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-500" />
                            Campaign Performance
                        </CardTitle>
                        <CardDescription>Recent campaign results</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-2 mb-6">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <p className="text-xl font-bold text-blue-600">{campaignMetrics?.totalSent || 0}</p>
                                <p className="text-xs text-muted-foreground">Sent</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                <p className="text-xl font-bold text-green-600">{campaignMetrics?.totalDelivered || 0}</p>
                                <p className="text-xs text-muted-foreground">Delivered</p>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                                <p className="text-xl font-bold text-purple-600">{campaignMetrics?.totalOpened || 0}</p>
                                <p className="text-xs text-muted-foreground">Opened</p>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                                <p className="text-xl font-bold text-orange-600">{campaignMetrics?.totalClicked || 0}</p>
                                <p className="text-xs text-muted-foreground">Clicked</p>
                            </div>
                        </div>

                        <h4 className="font-medium mb-3">Recent Campaigns</h4>
                        <div className="space-y-3">
                            {campaignMetrics?.campaignPerformance?.slice(0, 5).map((campaign) => (
                                <div key={campaign.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                                    <div>
                                        <p className="font-medium">{campaign.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{campaign.status}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{campaign.sent} sent</p>
                                        <p className="text-xs text-muted-foreground">
                                            {campaign.sent > 0 ? ((campaign.delivered / campaign.sent) * 100).toFixed(0) : 0}% delivered
                                        </p>
                                    </div>
                                </div>
                            )) || (
                                    <p className="text-muted-foreground text-center py-4">No campaigns yet</p>
                                )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
