'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { governanceApi } from '@/lib/admin/api';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';

export function TemplateMonitoring() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [filters, setFilters] = useState({
        tenantId: '',
        status: 'all',
        category: 'all',
    });
    const [debouncedTenantId, setDebouncedTenantId] = useState('');

    // Debounce tenant ID search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTenantId(filters.tenantId);
        }, 500);
        return () => clearTimeout(timer);
    }, [filters.tenantId]);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                limit,
                offset: (page - 1) * limit,
            };

            if (debouncedTenantId) params.tenantId = debouncedTenantId;
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.category !== 'all') params.category = filters.category;

            const res = await governanceApi.getMonitoringTemplates(params);
            setTemplates(res.templates);
            setTotal(res.total);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedTenantId, filters.status, filters.category]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    // Status Badge Color Helper
    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            APPROVED: 'bg-neutral-800 text-neutral-300 border-neutral-600/20',
            REJECTED: 'bg-neutral-800 text-neutral-400 border-neutral-600/20',
            PENDING: 'bg-neutral-800 text-neutral-400 border-neutral-700',
            PAUSED: 'bg-neutral-800 text-white border-orange-500/20',
            DISABLED: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
        };
        return colors[status] || 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Template Monitoring</h2>
                    <p className="text-neutral-400 mt-1">Monitor and audit WhatsApp templates across all tenants</p>
                </div>
                <Button variant="outline" onClick={fetchTemplates} disabled={loading} className="border-neutral-600 text-neutral-300 hover:bg-neutral-700">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-neutral-800 p-4 rounded-lg border border-neutral-700">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                        <Input
                            placeholder="Filter by Tenant ID..."
                            value={filters.tenantId}
                            onChange={(e) => setFilters({ ...filters, tenantId: e.target.value })}
                            className="pl-9 bg-neutral-900 border-neutral-700 text-white"
                        />
                    </div>
                </div>
                <div className="w-[180px]">
                    <Select
                        value={filters.status}
                        onValueChange={(val) => setFilters({ ...filters, status: val })}
                    >
                        <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-neutral-700">
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                            <SelectItem value="PAUSED">Paused</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-[180px]">
                    <Select
                        value={filters.category}
                        onValueChange={(val) => setFilters({ ...filters, category: val })}
                    >
                        <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-neutral-700">
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="MARKETING">Marketing</SelectItem>
                            <SelectItem value="UTILITY">Utility</SelectItem>
                            <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border border-neutral-700 bg-neutral-800 overflow-hidden">
                <Table>
                    <TableHeader className="bg-neutral-900">
                        <TableRow className="border-neutral-700 hover:bg-neutral-900">
                            <TableHead className="text-neutral-300">Template Name</TableHead>
                            <TableHead className="text-neutral-300">Tenant</TableHead>
                            <TableHead className="text-neutral-300">Category</TableHead>
                            <TableHead className="text-neutral-300">Language</TableHead>
                            <TableHead className="text-neutral-300">Status</TableHead>
                            <TableHead className="text-neutral-300">Quality</TableHead>
                            <TableHead className="text-neutral-300">Updated</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && templates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-neutral-400">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                    Loading templates...
                                </TableCell>
                            </TableRow>
                        ) : templates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-neutral-400">
                                    No templates found
                                </TableCell>
                            </TableRow>
                        ) : (
                            templates.map((template) => (
                                <TableRow key={template.id} className="border-neutral-700 hover:bg-neutral-700/50">
                                    <TableCell className="font-medium text-white">
                                        <div className="flex flex-col">
                                            <span>{template.name}</span>
                                            <span className="text-xs text-neutral-500 font-mono">{template.metaTemplateId}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-neutral-300">
                                        <div className="flex flex-col">
                                            <span>{template.tenant?.name || 'Unknown Tenant'}</span>
                                            <span className="text-xs text-neutral-500 font-mono truncate max-w-[100px]">{template.tenantId}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-neutral-300 border-neutral-600">
                                            {template.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-neutral-300">{template.language}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={getStatusBadge(template.status)}>
                                            {template.status}
                                        </Badge>
                                        {template.status === 'REJECTED' && template.rejectionReason && (
                                            <div className="text-xs text-neutral-400 mt-1 max-w-[150px] truncate" title={template.rejectionReason}>
                                                {template.rejectionReason}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            template.qualityScore === 'GREEN' ? 'text-neutral-300 border-neutral-600/20' :
                                                template.qualityScore === 'YELLOW' ? 'text-neutral-400 border-neutral-700' :
                                                    'text-neutral-400 border-neutral-600/20'
                                        }>
                                            {template.qualityScore || 'UNKNOWN'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-neutral-400 text-sm">
                                        {template.syncedAt ? format(new Date(template.syncedAt), 'MMM d, HH:mm') : '-'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-400">
                    Showing {Math.min(templates.length, limit)} of {total} templates
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1 || loading}
                        onClick={() => setPage(page - 1)}
                        className="border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page * limit >= total || loading}
                        onClick={() => setPage(page + 1)}
                        className="border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
