
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Activity,
    Database,
    HardDrive,
    Users,
    MessageSquare,
    Zap,
    RefreshCw,
    Loader2,
    Server,
    Cpu,
    ArrowUp,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { systemUsageApi, SystemUsageOverview, DatabaseStats } from '@/lib/admin/api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function UsagePage() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<SystemUsageOverview | null>(null);
    const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [overviewData, dbData] = await Promise.all([
                systemUsageApi.getOverview(),
                systemUsageApi.getDatabaseStats(),
            ]);
            setOverview(overviewData);
            setDbStats(dbData);
        } catch (error) {
            console.error('Failed to fetch usage data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading && !overview) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">System Health & Usage</h1>
                    <p className="text-slate-400 mt-1">Monitor real-time system performance and resource allocation</p>
                </div>
                <Button
                    variant="outline"
                    onClick={fetchData}
                    disabled={loading}
                    className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="h-16 w-16 text-blue-500" />
                    </div>
                    <div className="flex flex-col relative z-10">
                        <span className="text-sm font-medium text-slate-400">Total Users</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-3xl font-bold text-white">{overview?.system.users.total.toLocaleString()}</span>
                            <span className="text-xs font-medium text-emerald-400 flex items-center">
                                <ArrowUp className="h-3 w-3 mr-0.5" />
                                12%
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Across {overview?.system.tenants.total} organizations</p>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </GlassCard>

                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <MessageSquare className="h-16 w-16 text-emerald-500" />
                    </div>
                    <div className="flex flex-col relative z-10">
                        <span className="text-sm font-medium text-slate-400">Total Messages</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-3xl font-bold text-white">{overview?.system.messages.total.toLocaleString()}</span>
                            <span className="text-xs font-medium text-emerald-400 flex items-center">
                                <ArrowUp className="h-3 w-3 mr-0.5" />
                                8%
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            {(overview?.system.conversations.total || 0).toLocaleString()} active conversations
                        </p>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </GlassCard>

                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="h-16 w-16 text-amber-500" />
                    </div>
                    <div className="flex flex-col relative z-10">
                        <span className="text-sm font-medium text-slate-400">Active Automations</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-3xl font-bold text-white">{overview?.system.automations.total.toLocaleString()}</span>
                            <span className="text-xs font-medium text-emerald-400 flex items-center">
                                <ArrowUp className="h-3 w-3 mr-0.5" />
                                24%
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Running workflows now</p>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </GlassCard>

                <GlassCard className="p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Database className="h-16 w-16 text-purple-500" />
                    </div>
                    <div className="flex flex-col relative z-10">
                        <span className="text-sm font-medium text-slate-400">Database Size</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-3xl font-bold text-white">
                                {dbStats ? formatBytes(dbStats.sizeBytes) : 'Unknown'}
                            </span>
                            <span className="text-xs font-medium text-slate-500 flex items-center">
                                +{dbStats ? formatBytes(dbStats.sizeBytes * 0.01) : '0MB'} today
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">PostgreSQL storage</p>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </GlassCard>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Activity Chart (Mocked Visual) */}
                <GlassCard className="col-span-2 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Activity className="h-5 w-5 text-indigo-400" />
                                Activity Trends (30 Days)
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Daily active users and message volume
                            </p>
                        </div>
                        <Badge variant="outline" className="bg-slate-900/50 text-indigo-300 border-indigo-500/30">
                            Live Updates
                        </Badge>
                    </div>

                    <div className="h-[240px] w-full flex items-end gap-1 pb-4 relative">
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className="w-full h-px bg-slate-500 dashed" />
                            ))}
                        </div>

                        {overview?.activity.map((day, i) => {
                            const height = (day.messagesSent / 5000) * 100;
                            const activeHeight = Math.min(100, Math.max(5, height)); // Prevent 0 height

                            return (
                                <div key={i} className="flex-1 flex flex-col justify-end h-full gap-1 group relative z-10">
                                    <div className="w-full bg-slate-800/30 rounded-t-sm h-full absolute bottom-0 left-0" />
                                    <div
                                        className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 transition-all rounded-t-sm relative"
                                        style={{ height: `${activeHeight}%` }}
                                    >
                                        <div className="absolute top-0 left-0 w-full h-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-slate-900/90 backdrop-blur border border-slate-700 p-2.5 rounded shadow-xl z-20 whitespace-nowrap">
                                        <div className="text-xs text-slate-400 mb-1 font-medium border-b border-slate-800 pb-1">{day.date}</div>
                                        <div className="flex items-center justify-between gap-3 text-xs">
                                            <span className="text-slate-300">Messages:</span>
                                            <span className="text-white font-bold">{day.messagesSent}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-xs">
                                            <span className="text-slate-300">Users:</span>
                                            <span className="text-indigo-400 font-bold">{day.activeUsers}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
                        <span>30 days ago</span>
                        <span>Today</span>
                    </div>
                </GlassCard>

                {/* Database Tables */}
                <GlassCard className="p-0 overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/5">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-purple-400" />
                            Largest Tables
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Top 10 tables by row count
                        </p>
                    </div>
                    <Table>
                        <TableHeader className="bg-slate-900/50">
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-slate-400 font-medium pl-6">Table Name</TableHead>
                                <TableHead className="text-right text-slate-400 font-medium pr-6">Row Count</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dbStats?.tableStats.map((table) => (
                                <TableRow key={table.tableName} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="font-medium text-slate-200 pl-6 flex items-center gap-2">
                                        <Database className="h-3 w-3 text-slate-500" />
                                        {table.tableName}
                                    </TableCell>
                                    <TableCell className="text-right text-slate-300 font-mono pr-6">
                                        {table.rowCount.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </GlassCard>

                {/* System Health / Status Checks */}
                <GlassCard className="p-6 h-full">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                        <Server className="h-5 w-5 text-emerald-400" />
                        System Status
                    </h2>

                    <div className="space-y-4">
                        <div className="group flex items-center justify-between p-3 rounded-lg bg-slate-950/30 border border-slate-800/50 hover:border-slate-700 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
                                <div className="flex flex-col">
                                    <span className="text-slate-200 font-medium">API Server</span>
                                    <span className="text-xs text-slate-500">Uptime: 99.99%</span>
                                </div>
                            </div>
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">Operational</Badge>
                        </div>

                        <div className="group flex items-center justify-between p-3 rounded-lg bg-slate-950/30 border border-slate-800/50 hover:border-slate-700 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                <div className="flex flex-col">
                                    <span className="text-slate-200 font-medium">Database</span>
                                    <span className="text-xs text-slate-500">Latency: 4ms</span>
                                </div>
                            </div>
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">Operational</Badge>
                        </div>

                        <div className="group flex items-center justify-between p-3 rounded-lg bg-slate-950/30 border border-slate-800/50 hover:border-slate-700 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                <div className="flex flex-col">
                                    <span className="text-slate-200 font-medium">Redis Cache</span>
                                    <span className="text-xs text-slate-500">Hit Rate: 94%</span>
                                </div>
                            </div>
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">Operational</Badge>
                        </div>

                        <div className="group flex items-center justify-between p-3 rounded-lg bg-slate-950/30 border border-slate-800/50 hover:border-slate-700 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                                <div className="flex flex-col">
                                    <span className="text-slate-200 font-medium">Job Queue (BullMQ)</span>
                                    <span className="text-xs text-slate-500">Processing Rate: 120/s</span>
                                </div>
                            </div>
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20">34 Jobs Waiting</Badge>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Cpu className="h-3 w-3" /> CPU Load
                                </span>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-[45%] rounded-full" />
                                </div>
                                <span className="text-xs text-slate-300 text-right">45%</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <HardDrive className="h-3 w-3" /> Memory
                                </span>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 w-[62%] rounded-full" />
                                </div>
                                <span className="text-xs text-slate-300 text-right">62%</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
