'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowLeft,
    Mail,
    Phone,
    MessageSquare,
    Tag,
    TrendingUp,
    Loader2,
    X,
    Package,
    Clock,
    IndianRupee,
    Edit,
    Save,
    RefreshCw,
    ShoppingCart,
    Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
    id: string;
    name: string;
    email: string;
    phone: string;
    source: string;
    lifecycleStage: string;
    tags: string[];
    engagementScore: number;
    lastContactedAt: string | null;
    createdAt: string;
    optedInWhatsApp: boolean;
    optedInEmail: boolean;
    optedInSMS: boolean;
    customFields?: Record<string, any>;
}

interface TimelineEvent {
    id: string;
    type: 'order' | 'message' | 'tag_change' | 'lifecycle_change' | 'conversation' | 'automation';
    title: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, any>;
}

interface CustomerProfile {
    contact: Contact;
    stats: {
        totalOrders: number;
        totalSpent: number;
        averageOrderValue: number;
        firstOrderDate: string | null;
        lastOrderDate: string | null;
        totalConversations: number;
    };
    recentOrders: any[];
    recentActivity: TimelineEvent[];
}

export default function CustomerProfilePage() {
    const router = useRouter();
    const params = useParams();
    const contactId = params.id as string;

    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [editedTags, setEditedTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [availableTags, setAvailableTags] = useState<string[]>([]);

    useEffect(() => {
        if (contactId) {
            fetchProfile(contactId);
            fetchTimeline(contactId);
            fetchTags();
        }
    }, [contactId]);

    const fetchProfile = async (id: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/contacts/${id}/profile`);
            if (!response.ok) throw new Error('Failed to fetch profile');
            const data = await response.json();
            setProfile(data);
            setEditedTags(data.contact.tags || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const fetchTimeline = async (id: string) => {
        try {
            const response = await fetch(`/api/contacts/${id}/timeline?limit=50`);
            if (response.ok) {
                const data = await response.json();
                setTimeline(data);
            }
        } catch (err) {
            console.error('Error fetching timeline:', err);
        }
    };

    const fetchTags = async () => {
        try {
            const response = await fetch('/api/contacts/tags');
            if (response.ok) {
                const data = await response.json();
                setAvailableTags(data);
            }
        } catch (err) {
            console.error('Error fetching tags:', err);
        }
    };

    const handleUpdateTags = async () => {
        try {
            const response = await fetch(`/api/contacts/${contactId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: editedTags }),
            });
            if (response.ok) {
                setProfile(prev => prev ? {
                    ...prev,
                    contact: { ...prev.contact, tags: editedTags }
                } : null);
                setIsEditing(false);
            }
        } catch (err) {
            console.error('Error updating tags:', err);
        }
    };

    const addTag = (tag: string) => {
        if (tag && !editedTags.includes(tag)) {
            setEditedTags([...editedTags, tag]);
        }
        setNewTag('');
    };

    const removeTag = (tag: string) => {
        setEditedTags(editedTags.filter(t => t !== tag));
    };

    const getSourceBadge = (source: string) => {
        const colors: Record<string, string> = {
            whatsapp: 'bg-green-100 text-green-700',
            instagram: 'bg-pink-100 text-pink-700',
            email: 'bg-blue-100 text-blue-700',
            manual: 'bg-gray-100 text-gray-700',
            ecommerce: 'bg-purple-100 text-purple-700',
            import: 'bg-orange-100 text-orange-700',
        };
        return colors[source] || colors.manual;
    };

    const getStageBadge = (stage: string) => {
        const colors: Record<string, string> = {
            lead: 'bg-yellow-100 text-yellow-700',
            prospect: 'bg-orange-100 text-orange-700',
            customer: 'bg-green-100 text-green-700',
            repeat_customer: 'bg-purple-100 text-purple-700',
            churned: 'bg-red-100 text-red-700',
        };
        return colors[stage] || colors.lead;
    };

    const getTimelineIcon = (type: string) => {
        switch (type) {
            case 'order': return <ShoppingCart className="h-4 w-4" />;
            case 'message': return <MessageSquare className="h-4 w-4" />;
            case 'conversation': return <MessageSquare className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const getTimelineColor = (type: string) => {
        switch (type) {
            case 'order': return 'bg-blue-500';
            case 'message': return 'bg-green-500';
            case 'conversation': return 'bg-purple-500';
            default: return 'bg-gray-500';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (date: string) => {
        return new Date(date).toLocaleString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <p className="text-destructive mb-4">{error || 'Contact not found'}</p>
                <Button onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                </Button>
            </div>
        );
    }

    const { contact, stats, recentOrders, recentActivity } = profile;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary-foreground text-xl">
                            {contact.name?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        {contact.name || 'Unknown'}
                    </h1>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {contact.email && (
                            <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {contact.email}
                            </span>
                        )}
                        {contact.phone && (
                            <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {contact.phone}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Badge className={cn('capitalize', getSourceBadge(contact.source))}>
                        {contact.source}
                    </Badge>
                    <Badge className={cn('capitalize', getStageBadge(contact.lifecycleStage))}>
                        {(contact.lifecycleStage || 'lead').replace('_', ' ')}
                    </Badge>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Orders</p>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">
                            Last order: {formatDate(stats.lastOrderDate)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Lifetime Value</p>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</div>
                        <p className="text-xs text-muted-foreground">
                            Avg: {formatCurrency(stats.averageOrderValue)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Conversations</p>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalConversations}</div>
                        <p className="text-xs text-muted-foreground">
                            Last contact: {formatDate(contact.lastContactedAt)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Engagement</p>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{contact.engagementScore || 0}</div>
                        <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary"
                                style={{ width: `${contact.engagementScore || 0}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tags Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Tag className="h-4 w-4" /> Tags
                        </CardTitle>
                        <CardDescription>Organize this contact with tags</CardDescription>
                    </div>
                    {!isEditing ? (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit className="mr-2 h-3 w-3" /> Edit
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                                setEditedTags(contact.tags || []);
                                setIsEditing(false);
                            }}>
                                <X className="mr-2 h-3 w-3" /> Cancel
                            </Button>
                            <Button size="sm" onClick={handleUpdateTags}>
                                <Save className="mr-2 h-3 w-3" /> Save
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {(isEditing ? editedTags : contact.tags || []).map(tag => (
                            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                {tag}
                                {isEditing && (
                                    <X
                                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                                        onClick={() => removeTag(tag)}
                                    />
                                )}
                            </Badge>
                        ))}
                        {isEditing && (
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Add tag..."
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addTag(newTag);
                                        }
                                    }}
                                    className="w-32 h-7 text-sm"
                                    list="tag-suggestions"
                                />
                                <datalist id="tag-suggestions">
                                    {availableTags.filter(t => !editedTags.includes(t)).map(tag => (
                                        <option key={tag} value={tag} />
                                    ))}
                                </datalist>
                                <Button size="sm" variant="outline" onClick={() => addTag(newTag)} className="h-7">
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                        {!isEditing && (contact.tags || []).length === 0 && (
                            <span className="text-sm text-muted-foreground">No tags yet</span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Tabs Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="orders">Orders ({stats.totalOrders})</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Recent Activity */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {recentActivity.length > 0 ? (
                                    <div className="space-y-4">
                                        {recentActivity.slice(0, 5).map((event) => (
                                            <div key={event.id} className="flex gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-white",
                                                    getTimelineColor(event.type)
                                                )}>
                                                    {getTimelineIcon(event.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium">{event.title}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                                                    <p className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Contact Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Contact Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Customer Since</span>
                                    <span className="text-sm">{formatDate(contact.createdAt)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Source</span>
                                    <Badge className={cn('capitalize', getSourceBadge(contact.source))}>
                                        {contact.source}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Lifecycle Stage</span>
                                    <Badge className={cn('capitalize', getStageBadge(contact.lifecycleStage))}>
                                        {(contact.lifecycleStage || 'lead').replace('_', ' ')}
                                    </Badge>
                                </div>
                                <hr />
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">WhatsApp Opt-in</span>
                                    <Badge variant={contact.optedInWhatsApp ? "default" : "outline"}>
                                        {contact.optedInWhatsApp ? 'Yes' : 'No'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Email Opt-in</span>
                                    <Badge variant={contact.optedInEmail ? "default" : "outline"}>
                                        {contact.optedInEmail ? 'Yes' : 'No'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders" className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            {recentOrders.length > 0 ? (
                                <table className="w-full">
                                    <thead className="border-b bg-muted/50">
                                        <tr>
                                            <th className="p-4 text-left text-sm font-medium">Order #</th>
                                            <th className="p-4 text-left text-sm font-medium">Date</th>
                                            <th className="p-4 text-left text-sm font-medium">Status</th>
                                            <th className="p-4 text-left text-sm font-medium">Payment</th>
                                            <th className="p-4 text-right text-sm font-medium">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.map((order) => (
                                            <tr key={order.id} className="border-b hover:bg-muted/30">
                                                <td className="p-4 font-medium">#{order.order_number}</td>
                                                <td className="p-4 text-muted-foreground">
                                                    {formatDate(order.order_date)}
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="outline" className="capitalize">
                                                        {order.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="outline" className="capitalize">
                                                        {order.payment_status}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-right font-medium">
                                                    {formatCurrency(parseFloat(order.total || 0))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-16">
                                    <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                                    <p className="text-muted-foreground">No orders yet</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Activity Timeline</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => fetchTimeline(contactId)}>
                                <RefreshCw className="mr-2 h-3 w-3" /> Refresh
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {timeline.length > 0 ? (
                                <div className="relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                                    <div className="space-y-6">
                                        {timeline.map((event) => (
                                            <div key={event.id} className="relative pl-12">
                                                <div className={cn(
                                                    "absolute left-0 w-8 h-8 rounded-full flex items-center justify-center text-white",
                                                    getTimelineColor(event.type)
                                                )}>
                                                    {getTimelineIcon(event.type)}
                                                </div>
                                                <div className="bg-muted/50 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-medium">{event.title}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatTime(event.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{event.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <Clock className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                                    <p className="text-muted-foreground">No activity recorded yet</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
