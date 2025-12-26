'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    Package,
    Search,
    Filter,
    TrendingUp,
    Clock,
    CheckCircle,
    XCircle,
    Truck,
    IndianRupee,
    ShoppingCart,
    CreditCard,
    Banknote,
    Eye,
    MessageSquare,
    MoreVertical,
    Loader2,
    RefreshCw,
    Store,
    Download,
    Copy,
    Mail,
    FileText,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WooCommerceOrder {
    id: number;
    number: string;
    status: string;
    total: string;
    currency: string;
    date_created: string;
    date_modified: string;
    payment_method: string;
    payment_method_title: string;
    billing: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
    };
    shipping: {
        first_name: string;
        last_name: string;
    };
    line_items: Array<{
        id: number;
        name: string;
        quantity: number;
        price: number;
        total: string;
    }>;
    storeId?: string;
    storeName?: string;
}

interface ConnectedStore {
    id: string;
    storeName: string;
    platform: string;
    storeUrl: string;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
    processing: { color: 'bg-blue-100 text-blue-700', icon: Package, label: 'Processing' },
    'on-hold': { color: 'bg-orange-100 text-orange-700', icon: Clock, label: 'On Hold' },
    completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Cancelled' },
    refunded: { color: 'bg-purple-100 text-purple-700', icon: Banknote, label: 'Refunded' },
    failed: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Failed' },
    shipped: { color: 'bg-indigo-100 text-indigo-700', icon: Truck, label: 'Shipped' },
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
    const [stores, setStores] = useState<ConnectedStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchOrdersFromStores();
    }, []);

    const fetchOrdersFromStores = async () => {
        try {
            setLoading(true);
            setError('');

            // First get all connected stores
            const storesResponse = await fetch('/api/v1/ecommerce/stores', {
                credentials: 'include',
            });

            if (!storesResponse.ok) {
                if (storesResponse.status === 401) {
                    setError('Please log in to view orders');
                    return;
                }
                throw new Error('Failed to fetch stores');
            }

            const storesData: ConnectedStore[] = await storesResponse.json();
            setStores(storesData.filter(s => s.platform === 'woocommerce'));

            // Fetch orders from each WooCommerce store
            const allOrders: WooCommerceOrder[] = [];

            for (const store of storesData.filter(s => s.platform === 'woocommerce')) {
                try {
                    const ordersResponse = await fetch(`/api/v1/ecommerce/stores/${store.id}/orders?limit=100`, {
                        credentials: 'include',
                    });

                    if (ordersResponse.ok) {
                        const storeOrders: WooCommerceOrder[] = await ordersResponse.json();
                        // Add store info to each order
                        storeOrders.forEach(order => {
                            order.storeId = store.id;
                            order.storeName = store.storeName;
                        });
                        allOrders.push(...storeOrders);
                    }
                } catch (e) {
                    console.error(`Error fetching orders from ${store.storeName}:`, e);
                }
            }

            // Sort by date (newest first)
            allOrders.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
            setOrders(allOrders);
        } catch (error: any) {
            console.error('Error fetching orders:', error);
            setError(error.message || 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setSyncing(true);
        await fetchOrdersFromStores();
        setSyncing(false);
    };

    const filteredOrders = orders.filter((order) => {
        const customerName = `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.toLowerCase();
        const matchesSearch =
            order.number?.toString().includes(searchQuery.toLowerCase()) ||
            customerName.includes(searchQuery.toLowerCase()) ||
            order.billing?.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    // Selected order for modal
    const [selectedOrder, setSelectedOrder] = useState<WooCommerceOrder | null>(null);
    const [showOrderModal, setShowOrderModal] = useState(false);

    // Export orders to CSV
    const handleExportOrders = () => {
        if (filteredOrders.length === 0) {
            alert('No orders to export');
            return;
        }

        // Prepare CSV data
        const headers = [
            'Order Number',
            'Date',
            'Customer Name',
            'Email',
            'Phone',
            'Status',
            'Payment Method',
            'Total',
            'Currency',
            'Items Count',
            'Items',
            'Store'
        ];

        const rows = filteredOrders.map(order => [
            `#${order.number}`,
            new Date(order.date_created).toLocaleString('en-IN'),
            `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
            order.billing?.email || '',
            order.billing?.phone || '',
            order.status,
            order.payment_method_title || order.payment_method,
            order.total,
            order.currency,
            order.line_items?.length || 0,
            order.line_items?.map(item => `${item.name} (x${item.quantity})`).join('; ') || '',
            order.storeName || ''
        ]);

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // View order details
    const handleViewOrder = (order: WooCommerceOrder) => {
        setSelectedOrder(order);
        setShowOrderModal(true);
    };

    // Send message to customer
    const handleMessageCustomer = (order: WooCommerceOrder) => {
        const phone = order.billing?.phone;
        if (phone) {
            // Clean phone number and add India country code if needed
            let cleanPhone = phone.replace(/[^0-9+]/g, '');

            // If phone doesn't start with + or country code, add +91 (India)
            if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('91')) {
                // Remove leading 0 if present (local format)
                if (cleanPhone.startsWith('0')) {
                    cleanPhone = cleanPhone.substring(1);
                }
                cleanPhone = '91' + cleanPhone;
            } else if (cleanPhone.startsWith('+')) {
                // Remove the + sign for WhatsApp URL (it expects just numbers)
                cleanPhone = cleanPhone.substring(1);
            }

            // Open WhatsApp with pre-filled message
            const message = `Hi ${order.billing?.first_name || 'Customer'}, regarding your order #${order.number}...`;
            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            alert('No phone number available for this customer');
        }
    };

    // More actions menu
    const handleMoreActions = (order: WooCommerceOrder, action: string) => {
        switch (action) {
            case 'copy':
                navigator.clipboard.writeText(`Order #${order.number} - ${order.billing?.first_name} ${order.billing?.last_name} - ${order.currency} ${order.total}`);
                alert('Order details copied to clipboard!');
                break;
            case 'email':
                if (order.billing?.email) {
                    window.location.href = `mailto:${order.billing.email}?subject=Regarding Order %23${order.number}`;
                }
                break;
            case 'invoice':
                // Generate a printable invoice
                const invoiceWindow = window.open('', '_blank');
                if (invoiceWindow) {
                    invoiceWindow.document.write(`
                        <html>
                        <head><title>Invoice #${order.number}</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 40px; }
                            h1 { color: #333; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                            th { background: #f5f5f5; }
                            .total { font-size: 1.5em; font-weight: bold; margin-top: 20px; }
                        </style>
                        </head>
                        <body>
                            <h1>Invoice #${order.number}</h1>
                            <p><strong>Date:</strong> ${new Date(order.date_created).toLocaleDateString()}</p>
                            <p><strong>Customer:</strong> ${order.billing?.first_name} ${order.billing?.last_name}</p>
                            <p><strong>Email:</strong> ${order.billing?.email}</p>
                            <p><strong>Phone:</strong> ${order.billing?.phone || 'N/A'}</p>
                            <table>
                                <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
                                ${order.line_items?.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.quantity}</td>
                                        <td>${order.currency} ${item.price}</td>
                                        <td>${order.currency} ${item.total}</td>
                                    </tr>
                                `).join('') || ''}
                            </table>
                            <p class="total">Total: ${order.currency} ${order.total}</p>
                            <p><strong>Payment:</strong> ${order.payment_method_title}</p>
                            <p><strong>Status:</strong> ${order.status}</p>
                        </body>
                        </html>
                    `);
                    invoiceWindow.document.close();
                    invoiceWindow.print();
                }
                break;
        }
    };

    // Calculate stats using WooCommerce fields
    const totalRevenue = orders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
        .reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'on-hold').length;
    const processingOrders = orders.filter(o => o.status === 'processing').length;

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
                    <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                    <p className="text-muted-foreground">
                        {stores.length > 0
                            ? `${orders.length} orders from ${stores.length} WooCommerce store${stores.length > 1 ? 's' : ''}`
                            : 'Connect a WooCommerce store to view orders'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={syncing}
                    >
                        {syncing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Refresh
                    </Button>
                    <Button onClick={handleExportOrders} disabled={filteredOrders.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Orders ({filteredOrders.length})
                    </Button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <Card className="border-destructive bg-destructive/10">
                    <CardContent className="p-4 text-destructive">
                        {error}
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Revenue</p>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">From {totalOrders} orders</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Orders</p>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOrders}</div>
                        <p className="text-xs text-muted-foreground">{pendingOrders} pending</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Processing</p>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{processingOrders}</div>
                        <p className="text-xs text-muted-foreground">Orders being fulfilled</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Avg Order Value</p>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₹{totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Average per order</p>
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
                                placeholder="Search by order #, name, email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex gap-2 flex-wrap">
                                {['all', 'pending', 'processing', 'on-hold', 'completed', 'cancelled'].map((status) => (
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
                                        {status === 'on-hold' ? 'On Hold' : status.charAt(0).toUpperCase() + status.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <Button size="icon" variant="outline">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left p-4 font-medium">Order</th>
                                    <th className="text-left p-4 font-medium">Customer</th>
                                    <th className="text-left p-4 font-medium">Status</th>
                                    <th className="text-left p-4 font-medium">Payment</th>
                                    <th className="text-left p-4 font-medium">Total</th>
                                    <th className="text-left p-4 font-medium">Date</th>
                                    <th className="text-left p-4 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => {
                                    const StatusIcon = statusConfig[order.status]?.icon || Package;
                                    const customerName = `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'Guest';

                                    return (
                                        <tr key={`${order.storeId}-${order.id}`} className="border-b hover:bg-muted/30">
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-medium">#{order.number}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {order.line_items?.length || 0} item{(order.line_items?.length || 0) > 1 ? 's' : ''}
                                                    </p>
                                                    {order.storeName && (
                                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                            <Store className="h-3 w-3" />
                                                            {order.storeName}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-medium">{customerName}</p>
                                                    <p className="text-sm text-muted-foreground">{order.billing?.email}</p>
                                                    {order.billing?.phone && (
                                                        <p className="text-xs text-muted-foreground">{order.billing.phone}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
                                                        statusConfig[order.status]?.color || 'bg-gray-100 text-gray-700'
                                                    )}
                                                >
                                                    <StatusIcon className="h-3 w-3" />
                                                    {statusConfig[order.status]?.label || order.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm">
                                                        {order.payment_method_title || order.payment_method || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-medium">
                                                    {order.currency === 'INR' ? '₹' : order.currency + ' '}
                                                    {parseFloat(order.total).toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm">
                                                    {new Date(order.date_created).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(order.date_created).toLocaleTimeString('en-IN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        title="View Order Details"
                                                        onClick={() => handleViewOrder(order)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        title="Send WhatsApp Message"
                                                        onClick={() => handleMessageCustomer(order)}
                                                    >
                                                        <MessageSquare className="h-4 w-4" />
                                                    </Button>
                                                    <div className="relative group">
                                                        <Button size="icon" variant="ghost" title="More Actions">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                        <div className="absolute right-0 top-full mt-1 w-40 bg-popover border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                                            <button
                                                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                                                onClick={() => handleMoreActions(order, 'copy')}
                                                            >
                                                                <Copy className="h-4 w-4" /> Copy Details
                                                            </button>
                                                            <button
                                                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                                                onClick={() => handleMoreActions(order, 'email')}
                                                            >
                                                                <Mail className="h-4 w-4" /> Send Email
                                                            </button>
                                                            <button
                                                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                                                onClick={() => handleMoreActions(order, 'invoice')}
                                                            >
                                                                <FileText className="h-4 w-4" /> Print Invoice
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {filteredOrders.length === 0 && !loading && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Package className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No orders found</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-md">
                            {stores.length === 0
                                ? 'Connect a WooCommerce store first to see your orders here.'
                                : searchQuery || filterStatus !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'Orders from your WooCommerce stores will appear here'}
                        </p>
                        {stores.length === 0 && (
                            <Button className="mt-4" onClick={() => window.location.href = '/settings/stores'}>
                                <Store className="mr-2 h-4 w-4" />
                                Connect Store
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Order Detail Modal */}
            {showOrderModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background">
                            <div>
                                <h2 className="text-xl font-bold">Order #{selectedOrder.number}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(selectedOrder.date_created).toLocaleString('en-IN')}
                                </p>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setShowOrderModal(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-6">
                            {/* Status & Store */}
                            <div className="flex items-center gap-4">
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                                        statusConfig[selectedOrder.status]?.color || 'bg-gray-100 text-gray-700'
                                    )}
                                >
                                    {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                                </span>
                                {selectedOrder.storeName && (
                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Store className="h-4 w-4" />
                                        {selectedOrder.storeName}
                                    </span>
                                )}
                            </div>

                            {/* Customer Info */}
                            <div className="bg-muted/50 rounded-lg p-4">
                                <h3 className="font-semibold mb-3">Customer Information</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Name</p>
                                        <p className="font-medium">
                                            {selectedOrder.billing?.first_name} {selectedOrder.billing?.last_name}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Email</p>
                                        <p className="font-medium">{selectedOrder.billing?.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Phone</p>
                                        <p className="font-medium">{selectedOrder.billing?.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Payment</p>
                                        <p className="font-medium">
                                            {selectedOrder.payment_method_title || selectedOrder.payment_method}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Line Items */}
                            <div>
                                <h3 className="font-semibold mb-3">Order Items</h3>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-3">Product</th>
                                                <th className="text-center p-3">Qty</th>
                                                <th className="text-right p-3">Price</th>
                                                <th className="text-right p-3">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedOrder.line_items?.map((item, idx) => (
                                                <tr key={item.id || idx} className="border-t">
                                                    <td className="p-3">{item.name}</td>
                                                    <td className="text-center p-3">{item.quantity}</td>
                                                    <td className="text-right p-3">
                                                        {selectedOrder.currency} {item.price}
                                                    </td>
                                                    <td className="text-right p-3 font-medium">
                                                        {selectedOrder.currency} {item.total}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-muted/30">
                                            <tr>
                                                <td colSpan={3} className="text-right p-3 font-semibold">
                                                    Order Total:
                                                </td>
                                                <td className="text-right p-3 font-bold text-lg">
                                                    {selectedOrder.currency} {selectedOrder.total}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t p-4 flex justify-end gap-2 sticky bottom-0 bg-background">
                            <Button
                                variant="outline"
                                onClick={() => handleMessageCustomer(selectedOrder)}
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                WhatsApp
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleMoreActions(selectedOrder, 'invoice')}
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                Print Invoice
                            </Button>
                            <Button onClick={() => setShowOrderModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

