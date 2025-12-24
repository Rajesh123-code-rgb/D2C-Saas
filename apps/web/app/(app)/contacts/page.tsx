'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    Search,
    Plus,
    Download,
    Upload,
    MoreVertical,
    Mail,
    Phone,
    MessageSquare,
    Tag,
    Calendar,
    TrendingUp,
    Loader2,
    X,
    Trash2,
    Eye,
    RefreshCw,
    CheckCircle,
    User,
    Edit,
    Filter,
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
}

export default function ContactsPage() {
    const router = useRouter();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [filterStage, setFilterStage] = useState<string>('all');
    const [filterSource, setFilterSource] = useState<string>('all');

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Form state for add/edit contact
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        source: 'manual',
        lifecycle: 'lead',
        tags: '',
    });


    // Import state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importedContacts, setImportedContacts] = useState<any[]>([]);

    // Fetch contacts from API
    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/contacts');
            if (!response.ok) {
                throw new Error('Failed to fetch contacts');
            }
            const data = await response.json();
            setContacts(data.contacts || data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setContacts([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredContacts = contacts.filter((contact) => {
        const matchesSearch =
            contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.phone?.includes(searchQuery);
        const matchesStage = filterStage === 'all' || contact.lifecycleStage === filterStage;
        const matchesSource = filterSource === 'all' || contact.source === filterSource;
        return matchesSearch && matchesStage && matchesSource;
    });

    const toggleContactSelection = (id: string) => {
        setSelectedContacts((prev) =>
            prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedContacts.length === filteredContacts.length) {
            setSelectedContacts([]);
        } else {
            setSelectedContacts(filteredContacts.map((c) => c.id));
        }
    };

    // Export contacts as CSV
    const handleExport = () => {
        const contactsToExport = selectedContacts.length > 0
            ? contacts.filter(c => selectedContacts.includes(c.id))
            : filteredContacts;

        if (contactsToExport.length === 0) {
            alert('No contacts to export');
            return;
        }

        const headers = ['Name', 'Email', 'Phone', 'Source', 'Lifecycle', 'Tags', 'Engagement Score', 'Last Contacted', 'Created At'];
        const csvRows = [
            headers.join(','),
            ...contactsToExport.map(contact => [
                `"${contact.name || ''}"`,
                `"${contact.email || ''}"`,
                `"${contact.phone || ''}"`,
                `"${contact.source || ''}"`,
                `"${contact.lifecycleStage || ''}"`,
                `"${(contact.tags || []).join(';')}"`,
                contact.engagementScore || 0,
                contact.lastContactedAt || '',
                contact.createdAt || '',
            ].join(','))
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `contacts_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        setSuccessMessage(`Exported ${contactsToExport.length} contacts`);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    // Import CSV file
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

            const contacts = lines.slice(1).filter(line => line.trim()).map(line => {
                const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());

                return {
                    name: cleanValues[headers.indexOf('name')] || '',
                    email: cleanValues[headers.indexOf('email')] || '',
                    phone: cleanValues[headers.indexOf('phone')] || '',
                    source: 'import',
                    lifecycle: 'lead',
                    tags: [],
                };
            }).filter(c => c.name || c.email || c.phone);

            setImportedContacts(contacts);
            setShowImportModal(true);
        };
        reader.readAsText(file);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Confirm import
    const handleConfirmImport = async () => {
        if (importedContacts.length === 0) return;

        setSaving(true);
        try {
            // Add contacts one by one or batch
            for (const contact of importedContacts) {
                await fetch('/api/contacts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(contact),
                });
            }

            setSuccessMessage(`Imported ${importedContacts.length} contacts`);
            setShowImportModal(false);
            setImportedContacts([]);
            fetchContacts();
        } catch (err) {
            setError('Failed to import contacts');
        } finally {
            setSaving(false);
        }
    };

    // Delete contact
    const handleDeleteContact = async (id: string) => {
        if (!confirm('Are you sure you want to delete this contact?')) return;

        try {
            const response = await fetch(`/api/contacts/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (response.ok) {
                setContacts(prev => prev.filter(c => c.id !== id));
                setSuccessMessage('Contact deleted');
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (err) {
            setError('Failed to delete contact');
        }
        setShowActionMenu(null);
    };

    // Delete selected contacts
    const handleDeleteSelected = async () => {
        if (!confirm(`Delete ${selectedContacts.length} contacts?`)) return;

        try {
            for (const id of selectedContacts) {
                await fetch(`/api/contacts/${id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                });
            }

            setContacts(prev => prev.filter(c => !selectedContacts.includes(c.id)));
            setSelectedContacts([]);
            setSuccessMessage(`Deleted ${selectedContacts.length} contacts`);
        } catch (err) {
            setError('Failed to delete contacts');
        }
    };

    // Message contact via WhatsApp
    const handleMessageContact = (contact: Contact) => {
        const phone = contact.phone;
        if (!phone) {
            alert('No phone number available');
            return;
        }

        let cleanPhone = phone.replace(/[^0-9+]/g, '');
        if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('91')) {
            if (cleanPhone.startsWith('0')) {
                cleanPhone = cleanPhone.substring(1);
            }
            cleanPhone = '91' + cleanPhone;
        } else if (cleanPhone.startsWith('+')) {
            cleanPhone = cleanPhone.substring(1);
        }

        window.open(`https://wa.me/${cleanPhone}`, '_blank');
        setShowActionMenu(null);
    };

    // View contact
    const handleViewContact = (contact: Contact) => {
        setSelectedContact(contact);
        setShowViewModal(true);
        setShowActionMenu(null);
    };

    // Edit contact
    const handleEditContact = (contact: Contact) => {
        setSelectedContact(contact);
        setFormData({
            name: contact.name || '',
            email: contact.email || '',
            phone: contact.phone || '',
            source: contact.source || 'manual',
            lifecycle: contact.lifecycleStage || 'lead',
            tags: (contact.tags || []).join(', '),
        });
        setIsEditing(true);
        setShowAddModal(true);
        setShowActionMenu(null);
    };

    // Save edited contact
    const handleSaveContact = async () => {
        if (!formData.name && !formData.email && !formData.phone) {
            alert('Please enter at least a name, email, or phone number');
            return;
        }

        setSaving(true);
        try {
            const url = isEditing && selectedContact
                ? `/api/contacts/${selectedContact.id}`
                : '/api/contacts';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    source: formData.source,
                    lifecycleStage: formData.lifecycle,
                    tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage(isEditing ? 'Contact updated successfully' : 'Contact added successfully');
                setShowAddModal(false);
                setIsEditing(false);
                setSelectedContact(null);
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    source: 'manual',
                    lifecycle: 'lead',
                    tags: '',
                });
                fetchContacts();
            } else {
                throw new Error(data.error || data.message || 'Failed to save contact');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save contact');
        } finally {
            setSaving(false);
        }
    };

    const getSourceBadge = (source: string) => {
        const colors = {
            whatsapp: 'bg-green-100 text-green-700',
            instagram: 'bg-pink-100 text-pink-700',
            email: 'bg-blue-100 text-blue-700',
            manual: 'bg-gray-100 text-gray-700',
            ecommerce: 'bg-purple-100 text-purple-700',
            import: 'bg-orange-100 text-orange-700',
        };
        return colors[source as keyof typeof colors] || colors.manual;
    };

    const getStageBadge = (stage: string) => {
        const colors = {
            lead: 'bg-yellow-100 text-yellow-700',
            prospect: 'bg-orange-100 text-orange-700',
            customer: 'bg-green-100 text-green-700',
            repeat_customer: 'bg-purple-100 text-purple-700',
        };
        return colors[stage as keyof typeof colors] || colors.lead;
    };

    const getEngagementColor = (score: number) => {
        if (score >= 75) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-600';
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
            {/* Hidden file input for CSV import */}
            <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
                    <p className="text-muted-foreground">
                        Manage your customer database across all channels
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleImportClick}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export {selectedContacts.length > 0 && `(${selectedContacts.length})`}
                    </Button>
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Contact
                    </Button>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="text-green-700 text-sm">{successMessage}</p>
                    </CardContent>
                </Card>
            )}

            {/* Error Message */}
            {error && (
                <Card className="bg-destructive/10 border-destructive">
                    <CardContent className="p-4 flex items-center justify-between">
                        <p className="text-destructive text-sm">{error}</p>
                        <Button size="sm" variant="ghost" onClick={() => setError(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Contacts</p>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{contacts.length}</div>
                        <p className="text-xs text-muted-foreground">Across all channels</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Customers</p>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {contacts.filter((c) => c.lifecycleStage === 'customer').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Active customers</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Leads</p>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {contacts.filter((c) => c.lifecycleStage === 'lead').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Potential customers</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Avg. Engagement</p>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {contacts.length > 0
                                ? Math.round(
                                    contacts.reduce((acc, c) => acc + (c.engagementScore || 0), 0) /
                                    contacts.length
                                )
                                : 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Engagement score</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, email, or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="icon" variant="outline" onClick={fetchContacts}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Stage Filter */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Stage:</span>
                                <div className="flex gap-1">
                                    {['all', 'lead', 'prospect', 'customer'].map((stage) => (
                                        <button
                                            key={stage}
                                            onClick={() => setFilterStage(stage)}
                                            className={cn(
                                                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                                                filterStage === stage
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted hover:bg-muted/80'
                                            )}
                                        >
                                            {stage === 'all' ? 'All' : stage.charAt(0).toUpperCase() + stage.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Source Filter */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground"><Filter className="h-4 w-4 inline mr-1" />Source:</span>
                                <select
                                    value={filterSource}
                                    onChange={(e) => setFilterSource(e.target.value)}
                                    className="px-3 py-1.5 text-sm rounded-md border bg-background"
                                >
                                    <option value="all">All Sources</option>
                                    <option value="manual">Manual</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="email">Email</option>
                                    <option value="import">Import</option>
                                    <option value="ecommerce">E-commerce</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedContacts.length > 0 && (
                <Card className="bg-accent">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                                {selectedContacts.length} contact(s) selected
                            </span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={handleExport}>
                                    Export
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleDeleteSelected}>
                                    Delete
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedContacts([])}
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Contacts Table */}
            <Card className="overflow-visible">
                <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="p-4 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300"
                                    />
                                </th>
                                <th className="p-4 text-left text-sm font-medium">Name</th>
                                <th className="p-4 text-left text-sm font-medium">Contact Info</th>
                                <th className="p-4 text-left text-sm font-medium">Source</th>
                                <th className="p-4 text-left text-sm font-medium">Stage</th>
                                <th className="p-4 text-left text-sm font-medium">Tags</th>
                                <th className="p-4 text-left text-sm font-medium">Engagement</th>
                                <th className="p-4 text-left text-sm font-medium">Last Contact</th>
                                <th className="p-4 text-left text-sm font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContacts.map((contact) => (
                                <tr key={contact.id} className="border-b hover:bg-muted/50 transition-colors">
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedContacts.includes(contact.id)}
                                            onChange={() => toggleContactSelection(contact.id)}
                                            className="rounded border-gray-300"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                                                {contact.name?.split(' ').map((n) => n[0]).join('') || '?'}
                                            </div>
                                            <span className="font-medium">{contact.name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            {contact.email && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-muted-foreground">{contact.email}</span>
                                                </div>
                                            )}
                                            {contact.phone && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-muted-foreground">{contact.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={cn(
                                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                                                getSourceBadge(contact.source || 'manual')
                                            )}
                                        >
                                            {contact.source || 'manual'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={cn(
                                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                                                getStageBadge(contact.lifecycleStage || 'lead')
                                            )}
                                        >
                                            {(contact.lifecycleStage || 'lead').replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {(contact.tags || []).slice(0, 2).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {(contact.tags || []).length > 2 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs">
                                                    +{contact.tags.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={cn('h-full', getEngagementColor(contact.engagementScore || 0).replace('text-', 'bg-'))}
                                                    style={{ width: `${contact.engagementScore || 0}%` }}
                                                />
                                            </div>
                                            <span className={cn('text-sm font-medium', getEngagementColor(contact.engagementScore || 0))}>
                                                {contact.engagementScore || 0}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {contact.lastContactedAt
                                                ? new Date(contact.lastContactedAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })
                                                : 'Never'}
                                        </div>
                                    </td>
                                    <td className="p-4 relative">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setShowActionMenu(showActionMenu === contact.id ? null : contact.id)}
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>

                                        {/* Action Menu Dropdown */}
                                        {showActionMenu === contact.id && (
                                            <>
                                                {/* Backdrop to close menu */}
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setShowActionMenu(null)}
                                                />
                                                <div className="fixed right-8 mt-1 w-48 bg-background border rounded-lg shadow-xl z-50" style={{ transform: 'translateY(-100%)' }}>
                                                    <button
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 rounded-t-lg font-medium text-primary"
                                                        onClick={() => {
                                                            setShowActionMenu(null);
                                                            router.push(`/contacts/${contact.id}`);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" /> View Profile
                                                    </button>
                                                    <button
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                                                        onClick={() => handleViewContact(contact)}
                                                    >
                                                        <User className="h-4 w-4" /> Quick View
                                                    </button>
                                                    <button
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                                                        onClick={() => handleEditContact(contact)}
                                                    >
                                                        <Edit className="h-4 w-4" /> Edit Contact
                                                    </button>
                                                    <button
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                                                        onClick={() => handleMessageContact(contact)}
                                                    >
                                                        <MessageSquare className="h-4 w-4" /> WhatsApp
                                                    </button>
                                                    {contact.email && (
                                                        <button
                                                            className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                                                            onClick={() => {
                                                                window.location.href = `mailto:${contact.email}`;
                                                                setShowActionMenu(null);
                                                            }}
                                                        >
                                                            <Mail className="h-4 w-4" /> Send Email
                                                        </button>
                                                    )}
                                                    <hr className="my-1" />
                                                    <button
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-600 rounded-b-lg"
                                                        onClick={() => handleDeleteContact(contact.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" /> Delete
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {filteredContacts.length === 0 && !loading && (
                <div className="text-center py-12">
                    <User className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                    <p className="text-muted-foreground">
                        {contacts.length === 0
                            ? 'No contacts yet. Add your first contact to get started.'
                            : 'No contacts found matching your search.'}
                    </p>
                    {contacts.length === 0 && (
                        <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add First Contact
                        </Button>
                    )}
                </div>
            )}

            {/* Add Contact Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-xl font-bold">{isEditing ? 'Edit Contact' : 'Add Contact'}</h2>
                            <Button size="icon" variant="ghost" onClick={() => {
                                setShowAddModal(false);
                                setIsEditing(false);
                                setSelectedContact(null);
                                setFormData({
                                    name: '',
                                    email: '',
                                    phone: '',
                                    source: 'manual',
                                    lifecycle: 'lead',
                                    tags: '',
                                });
                            }}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone</label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+91 9876543210"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Lifecycle Stage</label>
                                <select
                                    className="w-full p-2 border rounded-lg bg-background"
                                    value={formData.lifecycle}
                                    onChange={(e) => setFormData({ ...formData, lifecycle: e.target.value })}
                                >
                                    <option value="lead">Lead</option>
                                    <option value="prospect">Prospect</option>
                                    <option value="customer">Customer</option>
                                    <option value="repeat_customer">Repeat Customer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                                <Input
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    placeholder="vip, newsletter, wholesale"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <Button variant="outline" onClick={() => {
                                setShowAddModal(false);
                                setIsEditing(false);
                                setSelectedContact(null);
                                setFormData({
                                    name: '',
                                    email: '',
                                    phone: '',
                                    source: 'manual',
                                    lifecycle: 'lead',
                                    tags: '',
                                });
                            }}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveContact} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isEditing ? 'Save Changes' : 'Add Contact'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-xl font-bold">Import Contacts</h2>
                            <Button size="icon" variant="ghost" onClick={() => setShowImportModal(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-muted-foreground mb-4">
                                Found {importedContacts.length} contacts to import:
                            </p>
                            <div className="max-h-60 overflow-auto border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="p-2 text-left">Name</th>
                                            <th className="p-2 text-left">Email</th>
                                            <th className="p-2 text-left">Phone</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importedContacts.slice(0, 10).map((c, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="p-2">{c.name || '-'}</td>
                                                <td className="p-2">{c.email || '-'}</td>
                                                <td className="p-2">{c.phone || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {importedContacts.length > 10 && (
                                    <p className="p-2 text-sm text-muted-foreground text-center">
                                        ... and {importedContacts.length - 10} more
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowImportModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleConfirmImport} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Import {importedContacts.length} Contacts
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Contact Modal */}
            {showViewModal && selectedContact && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-xl font-bold">Contact Details</h2>
                            <Button size="icon" variant="ghost" onClick={() => setShowViewModal(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 font-bold text-xl text-primary">
                                    {selectedContact.name?.split(' ').map((n) => n[0]).join('') || '?'}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">{selectedContact.name || 'Unknown'}</h3>
                                    <span className={cn(
                                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                                        getStageBadge(selectedContact.lifecycleStage || 'lead')
                                    )}>
                                        {selectedContact.lifecycleStage || 'lead'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Email</p>
                                    <p className="font-medium">{selectedContact.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Phone</p>
                                    <p className="font-medium">{selectedContact.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Source</p>
                                    <p className="font-medium capitalize">{selectedContact.source || 'manual'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Engagement</p>
                                    <p className={cn('font-medium', getEngagementColor(selectedContact.engagementScore || 0))}>
                                        {selectedContact.engagementScore || 0}%
                                    </p>
                                </div>
                            </div>

                            {selectedContact.tags && selectedContact.tags.length > 0 && (
                                <div>
                                    <p className="text-muted-foreground text-sm mb-2">Tags</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedContact.tags.map(tag => (
                                            <span key={tag} className="px-2 py-1 bg-muted rounded-full text-xs">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <Button variant="outline" onClick={() => handleMessageContact(selectedContact)}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                WhatsApp
                            </Button>
                            <Button onClick={() => setShowViewModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Click outside to close action menu */}
            {showActionMenu && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowActionMenu(null)}
                />
            )}
        </div>
    );
}

