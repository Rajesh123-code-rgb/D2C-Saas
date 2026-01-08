'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Activity,
    Search,
    Download,
    User,
    Settings,
    CreditCard,
    Flag,
    Building2,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Eye,
    ChevronLeft,
    ChevronRight,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { CardHeader, CardContent } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { auditLogsApi, AuditLog } from '@/lib/admin/api';

// Fallback mock data
const mockLogs: AuditLog[] = [
    {
        id: '1',
        adminId: '1',
        adminEmail: 'admin@convoo.cloud',
        adminName: 'Super Admin',
        action: 'FEATURE_TOGGLE',
        resourceType: 'feature_flag',
        resourceId: 'ff1',
        resourceName: 'ai.chatbot',
        description: 'Enabled feature flag: ai.chatbot',
        ipAddress: '192.168.1.1',
        success: true,
        createdAt: '2024-12-27T10:30:00',
    },
    {
        id: '2',
        adminId: '1',
        adminEmail: 'admin@convoo.cloud',
        adminName: 'Super Admin',
        action: 'CREDIT_ISSUE',
        resourceType: 'message_wallet',
        resourceId: 'w1',
        resourceName: 'ABC Corp Wallet',
        targetTenantId: 't1',
        targetTenantName: 'ABC Corp',
        newValues: { credits: 5000, reason: 'Promotional credits' },
        description: 'Added 5000 credits to tenant ABC Corp',
        ipAddress: '192.168.1.1',
        success: true,
        createdAt: '2024-12-27T09:45:00',
    },
    {
        id: '3',
        adminId: '2',
        adminEmail: 'support@convoo.cloud',
        adminName: 'Support Agent',
        action: 'LOGIN',
        resourceType: 'session',
        resourceId: 's1',
        resourceName: 'Admin Login',
        description: 'Admin login successful',
        ipAddress: '10.0.0.5',
        success: true,
        createdAt: '2024-12-27T09:00:00',
    },
    {
        id: '4',
        adminId: '1',
        adminEmail: 'admin@convoo.cloud',
        adminName: 'Super Admin',
        action: 'SUSPEND',
        resourceType: 'tenant',
        resourceId: 't3',
        resourceName: 'Demo Company',
        targetTenantId: 't3',
        targetTenantName: 'Demo Company',
        previousValues: { status: 'active' },
        newValues: { status: 'suspended' },
        description: 'Suspended tenant: Demo Company',
        ipAddress: '192.168.1.1',
        success: true,
        createdAt: '2024-12-26T15:30:00',
    },
    {
        id: '5',
        adminId: '1',
        adminEmail: 'admin@convoo.cloud',
        adminName: 'Super Admin',
        action: 'CREATE',
        resourceType: 'admin_user',
        resourceId: 'u2',
        resourceName: 'Support Agent',
        newValues: { email: 'support@convoo.cloud', role: 'SUPPORT' },
        description: 'Created admin user: Support Agent',
        ipAddress: '192.168.1.1',
        success: true,
        createdAt: '2024-12-25T14:00:00',
    },
];

const actionColors: Record<string, string> = {
    LOGIN: 'bg-neutral-800 text-white',
    LOGOUT: 'bg-neutral-500/10 text-neutral-400',
    CREATE: 'bg-neutral-800 text-neutral-300',
    UPDATE: 'bg-neutral-800 text-neutral-400',
    DELETE: 'bg-neutral-800 text-neutral-400',
    FEATURE_TOGGLE: 'bg-neutral-800 text-white',
    CREDIT_ISSUE: 'bg-neutral-800 text-neutral-300',
    REFUND: 'bg-neutral-800 text-white',
    SUSPEND: 'bg-neutral-800 text-white',
    PRICING_CHANGE: 'bg-neutral-800 text-white',
};

const actionIcons: Record<string, React.ReactNode> = {
    LOGIN: <User className="h-3 w-3" />,
    CREATE: <CheckCircle className="h-3 w-3" />,
    UPDATE: <Settings className="h-3 w-3" />,
    DELETE: <XCircle className="h-3 w-3" />,
    FEATURE_TOGGLE: <Flag className="h-3 w-3" />,
    CREDIT_ISSUE: <CreditCard className="h-3 w-3" />,
    REFUND: <CreditCard className="h-3 w-3" />,
    SUSPEND: <AlertTriangle className="h-3 w-3" />,
    PRICING_CHANGE: <Settings className="h-3 w-3" />,
};

