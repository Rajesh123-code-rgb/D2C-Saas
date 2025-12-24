'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ShoppingCart,
    Search,
    Filter,
    MessageSquare,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    User,
    RotateCcw,
    Loader2,
    RefreshCw,
    Store,
    Phone,
    Mail,
    Eye,
    Settings,
    X,
    Copy,
    Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// WooCommerce order structure for abandoned carts
interface WooCommerceAbandonedCart {
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

// Dynamic variables for message templates
const DYNAMIC_VARIABLES = [
    { key: '{{customer_name}}', label: 'Customer Name', description: 'First name of the customer' },
    { key: '{{customer_full_name}}', label: 'Full Name', description: 'First and last name' },
    { key: '{{cart_items}}', label: 'Cart Items', description: 'List of items in cart' },
    { key: '{{cart_total}}', label: 'Cart Total', description: 'Total amount with currency' },
    { key: '{{order_number}}', label: 'Order Number', description: 'Order/Cart number' },
    { key: '{{store_name}}', label: 'Store Name', description: 'Your store name' },
    { key: '{{currency}}', label: 'Currency', description: 'Currency symbol' },
];

// Default message templates for PENDING status (awaiting payment)
const DEFAULT_PENDING_TEMPLATE = `Hi {{customer_name}},

We noticed you have items waiting in your cart! 🛒

{{cart_items}}

Cart Total: {{cart_total}}

Your items are reserved but waiting for payment. Complete your order now to secure your products!

👉 Need help with checkout? Just reply to this message.

- {{store_name}}`;

// Default message template for ON-HOLD status (payment verification pending)
const DEFAULT_ONHOLD_TEMPLATE = `Hi {{customer_name}},

Your order #{{order_number}} is on hold and needs attention! ⏸️

{{cart_items}}

Order Total: {{cart_total}}

We're waiting to process your order. This could be due to:
• Payment verification needed
• Additional information required

Please contact us to resolve this quickly so we can ship your items!

Reply to this message for help.

- {{store_name}}`;

// Default message template for FAILED status (payment failed)
const DEFAULT_FAILED_TEMPLATE = `Hi {{customer_name}},

Oops! Your payment for Order #{{order_number}} didn't go through. 😔

{{cart_items}}

Order Total: {{cart_total}}

Don't worry - this happens sometimes! Common reasons:
• Card declined or insufficient funds
• Bank security check
• Network timeout

Good news: Your items are still available! Try again with:
✅ A different card
✅ UPI payment
✅ Net banking

Need assistance? Just reply here - we're happy to help! 🙌

- {{store_name}}`;



const DEFAULT_EMAIL_SUBJECT = `Complete Your Order #{{order_number}} - {{store_name}}`;

const DEFAULT_EMAIL_TEMPLATE = `Hi {{customer_name}},

We noticed you have items waiting in your cart.

Order #{{order_number}}
Total: {{cart_total}}

Click here to complete your purchase!

Best regards,
{{store_name}}`;

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending Payment' },
    'on-hold': { color: 'bg-orange-100 text-orange-700', icon: Clock, label: 'On Hold' },
    failed: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Payment Failed' },
    'checkout-draft': { color: 'bg-gray-100 text-gray-700', icon: ShoppingCart, label: 'Draft Checkout' },
    recovered: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Recovered' },
};

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString('en-IN');
}

