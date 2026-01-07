'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users,
    Plus,
    Search,
    Trash2,
    RefreshCw,
    Play,
    Loader2,
} from 'lucide-react';

interface Segment {
    id: string;
    name: string;
    description: string;
    type: string;
    contactCount: number;
    isSystem: boolean;
    lastCalculatedAt: string;
    rules: { combinator: string; rules: any[] };
}

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
}

export default function SegmentsPage() {
    const router = useRouter();
    const [segments, setSegments] = useState<Segment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [refreshing, setRefreshing] = useState<string | null>(null);

    const handleUseCampaign = (segmentId: string) => {
        router.push(`/campaigns?segmentId=${segmentId}`);
    };

    const fetchSegments = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/segments');
            if (!response.ok) throw new Error('Failed to fetch segments');
            const data = await response.json();
            setSegments(data.segments || data || []);
        } catch (error) {
            console.error('Error fetching segments:', error);
            setSegments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSegments();
    }, []);

    const filteredSegments = segments.filter((segment) =>
        segment.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        segment.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const systemSegments = filteredSegments.filter((s) => s.isSystem);
    const customSegments = filteredSegments.filter((s) => !s.isSystem);

    // Calculate dynamic stats
    const totalContacts = segments.reduce((sum, s) => sum + (s.contactCount || 0), 0);
    const largestSegment = segments.reduce((max, s) =>
        (s.contactCount > (max?.contactCount || 0)) ? s : max,
        segments[0]
    );

    const handleRefreshSegment = async (segmentId: string) => {
        setRefreshing(segmentId);
        try {
            const response = await fetch(`/api/segments/${segmentId}/recalculate`, {
                method: 'POST',
            });
            if (response.ok) {
                await fetchSegments();
            }
        } catch (error) {
            console.error('Error refreshing segment:', error);
        } finally {
            setRefreshing(null);
        }
    };

    const handleDeleteSegment = async (segmentId: string) => {
        if (!confirm('Are you sure you want to delete this segment?')) return;
        try {
            const response = await fetch(`/api/segments/${segmentId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                await fetchSegments();
            }
        } catch (error) {
            console.error('Error deleting segment:', error);
        }
    };

    const handleCreateSegment = async (name: string, description: string, rules: any[]) => {
        try {
            const response = await fetch('/api/segments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    rules: {
                        id: Date.now().toString(),
                        combinator: 'and',
                        rules,
                    },
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setShowCreateModal(false);
                await fetchSegments();
            } else {
                console.error('Failed to create segment:', data);
                alert(`Failed to create segment: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error creating segment:', error);
            alert('Failed to create segment. Check console for details.');
        }
    };

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
                    <h1 className="text-3xl font-bold tracking-tight">Segments</h1>
                    <p className="text-muted-foreground">Create dynamic segments to target your campaigns</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Segment
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-violet-500/10 via-transparent to-transparent border-violet-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Segments</p>
                        <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <Users className="h-4 w-4 text-violet-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-violet-700">{segments.length}</div>
                        <p className="text-xs text-muted-foreground">{systemSegments.length} system, {customSegments.length} custom</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 via-transparent to-transparent border-blue-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Contacts</p>
                        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{totalContacts.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Across all segments</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border-emerald-200/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Largest Segment</p>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Users className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">{largestSegment?.name || 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">{largestSegment?.contactCount?.toLocaleString() || 0} contacts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="p-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search segments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* System Segments */}
            {systemSegments.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">System Segments</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {systemSegments.map((segment) => (
                            <SegmentCard
                                key={segment.id}
                                segment={segment}
                                onRefresh={handleRefreshSegment}
                                onDelete={handleDeleteSegment}
                                onUseCampaign={handleUseCampaign}
                                refreshing={refreshing === segment.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Segments */}
            {customSegments.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">Custom Segments</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {customSegments.map((segment) => (
                            <SegmentCard
                                key={segment.id}
                                segment={segment}
                                onRefresh={handleRefreshSegment}
                                onDelete={handleDeleteSegment}
                                onUseCampaign={handleUseCampaign}
                                refreshing={refreshing === segment.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {segments.length === 0 && !loading && (
                <Card className="p-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No segments yet</h3>
                    <p className="text-muted-foreground mb-4">
                        Create your first segment to organize and target your contacts.
                    </p>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Segment
                    </Button>
                </Card>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateSegmentModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateSegment}
                />
            )}
        </div>
    );
}

function SegmentCard({
    segment,
    onRefresh,
    onDelete,
    onUseCampaign,
    refreshing
}: {
    segment: any;
    onRefresh: (id: string) => void;
    onDelete: (id: string) => void;
    onUseCampaign: (id: string) => void;
    refreshing: boolean;
}) {
    return (
        <Card className="hover:shadow-md transition-shadow group">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            {segment.name}
                            {segment.isSystem && (
                                <span className="text-xs bg-muted px-2 py-0.5 rounded">System</span>
                            )}
                        </CardTitle>
                        <CardDescription className="mt-1">{segment.description}</CardDescription>
                    </div>
                    {!segment.isSystem && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            onClick={() => onDelete(segment.id)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">{(segment.contactCount || 0).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">Contacts</div>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {segment.lastCalculatedAt ? `Updated ${formatTimeAgo(segment.lastCalculatedAt)}` : 'Not calculated'}
                    </div>
                </div>

                {/* Rules Preview */}
                {segment.rules?.rules?.length > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg text-xs">
                        <div className="font-medium mb-1">Rules:</div>
                        {segment.rules.rules.slice(0, 2).map((rule: any, idx: number) => (
                            <div key={idx} className="text-muted-foreground">
                                {rule.field?.split('.').pop()} {rule.operator?.replace('_', ' ')} {rule.value}
                            </div>
                        ))}
                        {segment.rules.rules.length > 2 && (
                            <div className="text-muted-foreground">+{segment.rules.rules.length - 2} more</div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => onRefresh(segment.id)}
                        disabled={refreshing}
                    >
                        {refreshing ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-3 w-3" />
                        )}
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => onUseCampaign(segment.id)}
                    >
                        <Play className="mr-2 h-3 w-3" />
                        Use in Campaign
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function CreateSegmentModal({
    onClose,
    onCreate
}: {
    onClose: () => void;
    onCreate: (name: string, description: string, rules: any[]) => Promise<void>;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [rules, setRules] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    const addRule = () => {
        setRules([...rules, { id: Date.now().toString(), field: '', operator: 'equals', value: '' }]);
    };

    // Field definitions with types and value options
    const fields = [
        { value: 'name', label: 'Contact Name', type: 'text' },
        { value: 'email', label: 'Email', type: 'text' },
        { value: 'phone', label: 'Phone', type: 'text' },
        {
            value: 'source',
            label: 'Source',
            type: 'select',
            options: [
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'email', label: 'Email' },
                { value: 'manual', label: 'Manual' },
                { value: 'import', label: 'Import' },
                { value: 'ecommerce', label: 'E-commerce' },
            ]
        },
        {
            value: 'lifecycleStage',
            label: 'Lifecycle Stage',
            type: 'select',
            options: [
                { value: 'lead', label: 'Lead' },
                { value: 'prospect', label: 'Prospect' },
                { value: 'customer', label: 'Customer' },
                { value: 'repeat_customer', label: 'Repeat Customer' },
                { value: 'churned', label: 'Churned' },
            ]
        },
        { value: 'tags', label: 'Tags', type: 'text' },
        { value: 'engagementScore', label: 'Engagement Score', type: 'number' },
        {
            value: 'optedInWhatsApp',
            label: 'Opted In WhatsApp',
            type: 'select',
            options: [
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
            ]
        },
        {
            value: 'optedInEmail',
            label: 'Opted In Email',
            type: 'select',
            options: [
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
            ]
        },
        { value: 'ecommerceData.totalOrders', label: 'Total Orders', type: 'number' },
        { value: 'ecommerceData.totalSpent', label: 'Total Spent', type: 'number' },
        { value: 'ecommerceData.lastOrderDate', label: 'Last Order Date', type: 'date' },
        { value: 'ecommerceData.codRiskScore', label: 'COD Risk Score', type: 'number' },
    ];

    const operators = [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'greater_than', label: 'Greater Than' },
        { value: 'less_than', label: 'Less Than' },
        { value: 'within_last', label: 'Within Last (days)' },
        { value: 'not_within_last', label: 'Not Within Last (days)' },
    ];

    // Get the field configuration for a given field value
    const getFieldConfig = (fieldValue: string) => {
        return fields.find(f => f.value === fieldValue);
    };

    // Render the value input based on field type
    const renderValueInput = (rule: any, index: number) => {
        const fieldConfig = getFieldConfig(rule.field);

        if (!fieldConfig) {
            return (
                <Input
                    className="w-40"
                    placeholder="Select a field first"
                    disabled
                />
            );
        }

        if (fieldConfig.type === 'select' && fieldConfig.options) {
            return (
                <select
                    className="w-40 h-10 rounded-md border px-3 text-sm bg-background"
                    value={rule.value}
                    onChange={(e) => {
                        const newRules = [...rules];
                        newRules[index].value = e.target.value;
                        setRules(newRules);
                    }}
                >
                    <option value="">Select value...</option>
                    {fieldConfig.options.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            );
        }

        return (
            <Input
                className="w-40"
                placeholder={fieldConfig.type === 'number' ? '0' : 'Value'}
                type={fieldConfig.type === 'number' ? 'number' : 'text'}
                value={rule.value}
                onChange={(e) => {
                    const newRules = [...rules];
                    newRules[index].value = e.target.value;
                    setRules(newRules);
                }}
            />
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Create Segment</CardTitle>
                            <CardDescription>Define rules to dynamically group contacts</CardDescription>
                        </div>
                        <Button size="icon" variant="ghost" onClick={onClose}>×</Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Segment Name</label>
                            <Input
                                placeholder="e.g., High Value Customers"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                placeholder="Describe this segment..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Rules */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Rules</label>
                            <Button size="sm" variant="outline" onClick={addRule}>
                                <Plus className="mr-2 h-3 w-3" />
                                Add Rule
                            </Button>
                        </div>

                        {rules.length === 0 ? (
                            <div className="text-center p-8 border-2 border-dashed rounded-lg">
                                <Users className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    No rules defined. All contacts will match.
                                </p>
                                <Button size="sm" variant="outline" className="mt-4" onClick={addRule}>
                                    Add First Rule
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rules.map((rule, index) => (
                                    <div key={rule.id} className="flex items-center gap-2">
                                        {index > 0 && (
                                            <span className="text-xs font-medium text-muted-foreground w-12">AND</span>
                                        )}
                                        <select
                                            className="flex-1 h-10 rounded-md border px-3 text-sm bg-background"
                                            value={rule.field}
                                            onChange={(e) => {
                                                const newRules = [...rules];
                                                newRules[index].field = e.target.value;
                                                newRules[index].value = ''; // Clear value when field changes
                                                setRules(newRules);
                                            }}
                                        >
                                            <option value="">Select field...</option>
                                            {fields.map((f) => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>
                                        <select
                                            className="w-40 h-10 rounded-md border px-3 text-sm"
                                            value={rule.operator}
                                            onChange={(e) => {
                                                const newRules = [...rules];
                                                newRules[index].operator = e.target.value;
                                                setRules(newRules);
                                            }}
                                        >
                                            {operators.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                        {renderValueInput(rule, index)}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setRules(rules.filter((r) => r.id !== rule.id))}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button
                            disabled={!name || saving}
                            onClick={async () => {
                                setSaving(true);
                                await onCreate(name, description, rules);
                                setSaving(false);
                            }}
                        >
                            {saving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Users className="mr-2 h-4 w-4" />
                            )}
                            Create Segment
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