export default function AuditLogsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tenantId = searchParams.get('tenant');

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [resourceFilter, setResourceFilter] = useState('all');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [tenantName, setTenantName] = useState<string | null>(null);
    const perPage = 10;

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page, limit: perPage };
            if (actionFilter !== 'all') params.action = actionFilter;
            if (resourceFilter !== 'all') params.resourceType = resourceFilter;
            if (tenantId) params.tenantId = tenantId;

            const response = await auditLogsApi.getAll(params);
            setLogs(response.data);
            setTotalPages(response.totalPages);
            setTotalLogs(response.total);

            // Get tenant name from first log if filtering by tenant
            if (tenantId && response.data.length > 0 && response.data[0].targetTenantName) {
                setTenantName(response.data[0].targetTenantName);
            }
        } catch (err: any) {
            console.warn('Could not fetch audit logs, using mock data:', err.message);
            const filtered = mockLogs.filter((log) => {
                const matchesSearch =
                    log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    log.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    log.resourceName.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesAction = actionFilter === 'all' || log.action === actionFilter;
                const matchesResource = resourceFilter === 'all' || log.resourceType === resourceFilter;
                const matchesTenant = !tenantId || log.targetTenantId === tenantId;
                return matchesSearch && matchesAction && matchesResource && matchesTenant;
            });
            setLogs(filtered);
            setTotalPages(Math.ceil(filtered.length / perPage));
            setTotalLogs(filtered.length);
        } finally {
            setLoading(false);
        }
    }, [page, actionFilter, resourceFilter, searchQuery, tenantId]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const filteredLogs = logs.filter((log) => {
        const matchesSearch =
            log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.resourceName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const handleExport = async () => {
        try {
            const result = await auditLogsApi.export({});
            if (result.url) {
                window.open(result.url, '_blank');
            }
        } catch (err: any) {
            console.warn('Export not available:', err.message);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Audit Logs</h1>
                    <p className="text-neutral-400 mt-2 text-lg">
                        {tenantId ? (
                            <span className="flex items-center gap-2">
                                Activity for: <span className="text-white font-medium">{tenantName || 'Organization'}</span>
                                <button
                                    onClick={() => router.push('/admin/audit-logs')}
                                    className="text-xs bg-neutral-800 px-2 py-1 rounded hover:bg-neutral-700 transition-colors"
                                >
                                    Clear Filter
                                </button>
                            </span>
                        ) : (
                            'Track sensitive admin actions and system changes'
                        )}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white backdrop-blur-md"
                        onClick={fetchLogs}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                    </Button>
                    <Button
                        className="bg-neutral-700 hover:bg-neutral-600 text-white shadow-lg shadow-black/30"
                        onClick={handleExport}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export Logs
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <GlassCard>
                <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="relative flex-1 min-w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                            <Input
                                placeholder="Search by description, admin, or resource..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-white"
                            />
                        </div>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                                <Activity className="h-4 w-4 mr-2 text-neutral-400" />
                                <SelectValue placeholder="Action" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white/10 text-white">
                                <SelectItem value="all">All Actions</SelectItem>
                                <SelectItem value="LOGIN">Login</SelectItem>
                                <SelectItem value="CREATE">Create</SelectItem>
                                <SelectItem value="UPDATE">Update</SelectItem>
                                <SelectItem value="DELETE">Delete</SelectItem>
                                <SelectItem value="SUSPEND">Suspend</SelectItem>
                                <SelectItem value="CREDIT_ISSUE">Credits</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={resourceFilter} onValueChange={setResourceFilter}>
                            <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                                <Building2 className="h-4 w-4 mr-2 text-neutral-400" />
                                <SelectValue placeholder="Resource" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white/10 text-white">
                                <SelectItem value="all">All Resources</SelectItem>
                                <SelectItem value="tenant">Tenant</SelectItem>
                                <SelectItem value="admin_user">Admin User</SelectItem>
                                <SelectItem value="message_wallet">Wallet</SelectItem>
                                <SelectItem value="feature_flag">Feature Flag</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs text-neutral-400 uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 font-medium">Timestamp</th>
                                    <th className="px-6 py-4 font-medium">Admin</th>
                                    <th className="px-6 py-4 font-medium">Action</th>
                                    <th className="px-6 py-4 font-medium">Resource</th>
                                    <th className="px-6 py-4 font-medium w-1/3">Description</th>
                                    <th className="px-6 py-4 font-medium text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-white" />
                                            Loading audit logs...
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                                            No logs found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-white/5 transition-colors text-sm">
                                            <td className="px-6 py-4 text-neutral-400 whitespace-nowrap">
                                                {formatDate(log.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 text-white font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-neutral-700 flex items-center justify-center text-xs">
                                                        {log.adminName?.charAt(0) || '?'}
                                                    </div>
                                                    {log.adminName || 'Unknown Admin'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge className={cn('capitalize border-0 font-medium', actionColors[log.action] || 'bg-neutral-500/10 text-neutral-400')}>
                                                    <span className="mr-1.5">{actionIcons[log.action] || <Activity className="h-3 w-3" />}</span>
                                                    {log.action.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-300">
                                                {log.resourceType.replace('_', ' ')}
                                            </td>
                                            <td className="px-6 py-4 text-neutral-400">
                                                {log.description}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedLog(log)}
                                                    className="w-8 h-8 p-0 text-neutral-400 hover:text-white hover:bg-white/10"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </GlassCard>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-400">
                    Showing {Math.min(filteredLogs.length, perPage)} of {totalLogs} results
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || loading}
                        className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>

            {/* Log Details Dialog */}
            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="bg-black border-white/10 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Audit Log Details</DialogTitle>
                        <DialogDescription className="text-neutral-400">
                            Complete record of the event and data changes
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-neutral-400 text-xs uppercase tracking-wider font-semibold mb-1">Timestamp</p>
                                    <p className="font-mono text-white bg-white/5 p-2 rounded">{formatDate(selectedLog.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-neutral-400 text-xs uppercase tracking-wider font-semibold mb-1">IP Address</p>
                                    <p className="font-mono text-white bg-white/5 p-2 rounded">{selectedLog.ipAddress || 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-neutral-400 text-xs uppercase tracking-wider font-semibold mb-1">Performed By</p>
                                    <p className="font-medium text-white">{selectedLog.adminName} ({selectedLog.adminEmail})</p>
                                </div>
                                <div>
                                    <p className="text-neutral-400 text-xs uppercase tracking-wider font-semibold mb-1">Resource</p>
                                    <p className="font-medium text-white">{selectedLog.resourceName} ({selectedLog.resourceType})</p>
                                </div>
                            </div>

                            {(selectedLog.previousValues || selectedLog.newValues) && (
                                <div className="space-y-3">
                                    <p className="text-neutral-400 text-xs uppercase tracking-wider font-semibold">Data Changes</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-neutral-400 text-xs font-mono">Previous Values</p>
                                            <pre className="text-xs bg-red-500/5 text-red-200 p-3 rounded-lg overflow-auto border border-neutral-600/10 min-h-[100px]">
                                                {selectedLog.previousValues ? JSON.stringify(selectedLog.previousValues, null, 2) : 'No previous data'}
                                            </pre>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-neutral-300 text-xs font-mono">New Values</p>
                                            <pre className="text-xs bg-green-500/5 text-green-200 p-3 rounded-lg overflow-auto border border-neutral-600/10 min-h-[100px]">
                                                {selectedLog.newValues ? JSON.stringify(selectedLog.newValues, null, 2) : 'No new data'}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-neutral-400 text-xs uppercase tracking-wider font-semibold mb-2">Metadata</p>
                                <div className="bg-white/5 rounded-lg p-3 text-sm text-neutral-300">
                                    <div className="flex justify-between py-1 border-b border-white/5 last:border-0">
                                        <span>Log ID</span>
                                        <span className="font-mono text-xs">{selectedLog.id}</span>
                                    </div>
                                    <div className="flex justify-between py-1 pt-2">
                                        <span>Status</span>
                                        <Badge variant="outline" className={cn("border-0 text-xs", selectedLog.success ? "bg-neutral-800 text-neutral-300" : "bg-neutral-800 text-neutral-400")}>
                                            {selectedLog.success ? "Success" : "Failed"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
