'use client';

import { useState } from 'react';
import {
    BarChart3,

    Users,
    MessageSquare,
    DollarSign,
    Calendar,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    Filter,
    Activity,
    Globe,
    Smartphone,
    Mail,
    Zap,
    Clock,
    Target,
    FileText,
    ChevronDown,
} from 'lucide-react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Metric {
    label: string;
    value: number;
    previousValue: number;
    change: number;
    changeType: 'increase' | 'decrease';
    format: 'number' | 'currency' | 'percent';
    icon: React.ReactNode;
    color: string;
}

interface ChannelMetric {
    channel: string;
    icon: React.ReactNode;
    messages: number;
    delivered: number;
    read: number;
    responded: number;
    color: string;
}

interface CampaignPerformance {
    id: string;
    name: string;
    channel: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    status: 'active' | 'completed' | 'paused';
}

interface GeographicData {
    country: string;
    code: string;
    users: number;
    messages: number;
    revenue: number;
    growth: number;
}

const mockMetrics: Metric[] = [
    {
        label: 'Total Revenue',
        value: 1250000,
        previousValue: 1110000,
        change: 12.6,
        changeType: 'increase',
        format: 'currency',
        icon: <DollarSign className="h-5 w-5" />,
        color: 'green'
    },
    {
        label: 'Active Tenants',
        value: 156,
        previousValue: 144,
        change: 8.3,
        changeType: 'increase',
        format: 'number',
        icon: <Users className="h-5 w-5" />,
        color: 'gray'
    },
    {
        label: 'Messages Sent',
        value: 2450000,
        previousValue: 2125000,
        change: 15.3,
        changeType: 'increase',
        format: 'number',
        icon: <MessageSquare className="h-5 w-5" />,
        color: 'gray'
    },
    {
        label: 'Delivery Rate',
        value: 96.8,
        previousValue: 95.2,
        change: 1.7,
        changeType: 'increase',
        format: 'percent',
        icon: <Target className="h-5 w-5" />,
        color: 'gray'
    },
    {
        label: 'Avg Response Time',
        value: 2.4,
        previousValue: 3.1,
        change: 22.6,
        changeType: 'increase',
        format: 'number',
        icon: <Clock className="h-5 w-5" />,
        color: 'gray'
    },
    {
        label: 'Conversion Rate',
        value: 4.2,
        previousValue: 3.8,
        change: 10.5,
        changeType: 'increase',
        format: 'percent',
        icon: <Zap className="h-5 w-5" />,
        color: 'gray'
    },
];

const mockChannelMetrics: ChannelMetric[] = [
    { channel: 'WhatsApp', icon: <Smartphone className="h-5 w-5" />, messages: 1850000, delivered: 1795000, read: 1620000, responded: 890000, color: 'green' },
    { channel: 'SMS', icon: <MessageSquare className="h-5 w-5" />, messages: 420000, delivered: 415000, read: 390000, responded: 145000, color: 'gray' },
    { channel: 'Email', icon: <Mail className="h-5 w-5" />, messages: 180000, delivered: 172000, read: 68000, responded: 12000, color: 'gray' },
];

const mockCampaigns: CampaignPerformance[] = [
    { id: '1', name: 'Holiday Sale 2024', channel: 'WhatsApp', sent: 125000, delivered: 122400, opened: 98500, clicked: 15200, converted: 3800, status: 'completed' },
    { id: '2', name: 'New Year Promo', channel: 'WhatsApp', sent: 85000, delivered: 83200, opened: 72100, clicked: 12500, converted: 2100, status: 'active' },
    { id: '3', name: 'Flash Sale Alert', channel: 'SMS', sent: 45000, delivered: 44800, opened: 44000, clicked: 8900, converted: 1450, status: 'completed' },
    { id: '4', name: 'Weekly Newsletter', channel: 'Email', sent: 32000, delivered: 30500, opened: 12200, clicked: 2100, converted: 340, status: 'active' },
    { id: '5', name: 'Abandoned Cart', channel: 'WhatsApp', sent: 28000, delivered: 27600, opened: 24500, clicked: 8200, converted: 2050, status: 'active' },
];

const mockGeographicData: GeographicData[] = [
    { country: 'India', code: 'IN', users: 12500, messages: 1850000, revenue: 850000, growth: 18.5 },
    { country: 'United States', code: 'US', users: 2400, messages: 320000, revenue: 180000, growth: 12.3 },
    { country: 'United Kingdom', code: 'UK', users: 1800, messages: 185000, revenue: 95000, growth: 8.7 },
    { country: 'United Arab Emirates', code: 'AE', users: 950, messages: 125000, revenue: 72000, growth: 25.4 },
    { country: 'Singapore', code: 'SG', users: 620, messages: 85000, revenue: 53000, growth: 15.2 },
];