export default function AbandonedCartsPage() {
    const [carts, setCarts] = useState<WooCommerceAbandonedCart[]>([]);
    const [stores, setStores] = useState<ConnectedStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [recoveringAll, setRecoveringAll] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [error, setError] = useState('');
    const [selectedCart, setSelectedCart] = useState<WooCommerceAbandonedCart | null>(null);
    const [showCartModal, setShowCartModal] = useState(false);

    // Message template states - separate templates for each status
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [activeTemplateTab, setActiveTemplateTab] = useState<'pending' | 'on-hold' | 'failed'>('pending');

    const [pendingTemplate, setPendingTemplate] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('abandonedCartPendingTemplate') || DEFAULT_PENDING_TEMPLATE;
        }
        return DEFAULT_PENDING_TEMPLATE;
    });
    const [onholdTemplate, setOnholdTemplate] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('abandonedCartOnholdTemplate') || DEFAULT_ONHOLD_TEMPLATE;
        }
        return DEFAULT_ONHOLD_TEMPLATE;
    });
    const [failedTemplate, setFailedTemplate] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('abandonedCartFailedTemplate') || DEFAULT_FAILED_TEMPLATE;
        }
        return DEFAULT_FAILED_TEMPLATE;
    });

    const [emailSubject, setEmailSubject] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('abandonedCartEmailSubject') || DEFAULT_EMAIL_SUBJECT;
        }
        return DEFAULT_EMAIL_SUBJECT;
    });
    const [emailTemplate, setEmailTemplate] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('abandonedCartEmailTemplate') || DEFAULT_EMAIL_TEMPLATE;
        }
        return DEFAULT_EMAIL_TEMPLATE;
    });
    const [templateSaved, setTemplateSaved] = useState(false);

    useEffect(() => {
        fetchAbandonedCarts();
    }, []);

    // Get the appropriate template based on cart status
    const getTemplateByStatus = (status: string): string => {
        switch (status) {
            case 'pending':
            case 'checkout-draft':
                return pendingTemplate;
            case 'on-hold':
                return onholdTemplate;
            case 'failed':
                return failedTemplate;
            default:
                return pendingTemplate;
        }
    };

    // Replace dynamic variables with actual values
    const replaceVariables = (template: string, cart: WooCommerceAbandonedCart): string => {
        const itemsList = cart.line_items?.map(item => `• ${item.name} (x${item.quantity})`).join('\n') || '';
        const cartTotal = `${cart.currency === 'INR' ? '₹' : cart.currency + ' '}${parseFloat(cart.total).toLocaleString()}`;

        return template
            .replace(/\{\{customer_name\}\}/g, cart.billing?.first_name || 'Customer')
            .replace(/\{\{customer_full_name\}\}/g, `${cart.billing?.first_name || ''} ${cart.billing?.last_name || ''}`.trim() || 'Customer')
            .replace(/\{\{cart_items\}\}/g, itemsList)
            .replace(/\{\{cart_total\}\}/g, cartTotal)
            .replace(/\{\{order_number\}\}/g, cart.number || '')
            .replace(/\{\{store_name\}\}/g, cart.storeName || 'Our Store')
            .replace(/\{\{currency\}\}/g, cart.currency === 'INR' ? '₹' : cart.currency);
    };

    // Save templates to localStorage
    const handleSaveTemplates = () => {
        localStorage.setItem('abandonedCartPendingTemplate', pendingTemplate);
        localStorage.setItem('abandonedCartOnholdTemplate', onholdTemplate);
        localStorage.setItem('abandonedCartFailedTemplate', failedTemplate);
        localStorage.setItem('abandonedCartEmailSubject', emailSubject);
        localStorage.setItem('abandonedCartEmailTemplate', emailTemplate);
        setTemplateSaved(true);
        setTimeout(() => setTemplateSaved(false), 2000);
    };

    // Reset templates to default
    const handleResetTemplates = () => {
        setPendingTemplate(DEFAULT_PENDING_TEMPLATE);
        setOnholdTemplate(DEFAULT_ONHOLD_TEMPLATE);
        setFailedTemplate(DEFAULT_FAILED_TEMPLATE);
        setEmailSubject(DEFAULT_EMAIL_SUBJECT);
        setEmailTemplate(DEFAULT_EMAIL_TEMPLATE);
    };

    const fetchAbandonedCarts = async () => {
        try {
            setLoading(true);
            setError('');

            // First get all connected stores
            const storesResponse = await fetch('/api/v1/ecommerce/stores', {
                credentials: 'include',
            });

            if (!storesResponse.ok) {
                if (storesResponse.status === 401) {
                    setError('Please log in to view abandoned carts');
                    return;
                }
                throw new Error('Failed to fetch stores');
            }

            const storesData: ConnectedStore[] = await storesResponse.json();
            const wooStores = storesData.filter(s => s.platform === 'woocommerce');
            setStores(wooStores);

            // Fetch abandoned carts from each WooCommerce store
            const allCarts: WooCommerceAbandonedCart[] = [];

            for (const store of wooStores) {
                try {
                    const cartsResponse = await fetch(`/api/v1/ecommerce/stores/${store.id}/abandoned-carts?limit=100`, {
                        credentials: 'include',
                    });

                    if (cartsResponse.ok) {
                        const storeCarts: WooCommerceAbandonedCart[] = await cartsResponse.json();
                        // Add store info to each cart
                        storeCarts.forEach(cart => {
                            cart.storeId = store.id;
                            cart.storeName = store.storeName;
                        });
                        allCarts.push(...storeCarts);
                    }
                } catch (e) {
                    console.error(`Error fetching abandoned carts from ${store.storeName}:`, e);
                }
            }

            // Sort by date (newest first)
            allCarts.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
            setCarts(allCarts);
        } catch (error: any) {
            console.error('Error fetching abandoned carts:', error);
            setError(error.message || 'Failed to load abandoned carts');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setSyncing(true);
        await fetchAbandonedCarts();
        setSyncing(false);
    };

    // Send WhatsApp reminder to customer using template
    const handleSendReminder = (cart: WooCommerceAbandonedCart) => {
        const phone = cart.billing?.phone;
        if (phone) {
            // Clean phone number and add India country code if needed
            let cleanPhone = phone.replace(/[^0-9+]/g, '');
            if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('91')) {
                if (cleanPhone.startsWith('0')) {
                    cleanPhone = cleanPhone.substring(1);
                }
                cleanPhone = '91' + cleanPhone;
            } else if (cleanPhone.startsWith('+')) {
                cleanPhone = cleanPhone.substring(1);
            }

            const template = getTemplateByStatus(cart.status);
            const message = replaceVariables(template, cart);
            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            alert('No phone number available for this customer');
        }
    };

    // Send email reminder using template
    const handleEmailReminder = (cart: WooCommerceAbandonedCart) => {
        const email = cart.billing?.email;
        if (email) {
            const subject = replaceVariables(emailSubject, cart);
            const body = replaceVariables(emailTemplate, cart);
            window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        } else {
            alert('No email available for this customer');
        }
    };

    // View cart details
    const handleViewCart = (cart: WooCommerceAbandonedCart) => {
        setSelectedCart(cart);
        setShowCartModal(true);
    };

    // Recover all pending carts (send reminders to all)
    const handleRecoverAllPending = async () => {
        const pendingCarts = carts.filter(c => c.status === 'pending' || c.status === 'on-hold' || c.status === 'failed');

        if (pendingCarts.length === 0) {
            alert('No pending carts to recover');
            return;
        }

        const confirm = window.confirm(`This will open WhatsApp for ${pendingCarts.length} customers. Continue?`);
        if (!confirm) return;

        setRecoveringAll(true);

        // Open WhatsApp for each cart with a small delay
        for (let i = 0; i < Math.min(pendingCarts.length, 10); i++) { // Limit to 10 at a time
            const cart = pendingCarts[i];
            setTimeout(() => {
                handleSendReminder(cart);
            }, i * 1000); // 1 second delay between each
        }

        if (pendingCarts.length > 10) {
            alert(`Opened WhatsApp for first 10 customers. ${pendingCarts.length - 10} more remaining.`);
        }

        setRecoveringAll(false);
    };

    const filteredCarts = carts.filter((cart) => {
        const customerName = `${cart.billing?.first_name || ''} ${cart.billing?.last_name || ''}`.toLowerCase();
        const matchesSearch =
            cart.number?.toString().includes(searchQuery.toLowerCase()) ||
            customerName.includes(searchQuery.toLowerCase()) ||
            cart.billing?.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || cart.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    // Calculate stats
    const totalValue = carts.reduce((sum, c) => sum + parseFloat(c.total || '0'), 0);
    const pendingCount = carts.filter(c => c.status === 'pending' || c.status === 'on-hold').length;
    const failedCount = carts.filter(c => c.status === 'failed').length;

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
                    <h1 className="text-3xl font-bold tracking-tight">Abandoned Carts</h1>
                    <p className="text-muted-foreground">
                        {stores.length > 0
                            ? `${carts.length} abandoned carts from ${stores.length} store${stores.length > 1 ? 's' : ''}`
                            : 'Connect a WooCommerce store to track abandoned carts'}
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
                    <Button
                        onClick={handleRecoverAllPending}
                        disabled={recoveringAll || pendingCount === 0}
                    >
                        {recoveringAll ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RotateCcw className="mr-2 h-4 w-4" />
                        )}
                        Recover All Pending ({pendingCount})
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowTemplateEditor(true)}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        Message Settings
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
                        <p className="text-sm font-medium">Total Abandoned</p>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{carts.length}</div>
                        <p className="text-xs text-muted-foreground">₹{totalValue.toLocaleString()} total value</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Pending Payment</p>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                        <p className="text-xs text-muted-foreground">Awaiting payment</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Payment Failed</p>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                        <p className="text-xs text-muted-foreground">Need follow-up</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Avg Cart Value</p>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₹{carts.length > 0 ? Math.round(totalValue / carts.length).toLocaleString() : 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Per abandoned cart</p>
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
                                {['all', 'pending', 'on-hold', 'failed'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={cn(
                                            'px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
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

            {/* Carts Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCarts.map((cart) => {
                    const StatusIcon = statusConfig[cart.status]?.icon || Clock;
                    const customerName = `${cart.billing?.first_name || ''} ${cart.billing?.last_name || ''}`.trim() || 'Guest';

                    return (
                        <Card key={`${cart.storeId}-${cart.id}`} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                            <User className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{customerName}</CardTitle>
                                            <CardDescription className="text-xs">
                                                Order #{cart.number}
                                                {cart.storeName && (
                                                    <span className="ml-2 text-muted-foreground">• {cart.storeName}</span>
                                                )}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                                            statusConfig[cart.status]?.color || 'bg-gray-100 text-gray-700'
                                        )}
                                    >
                                        <StatusIcon className="h-3 w-3" />
                                        {statusConfig[cart.status]?.label || cart.status}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Items */}
                                <div className="space-y-2">
                                    {cart.line_items?.slice(0, 3).map((item, index) => (
                                        <div key={index} className="flex justify-between text-sm">
                                            <span className="text-muted-foreground truncate max-w-[60%]">
                                                {item.name} × {item.quantity}
                                            </span>
                                            <span>₹{parseFloat(item.total).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {(cart.line_items?.length || 0) > 3 && (
                                        <p className="text-xs text-muted-foreground">
                                            +{cart.line_items.length - 3} more items
                                        </p>
                                    )}
                                    <div className="flex justify-between font-medium border-t pt-2">
                                        <span>Total</span>
                                        <span className="text-green-600">
                                            {cart.currency === 'INR' ? '₹' : cart.currency + ' '}
                                            {parseFloat(cart.total).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="text-xs text-muted-foreground space-y-1">
                                    {cart.billing?.email && (
                                        <p className="flex items-center gap-1 truncate">
                                            <Mail className="h-3 w-3" /> {cart.billing.email}
                                        </p>
                                    )}
                                    {cart.billing?.phone && (
                                        <p className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> {cart.billing.phone}
                                        </p>
                                    )}
                                </div>

                                {/* Time Info */}
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Abandoned {formatTimeAgo(cart.date_created)}</span>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleSendReminder(cart)}
                                        disabled={!cart.billing?.phone}
                                    >
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        WhatsApp
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEmailReminder(cart)}
                                        disabled={!cart.billing?.email}
                                    >
                                        <Mail className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewCart(cart)}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {filteredCarts.length === 0 && !loading && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <ShoppingCart className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No abandoned carts found</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-md">
                            {stores.length === 0
                                ? 'Connect a WooCommerce store to track abandoned carts.'
                                : searchQuery || filterStatus !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'Great news! No abandoned carts right now.'}
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

            {/* Cart Detail Modal */}
            {showCartModal && selectedCart && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background">
                            <div>
                                <h2 className="text-xl font-bold">Order #{selectedCart.number}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(selectedCart.date_created).toLocaleString('en-IN')}
                                </p>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setShowCartModal(false)}
                            >
                                <XCircle className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-6">
                            {/* Status & Store */}
                            <div className="flex items-center gap-4">
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                                        statusConfig[selectedCart.status]?.color || 'bg-gray-100 text-gray-700'
                                    )}
                                >
                                    {statusConfig[selectedCart.status]?.label || selectedCart.status}
                                </span>
                                {selectedCart.storeName && (
                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Store className="h-4 w-4" />
                                        {selectedCart.storeName}
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
                                            {selectedCart.billing?.first_name} {selectedCart.billing?.last_name}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Email</p>
                                        <p className="font-medium">{selectedCart.billing?.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Phone</p>
                                        <p className="font-medium">{selectedCart.billing?.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Payment Method</p>
                                        <p className="font-medium">
                                            {selectedCart.payment_method_title || selectedCart.payment_method || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Line Items */}
                            <div>
                                <h3 className="font-semibold mb-3">Cart Items</h3>
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
                                            {selectedCart.line_items?.map((item, idx) => (
                                                <tr key={item.id || idx} className="border-t">
                                                    <td className="p-3">{item.name}</td>
                                                    <td className="text-center p-3">{item.quantity}</td>
                                                    <td className="text-right p-3">
                                                        {selectedCart.currency} {item.price}
                                                    </td>
                                                    <td className="text-right p-3 font-medium">
                                                        {selectedCart.currency} {item.total}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-muted/30">
                                            <tr>
                                                <td colSpan={3} className="text-right p-3 font-semibold">
                                                    Cart Total:
                                                </td>
                                                <td className="text-right p-3 font-bold text-lg">
                                                    {selectedCart.currency} {selectedCart.total}
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
                                onClick={() => handleSendReminder(selectedCart)}
                                disabled={!selectedCart.billing?.phone}
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                WhatsApp
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleEmailReminder(selectedCart)}
                                disabled={!selectedCart.billing?.email}
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                Email
                            </Button>
                            <Button onClick={() => setShowCartModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Template Editor Modal */}
            {showTemplateEditor && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background">
                            <div>
                                <h2 className="text-xl font-bold">Message Templates</h2>
                                <p className="text-sm text-muted-foreground">
                                    Customize your cart recovery messages with dynamic variables
                                </p>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setShowTemplateEditor(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-6">
                            {/* Dynamic Variables */}
                            <div className="bg-muted/50 rounded-lg p-4">
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <Copy className="h-4 w-4" />
                                    Dynamic Variables
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Click on a variable to copy it, then paste in your template:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {DYNAMIC_VARIABLES.map((variable) => (
                                        <button
                                            key={variable.key}
                                            className="px-3 py-1.5 bg-background rounded-md border text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                                            onClick={() => {
                                                navigator.clipboard.writeText(variable.key);
                                                alert(`Copied: ${variable.key}`);
                                            }}
                                            title={variable.description}
                                        >
                                            {variable.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* WhatsApp Templates - Tabbed by Status */}
                            <div>
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-green-600" />
                                    WhatsApp Message Templates (by Status)
                                </h3>

                                {/* Status Tabs */}
                                <div className="flex gap-2 mb-4">
                                    {(['pending', 'on-hold', 'failed'] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTemplateTab(tab)}
                                            className={cn(
                                                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                                activeTemplateTab === tab
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted hover:bg-muted/80'
                                            )}
                                        >
                                            {tab === 'pending' && '⏳ Pending Payment'}
                                            {tab === 'on-hold' && '⏸️ On Hold'}
                                            {tab === 'failed' && '❌ Payment Failed'}
                                        </button>
                                    ))}
                                </div>

                                {/* Pending Template */}
                                {activeTemplateTab === 'pending' && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Sent to customers who started checkout but didn't complete payment
                                        </p>
                                        <textarea
                                            id="pending-template"
                                            className="w-full h-48 p-3 border rounded-lg text-sm font-mono resize-y bg-background"
                                            value={pendingTemplate}
                                            onChange={(e) => setPendingTemplate(e.target.value)}
                                            placeholder="Enter your message for pending carts..."
                                        />
                                    </div>
                                )}

                                {/* On-Hold Template */}
                                {activeTemplateTab === 'on-hold' && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Sent to customers whose orders need verification or additional info
                                        </p>
                                        <textarea
                                            id="onhold-template"
                                            className="w-full h-48 p-3 border rounded-lg text-sm font-mono resize-y bg-background"
                                            value={onholdTemplate}
                                            onChange={(e) => setOnholdTemplate(e.target.value)}
                                            placeholder="Enter your message for on-hold orders..."
                                        />
                                    </div>
                                )}

                                {/* Failed Template */}
                                {activeTemplateTab === 'failed' && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Sent to customers whose payment failed or was declined
                                        </p>
                                        <textarea
                                            id="failed-template"
                                            className="w-full h-48 p-3 border rounded-lg text-sm font-mono resize-y bg-background"
                                            value={failedTemplate}
                                            onChange={(e) => setFailedTemplate(e.target.value)}
                                            placeholder="Enter your message for failed payments..."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Email Templates */}
                            <div>
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-blue-600" />
                                    Email Template
                                </h3>

                                <label className="block text-sm font-medium mb-2">Subject Line</label>
                                <input
                                    id="email-subject"
                                    type="text"
                                    className="w-full p-3 border rounded-lg text-sm mb-4 bg-background"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    placeholder="Email subject line..."
                                />

                                <label className="block text-sm font-medium mb-2">Email Body</label>
                                <textarea
                                    id="email-template"
                                    className="w-full h-40 p-3 border rounded-lg text-sm font-mono resize-y bg-background"
                                    value={emailTemplate}
                                    onChange={(e) => setEmailTemplate(e.target.value)}
                                    placeholder="Enter your email message template..."
                                />
                            </div>

                            {/* Preview Section */}
                            {carts.length > 0 && (
                                <div className="border rounded-lg p-4">
                                    <h3 className="font-semibold mb-3">
                                        Preview - {activeTemplateTab === 'pending' ? 'Pending' : activeTemplateTab === 'on-hold' ? 'On Hold' : 'Failed'} Template
                                    </h3>
                                    <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                                        {replaceVariables(
                                            activeTemplateTab === 'pending' ? pendingTemplate :
                                                activeTemplateTab === 'on-hold' ? onholdTemplate : failedTemplate,
                                            carts[0]
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t p-4 flex justify-between items-center sticky bottom-0 bg-background">
                            <Button
                                variant="outline"
                                onClick={handleResetTemplates}
                            >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reset to Default
                            </Button>
                            <div className="flex items-center gap-2">
                                {templateSaved && (
                                    <span className="text-sm text-green-600 flex items-center gap-1">
                                        <CheckCircle className="h-4 w-4" />
                                        Saved!
                                    </span>
                                )}
                                <Button variant="outline" onClick={() => setShowTemplateEditor(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveTemplates}>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Templates
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
