'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Store,
    Plus,
    Settings,
    RefreshCw,
    CheckCircle,
    XCircle,
    ExternalLink,
    ShoppingBag,
    Package,
    Clock,
    Trash2,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreData {
    id: string;
    platform: string;
    storeName: string;
    storeUrl: string;
    isActive: boolean;
    ordersCount: number;
    productsCount: number;
    lastSyncAt: string;
    connectedAt: string;
}

const platformConfig = {
    shopify: {
        name: 'Shopify',
        color: 'bg-green-500',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        logo: '🛍️',
    },
    woocommerce: {
        name: 'WooCommerce',
        color: 'bg-purple-500',
        textColor: 'text-purple-700',
        bgColor: 'bg-purple-50',
        logo: '🛒',
    },
    magento: {
        name: 'Magento',
        color: 'bg-orange-500',
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        logo: '🔶',
    },
    custom: {
        name: 'Custom',
        color: 'bg-gray-500',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-50',
        logo: '⚙️',
    },
};

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return date.toLocaleDateString();
}

export default function StoresPage() {
    const [stores, setStores] = useState<StoreData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);

    useEffect(() => {
        const fetchStores = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/stores');
                if (!response.ok) throw new Error('Failed to fetch stores');
                const data = await response.json();
                setStores(data.stores || data || []);
            } catch (error) {
                console.error('Error fetching stores:', error);
                setStores([]);
            } finally {
                setLoading(false);
            }
        };
        fetchStores();
    }, []);

    const totalOrders = stores.reduce((sum, s) => sum + (s.ordersCount || 0), 0);
    const totalProducts = stores.reduce((sum, s) => sum + (s.productsCount || 0), 0);

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
                    <h1 className="text-3xl font-bold tracking-tight">Connected Stores</h1>
                    <p className="text-muted-foreground">Connect and manage your e-commerce platforms</p>
                </div>
                <Button onClick={() => setShowConnectModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Connect Store
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Connected Stores</p>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stores.length}</div>
                        <p className="text-xs text-muted-foreground">All active and syncing</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Orders</p>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalOrders.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Across all stores</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium">Total Products</p>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalProducts.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Synced from stores</p>
                    </CardContent>
                </Card>
            </div>

            {/* Stores Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {stores.map((store) => {
                    const config = platformConfig[store.platform as keyof typeof platformConfig] || platformConfig.custom;

                    return (
                        <Card key={store.id} className="overflow-hidden">
                            <div className={cn('h-2', config.color)} />
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn('flex h-14 w-14 items-center justify-center rounded-xl text-2xl', config.bgColor)}>
                                            {config.logo}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{store.storeName}</CardTitle>
                                            <CardDescription className="flex items-center gap-2">
                                                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', config.bgColor, config.textColor)}>
                                                    {config.name}
                                                </span>
                                                <a href={`https://${store.storeUrl}`} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-primary">
                                                    {store.storeUrl}
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {store.isActive ? (
                                            <span className="flex items-center gap-1 text-xs text-green-600">
                                                <CheckCircle className="h-4 w-4" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs text-red-600">
                                                <XCircle className="h-4 w-4" />
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Stats Row */}
                                <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{store.ordersCount.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">Orders</p>
                                    </div>
                                    <div className="text-center border-x">
                                        <p className="text-2xl font-bold">{store.productsCount}</p>
                                        <p className="text-xs text-muted-foreground">Products</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold flex items-center justify-center gap-1">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                        </p>
                                        <p className="text-xs text-muted-foreground">{formatTimeAgo(store.lastSyncAt)}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1">
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Sync Now
                                    </Button>
                                    <Button variant="outline" className="flex-1">
                                        <Settings className="mr-2 h-4 w-4" />
                                        Settings
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {stores.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Store className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No stores connected</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Connect your first e-commerce store to start automating
                        </p>
                        <Button onClick={() => setShowConnectModal(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Connect Store
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Connect Store Modal */}
            {showConnectModal && (
                <ConnectStoreModal onClose={() => setShowConnectModal(false)} />
            )}
        </div>
    );
}

function ConnectStoreModal({ onClose }: { onClose: () => void }) {
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [step, setStep] = useState(1);

    const platforms = [
        {
            id: 'shopify',
            name: 'Shopify',
            description: 'Connect your Shopify store',
            logo: '🛍️',
            color: 'border-green-500 bg-green-50',
        },
        {
            id: 'woocommerce',
            name: 'WooCommerce',
            description: 'Connect your WordPress store',
            logo: '🛒',
            color: 'border-purple-500 bg-purple-50',
        },
        {
            id: 'magento',
            name: 'Magento',
            description: 'Connect your Magento store',
            logo: '🔶',
            color: 'border-orange-500 bg-orange-50',
        },
        {
            id: 'custom',
            name: 'Custom API',
            description: 'Connect via REST API',
            logo: '⚙️',
            color: 'border-gray-500 bg-gray-50',
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Connect E-commerce Store</CardTitle>
                            <CardDescription>Step {step} of 2</CardDescription>
                        </div>
                        <Button size="icon" variant="ghost" onClick={onClose}>
                            ×
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold">Select Platform</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {platforms.map((platform) => (
                                    <button
                                        key={platform.id}
                                        onClick={() => setSelectedPlatform(platform.id)}
                                        className={cn(
                                            'flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left',
                                            selectedPlatform === platform.id
                                                ? platform.color + ' border-primary'
                                                : 'border-muted hover:border-muted-foreground/50'
                                        )}
                                    >
                                        <span className="text-3xl">{platform.logo}</span>
                                        <div>
                                            <p className="font-medium">{platform.name}</p>
                                            <p className="text-sm text-muted-foreground">{platform.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold">Store Credentials</h3>

                            {selectedPlatform === 'shopify' && (
                                <div className="space-y-4">
                                    <div className="rounded-lg border p-4 bg-muted/50">
                                        <p className="text-sm text-muted-foreground">
                                            You'll need to install our app from the Shopify App Store to complete the connection.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Store URL</label>
                                        <Input placeholder="yourstore.myshopify.com" />
                                    </div>
                                </div>
                            )}

                            {selectedPlatform === 'woocommerce' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Store URL</label>
                                        <Input placeholder="https://yourstore.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Consumer Key</label>
                                        <Input placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Consumer Secret</label>
                                        <Input type="password" placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx" />
                                    </div>
                                </div>
                            )}

                            {(selectedPlatform === 'magento' || selectedPlatform === 'custom') && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Store URL</label>
                                        <Input placeholder="https://yourstore.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">API Key</label>
                                        <Input placeholder="Your API key" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">API Secret</label>
                                        <Input type="password" placeholder="Your API secret" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={step === 1 ? onClose : () => setStep(1)}
                        >
                            {step === 1 ? 'Cancel' : 'Back'}
                        </Button>
                        {step === 1 ? (
                            <Button
                                onClick={() => setStep(2)}
                                disabled={!selectedPlatform}
                            >
                                Continue
                            </Button>
                        ) : (
                            <Button onClick={onClose}>
                                <Store className="mr-2 h-4 w-4" />
                                Connect Store
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