const mockDailyData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(30000 + Math.random() * 25000 + (i > 20 ? 15000 : 0)),
        messages: Math.floor(70000 + Math.random() * 40000),
        users: Math.floor(140 + i * 0.5 + Math.random() * 5),
    };
});

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState('30d');
    const [activeTab, setActiveTab] = useState('overview');

    const formatValue = (value: number, format: string) => {
        if (format === 'currency') {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
            }).format(value);
        }
        if (format === 'percent') {
            return `${value}%`;
        }
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return value.toLocaleString();
    };

    const handleRefresh = () => {
        setLoading(true);
        // Simulate data refresh
        setTimeout(() => {
            setLoading(false);
        }, 2000);
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Analytics & Reports</h1>
                    <p className="text-neutral-400 mt-2 text-lg">Comprehensive platform performance insights</p>
                </div>
                <div className="flex gap-3">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white backdrop-blur-md">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-white/10 text-white">
                            <SelectItem value="24h">Last 24 hours</SelectItem>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="1y">This year</SelectItem>
                        </SelectContent>
                    </Select>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white backdrop-blur-md">
                                <Download className="h-4 w-4 mr-2" />
                                Export
                                <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-black border-white/10 text-white">
                            <DropdownMenuItem className="text-white cursor-pointer hover:bg-white/5">
                                <FileText className="h-4 w-4 mr-2" />
                                Export as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-white cursor-pointer hover:bg-white/5">
                                <FileText className="h-4 w-4 mr-2" />
                                Export as CSV
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem className="text-white cursor-pointer hover:bg-white/5">
                                <Mail className="h-4 w-4 mr-2" />
                                Schedule Report
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        className="bg-neutral-700 hover:bg-neutral-600 text-white shadow-lg shadow-black/30"
                        disabled={loading}
                        onClick={handleRefresh}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-white/5 border border-white/10 p-1">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-neutral-400">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="channels" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-neutral-400">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Channels
                    </TabsTrigger>
                    <TabsTrigger value="campaigns" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-neutral-400">
                        <Target className="h-4 w-4 mr-2" />
                        Campaigns
                    </TabsTrigger>
                    <TabsTrigger value="geographic" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-neutral-400">
                        <Globe className="h-4 w-4 mr-2" />
                        Geographic
                    </TabsTrigger>
                    <TabsTrigger value="realtime" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-neutral-400">
                        <Activity className="h-4 w-4 mr-2" />
                        Real-time
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {mockMetrics.map((metric) => (
                            <GlassCard key={metric.label} className="glass-card-hover group">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={cn("p-2.5 rounded-xl transition-colors", `bg-${metric.color}-500/10 text-${metric.color}-400 group-hover:bg-${metric.color}-500/20`)}>
                                            {metric.icon}
                                        </div>
                                        <Badge className={cn(
                                            "flex items-center gap-1 border-0",
                                            metric.changeType === 'increase'
                                                ? "bg-neutral-800 text-neutral-300"
                                                : "bg-neutral-800 text-neutral-400"
                                        )}>
                                            {metric.changeType === 'increase' ? (
                                                <ArrowUpRight className="h-3 w-3" />
                                            ) : (
                                                <ArrowDownRight className="h-3 w-3" />
                                            )}
                                            {metric.change}%
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">{metric.label}</p>
                                    <p className="text-2xl font-bold text-white mt-1">
                                        {formatValue(metric.value, metric.format)}
                                    </p>
                                </CardContent>
                            </GlassCard>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Revenue Trend */}
                        <GlassCard>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-neutral-800 text-neutral-300">
                                                <DollarSign className="h-5 w-5" />
                                            </div>
                                            Revenue Trend
                                        </CardTitle>
                                        <CardDescription className="text-neutral-400 mt-1">
                                            Daily revenue for the selected period
                                        </CardDescription>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold text-transparent bg-clip-text text-white">
                                            {formatValue(1250000, 'currency')}
                                        </p>
                                        <p className="text-sm text-neutral-300/80 font-medium">+12.6% vs last period</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64 flex items-end justify-between gap-1.5 pt-4">
                                    {mockDailyData.slice(-14).map((day, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center group">
                                            <div className="relative w-full h-full flex items-end">
                                                <div
                                                    className="w-full bg-gradient-to-t from-green-500/20 to-green-500/60 rounded-t-md transition-all duration-300 group-hover:to-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                                                    style={{ height: `${(day.revenue / 55000) * 100}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-neutral-500 mt-2 font-mono group-hover:text-neutral-300 transition-colors">
                                                {new Date(day.date).getDate()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </GlassCard>

                        {/* Message Volume */}
                        <GlassCard>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-neutral-800 text-white">
                                                <MessageSquare className="h-5 w-5" />
                                            </div>
                                            Message Volume
                                        </CardTitle>
                                        <CardDescription className="text-neutral-400 mt-1">
                                            Messages sent across all channels
                                        </CardDescription>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold text-white">2.45M</p>
                                        <p className="text-sm text-white/80 font-medium">+15.3% vs last period</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64 flex items-end justify-between gap-1.5 pt-4">
                                    {mockDailyData.slice(-14).map((day, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center group">
                                            <div className="relative w-full h-full flex items-end">
                                                <div
                                                    className="w-full bg-gradient-to-t from-blue-500/20 to-blue-500/60 rounded-t-md transition-all duration-300 group-hover:to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                                                    style={{ height: `${(day.messages / 110000) * 100}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-neutral-500 mt-2 font-mono group-hover:text-white transition-colors">
                                                {new Date(day.date).getDate()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </GlassCard>
                    </div>

                    {/* Top Tenants */}
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-neutral-800 text-white">
                                    <Users className="h-5 w-5" />
                                </div>
                                Top Performing Tenants
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[
                                    { name: 'TechStart Inc', revenue: 125000, messages: 450000, growth: 25.3 },
                                    { name: 'ABC Corp', revenue: 98000, messages: 320000, growth: 18.7 },
                                    { name: 'XYZ Ltd', revenue: 87000, messages: 280000, growth: 12.4 },
                                    { name: 'Demo Inc', revenue: 76000, messages: 240000, growth: -5.2 },
                                    { name: 'StartupHub', revenue: 65000, messages: 210000, growth: 32.1 },
                                ].map((tenant, i) => (
                                    <div
                                        key={tenant.name}
                                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all hover:translate-x-1"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-black/30">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{tenant.name}</p>
                                                <p className="text-xs text-neutral-400 mt-0.5">
                                                    {tenant.messages.toLocaleString()} messages
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-white">
                                                {formatValue(tenant.revenue, 'currency')}
                                            </p>
                                            <Badge className={cn(
                                                "mt-1 border-0",
                                                tenant.growth >= 0
                                                    ? "bg-neutral-800 text-neutral-300"
                                                    : "bg-neutral-800 text-neutral-400"
                                            )}>
                                                {tenant.growth >= 0 ? '+' : ''}{tenant.growth}%
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </GlassCard>
                </TabsContent>

                {/* Channels Tab */}
                <TabsContent value="channels" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {mockChannelMetrics.map((channel) => (
                            <GlassCard key={channel.channel} className="glass-card-hover">
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        <div className={cn("p-3 rounded-xl shadow-lg", `bg-${channel.color}-500/10 text-${channel.color}-400 shadow-${channel.color}-500/10`)}>
                                            {channel.icon}
                                        </div>
                                        <div>
                                            <CardTitle className="text-white text-lg">{channel.channel}</CardTitle>
                                            <CardDescription className="text-neutral-400">
                                                {formatValue(channel.messages, 'number')} messages
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs mb-2 uppercase tracking-wide font-medium">
                                                <span className="text-neutral-500">Delivery Rate</span>
                                                <span className="text-neutral-300">
                                                    {((channel.delivered / channel.messages) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                            <Progress value={(channel.delivered / channel.messages) * 100} className="h-1.5 bg-neutral-800" indicatorClassName="bg-green-500" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-2 uppercase tracking-wide font-medium">
                                                <span className="text-neutral-500">Read Rate</span>
                                                <span className="text-white">
                                                    {((channel.read / channel.delivered) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                            <Progress value={(channel.read / channel.delivered) * 100} className="h-1.5 bg-neutral-800" indicatorClassName="bg-blue-500" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-2 uppercase tracking-wide font-medium">
                                                <span className="text-neutral-500">Response Rate</span>
                                                <span className="text-white">
                                                    {((channel.responded / channel.read) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                            <Progress value={(channel.responded / channel.read) * 100} className="h-1.5 bg-neutral-800" indicatorClassName="bg-neutral-600" />
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-center">
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <p className="text-xl font-bold text-white">{formatValue(channel.delivered, 'number')}</p>
                                            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mt-1">Delivered</p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <p className="text-xl font-bold text-white">{formatValue(channel.responded, 'number')}</p>
                                            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mt-1">Responses</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </GlassCard>
                        ))}
                    </div>

                    {/* Channel Comparison */}
                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="text-white">Channel Performance Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-neutral-400 text-xs uppercase tracking-wider border-b border-white/10">
                                            <th className="pb-4 font-medium pl-4">Channel</th>
                                            <th className="pb-4 font-medium text-right">Messages</th>
                                            <th className="pb-4 font-medium text-right">Delivered</th>
                                            <th className="pb-4 font-medium text-right">Delivery %</th>
                                            <th className="pb-4 font-medium text-right">Read</th>
                                            <th className="pb-4 font-medium text-right">Read %</th>
                                            <th className="pb-4 font-medium text-right">Responses</th>
                                            <th className="pb-4 font-medium text-right pr-4">Response %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {mockChannelMetrics.map((channel) => (
                                            <tr key={channel.channel} className="text-sm hover:bg-white/5 transition-colors">
                                                <td className="py-4 pl-4 text-white font-medium flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full bg-${channel.color}-500`} />
                                                    {channel.channel}
                                                </td>
                                                <td className="py-4 text-right text-neutral-300">{channel.messages.toLocaleString()}</td>
                                                <td className="py-4 text-right text-neutral-300">{channel.delivered.toLocaleString()}</td>
                                                <td className="py-4 text-right text-neutral-300 font-medium">{((channel.delivered / channel.messages) * 100).toFixed(1)}%</td>
                                                <td className="py-4 text-right text-neutral-300">{channel.read.toLocaleString()}</td>
                                                <td className="py-4 text-right text-white font-medium">{((channel.read / channel.delivered) * 100).toFixed(1)}%</td>
                                                <td className="py-4 text-right text-neutral-300">{channel.responded.toLocaleString()}</td>
                                                <td className="py-4 text-right pr-4 text-white font-medium">{((channel.responded / channel.read) * 100).toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </GlassCard>
                </TabsContent>

                {/* Campaigns Tab */}
                <TabsContent value="campaigns" className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-4">
                        {[
                            { label: 'Total Campaigns', value: '24', sub: '+4 this month', color: 'green' },
                            { label: 'Active Campaigns', value: '8', sub: 'Running now', color: 'gray' },
                            { label: 'Avg. Conversion Rate', value: '4.2%', sub: '+0.8% vs avg', color: 'gray' },
                            { label: 'Total Conversions', value: '9,740', sub: '+22% this period', color: 'gray' }
                        ].map((stat, i) => (
                            <GlassCard key={i} className="glass-card-hover">
                                <CardContent className="pt-6">
                                    <p className="text-xs text-neutral-400 uppercase tracking-wider">{stat.label}</p>
                                    <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                                    <p className={`text-xs mt-2 text-${stat.color}-400`}>{stat.sub}</p>
                                </CardContent>
                            </GlassCard>
                        ))}
                    </div>

                    <GlassCard>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-white">Campaign Performance</CardTitle>
                                <Button variant="outline" className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Filter
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-neutral-400 text-xs uppercase tracking-wider border-b border-white/10">
                                            <th className="pb-4 font-medium pl-4">Campaign</th>
                                            <th className="pb-4 font-medium">Channel</th>
                                            <th className="pb-4 font-medium text-right">Sent</th>
                                            <th className="pb-4 font-medium text-right">Delivered</th>
                                            <th className="pb-4 font-medium text-right">Opened</th>
                                            <th className="pb-4 font-medium text-right">Clicked</th>
                                            <th className="pb-4 font-medium text-right">Converted</th>
                                            <th className="pb-4 font-medium text-right">Conv. Rate</th>
                                            <th className="pb-4 font-medium pr-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {mockCampaigns.map((campaign) => (
                                            <tr key={campaign.id} className="hover:bg-white/5 transition-colors text-sm">
                                                <td className="py-4 pl-4 text-white font-medium">{campaign.name}</td>
                                                <td className="py-4">
                                                    <Badge variant="outline" className="bg-white/5 text-neutral-300 border-white/10">
                                                        {campaign.channel}
                                                    </Badge>
                                                </td>
                                                <td className="py-4 text-right text-neutral-300">{campaign.sent.toLocaleString()}</td>
                                                <td className="py-4 text-right text-neutral-300">{campaign.delivered.toLocaleString()}</td>
                                                <td className="py-4 text-right text-neutral-300">{campaign.opened.toLocaleString()}</td>
                                                <td className="py-4 text-right text-neutral-300">{campaign.clicked.toLocaleString()}</td>
                                                <td className="py-4 text-right text-neutral-300 font-medium">{campaign.converted.toLocaleString()}</td>
                                                <td className="py-4 text-right text-white font-medium">
                                                    {((campaign.converted / campaign.sent) * 100).toFixed(2)}%
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <Badge className={cn(
                                                        "border-0",
                                                        campaign.status === 'active' ? "bg-neutral-800 text-neutral-300" :
                                                            campaign.status === 'completed' ? "bg-neutral-800 text-white" :
                                                                "bg-neutral-800 text-neutral-400"
                                                    )}>
                                                        {campaign.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </GlassCard>
                </TabsContent>

                {/* Geographic Tab */}
                <TabsContent value="geographic" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-white" />
                                    Geographic Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/5">
                                    <div className="text-center text-neutral-500">
                                        <Globe className="h-12 w-12 mx-auto mb-2 text-neutral-600" />
                                        <p>World Map Visualization</p>
                                        <p className="text-sm">(Integrate with map library)</p>
                                    </div>
                                </div>
                            </CardContent>
                        </GlassCard>

                        <GlassCard>
                            <CardHeader>
                                <CardTitle className="text-white">Top Countries by Revenue</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-5">
                                    {mockGeographicData.map((country, i) => (
                                        <div key={country.code} className="flex items-center gap-4 group">
                                            <div className="w-6 text-center text-neutral-500 font-mono text-sm">{i + 1}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-white font-medium text-sm">{country.country}</span>
                                                    <span className="text-white font-bold text-sm">
                                                        {formatValue(country.revenue, 'currency')}
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-neutral-600 to-neutral-500 group-hover:from-neutral-500 group-hover:to-neutral-400 transition-all"
                                                        style={{ width: `${(country.revenue / mockGeographicData[0].revenue) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <Badge className={cn(
                                                "w-16 justify-center border-0 bg-white/5",
                                                country.growth >= 0 ? "text-neutral-300" : "text-neutral-400"
                                            )}>
                                                {country.growth >= 0 ? '+' : ''}{country.growth}%
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </GlassCard>
                    </div>

                    <GlassCard>
                        <CardHeader>
                            <CardTitle className="text-white">Regional Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-neutral-400 text-xs uppercase tracking-wider border-b border-white/10">
                                            <th className="pb-4 font-medium pl-4">Country</th>
                                            <th className="pb-4 font-medium text-right">Active Users</th>
                                            <th className="pb-4 font-medium text-right">Messages</th>
                                            <th className="pb-4 font-medium text-right">Revenue</th>
                                            <th className="pb-4 font-medium text-right">Avg/User</th>
                                            <th className="pb-4 font-medium text-right pr-4">Growth</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {mockGeographicData.map((country) => (
                                            <tr key={country.code} className="hover:bg-white/5 transition-colors text-sm">
                                                <td className="py-4 pl-4 text-white font-medium">{country.country}</td>
                                                <td className="py-4 text-right text-neutral-300">{country.users.toLocaleString()}</td>
                                                <td className="py-4 text-right text-neutral-300">{country.messages.toLocaleString()}</td>
                                                <td className="py-4 text-right text-white font-medium">{formatValue(country.revenue, 'currency')}</td>
                                                <td className="py-4 text-right text-neutral-400">{formatValue(Math.round(country.revenue / country.users), 'currency')}</td>
                                                <td className="py-4 text-right pr-4">
                                                    <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-medium", country.growth >= 0 ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-800 text-neutral-400')}>
                                                        {country.growth >= 0 ? '+' : ''}{country.growth}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </GlassCard>
                </TabsContent>

                {/* Real-time Tab */}
                <TabsContent value="realtime" className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-4">
                        {[
                            { label: 'Messages/Minute', value: '1,247', color: 'green' },
                            { label: 'Active Sessions', value: '3,842', color: 'gray' },
                            { label: 'Active Campaigns', value: '8', color: 'gray' },
                            { label: 'Server Load', value: '42%', color: 'gray' },
                        ].map((stat, i) => (
                            <GlassCard key={i} className={`border-l-4 border-l-${stat.color}-500`}>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity className={`h-4 w-4 text-${stat.color}-400 animate-pulse`} />
                                        <span className={`text-xs text-${stat.color}-400 uppercase font-bold tracking-wider`}>Live</span>
                                    </div>
                                    <p className="text-sm text-neutral-400">{stat.label}</p>
                                    <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                                </CardContent>
                            </GlassCard>
                        ))}
                    </div>
                    {/* Add more real-time widgets here */}
                </TabsContent>
            </Tabs>
        </div>
    );
}
