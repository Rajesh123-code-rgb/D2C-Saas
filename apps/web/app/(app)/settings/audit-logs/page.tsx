'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    FileText,
    Download,
    Search,
    Filter,
    RefreshCw,
    User,
    Calendar,
    Activity,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditLog {
    id: string;
    userId: string;
    userEmail: string;
    action: string;
    resourceType: string;
    resourceId: string;
    resourceName: string;
    description: string;
    ipAddress: string;
    createdAt: string;
}

const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
    export: 'bg-purple-100 text-purple-700',
    login: 'bg-yellow-100 text-yellow-700',
    logout: 'bg-gray-100 text-gray-700',
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                // TODO: Replace with actual tenant ID from auth context
                const response = await fetch('/api/audit-logs?tenantId=demo');
                const result = await response.json();
                setLogs(result.data || []);
            } catch (error) {
                console.error('Error fetching audit logs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = !searchTerm ||
            log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.resourceName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAction = !actionFilter || log.action === actionFilter;
        return matchesSearch && matchesAction;
    });

    const handleExport = async () => {
        // TODO: Implement export functionality
        alert('Export functionality - will download CSV of logs');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground">Track all actions and changes in your workspace</p>
                </div>
                <Button onClick={handleExport} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Logs
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-blue-100">
                                <Activity className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{logs.length}</p>
                                <p className="text-sm text-muted-foreground">Total Actions</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-green-100">
                                <FileText className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{logs.filter(l => l.action === 'create').length}</p>
                                <p className="text-sm text-muted-foreground">Created</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-yellow-100">
                                <RefreshCw className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{logs.filter(l => l.action === 'update').length}</p>
                                <p className="text-sm text-muted-foreground">Updated</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-red-100">
                                <User className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{logs.filter(l => l.action === 'delete').length}</p>
                                <p className="text-sm text-muted-foreground">Deleted</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search logs..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                        >
                            <option value="">All Actions</option>
                            <option value="create">Create</option>
                            <option value="update">Update</option>
                            <option value="delete">Delete</option>
                            <option value="export">Export</option>
                            <option value="login">Login</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Activity Log</CardTitle>
                    <CardDescription>Recent actions in your workspace</CardDescription>
                </CardHeader>
                <CardContent>
                    {logs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Activity className="mx-auto h-12 w-12 opacity-20 mb-4" />
                            <p>No audit logs found</p>
                            <p className="text-sm">Activity will appear here once actions are performed</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredLogs.map((log) => (
                                <div key={log.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                            <User className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{log.userEmail || 'System'}</span>
                                            <span
                                                className={cn(
                                                    'px-2 py-0.5 rounded text-xs font-medium capitalize',
                                                    actionColors[log.action] || 'bg-gray-100 text-gray-700'
                                                )}
                                            >
                                                {log.action}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted">
                                                {log.resourceType}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {log.description || `${log.action} ${log.resourceType} "${log.resourceName}"`}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(log.createdAt).toLocaleString()}
                                            </span>
                                            {log.ipAddress && (
                                                <span>IP: {log.ipAddress}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
