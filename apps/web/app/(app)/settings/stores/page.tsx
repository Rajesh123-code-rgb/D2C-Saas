'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, ShoppingBag, Webhook, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { ShopifyModal } from './components/ShopifyModal';
import { WooCommerceModal } from './components/WooCommerceModal';
import { WebhookModal } from './components/WebhookModal';

interface StoreIntegration {
    id: string;
    platform: 'shopify' | 'woocommerce' | 'custom';
    storeName: string;
    storeUrl: string;
    isActive: boolean;
    productsCount: number;
    ordersCount: number;
    lastSyncAt: string | null;
}

export default function StoresPage() {
    const [stores, setStores] = useState<StoreIntegration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [shopifyModalOpen, setShopifyModalOpen] = useState(false);
    const [wooModalOpen, setWooModalOpen] = useState(false);
    const [webhookModalOpen, setWebhookModalOpen] = useState(false);

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/v1/ecommerce/stores', {
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Please log in to view stores');
                    return;
                }
                throw new Error('Failed to fetch stores');
            }

            const data = await response.json();
            setStores(data);
        } catch (err: any) {
            console.error('Error fetching stores:', err);
            setError(err.message || 'Failed to load stores');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async (storeId: string) => {
        if (!confirm('Are you sure you want to disconnect this store?')) return;

        try {
            const response = await fetch(`/api/v1/ecommerce/stores/${storeId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to disconnect store');
            }

            await fetchStores();
        } catch (err: any) {
            alert(err.message || 'Failed to disconnect store');
        }
    };

    const [syncing, setSyncing] = useState<string | null>(null);

    const handleSync = async (storeId: string) => {
        try {
            setSyncing(storeId);
            const response = await fetch(`/api/v1/ecommerce/stores/${storeId}/sync`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Sync failed');
            }

            const result = await response.json();

            if (result.success) {
                alert(`✅ Sync Complete!\n\nProducts: ${result.productsCount}\nOrders: ${result.ordersCount}`);
                await fetchStores();
            } else {
                throw new Error(result.message || 'Sync failed');
            }
        } catch (err: any) {
            alert(`❌ Sync Error\n\n${err.message}`);
        } finally {
            setSyncing(null);
        }
    };

    const handleStoreSuccess = () => {
        fetchStores();
    };

    const storeConfigs = [
        {
            id: 'shopify',
            name: 'Shopify',
            description: 'Connect your Shopify store to sync products and orders',
            icon: ShoppingBag,
            color: 'bg-green-500',
            connected: stores.find(s => s.platform === 'shopify'),
            onConnect: () => setShopifyModalOpen(true),
        },
        {
            id: 'woocommerce',
            name: 'WooCommerce',
            description: 'Connect your WooCommerce store via WordPress REST API',
            icon: Store,
            color: 'bg-purple-500',
            connected: stores.find(s => s.platform === 'woocommerce'),
            onConnect: () => setWooModalOpen(true),
        },
        {
            id: 'webhook',
            name: 'Custom Webhook',
            description: 'Integrate any e-commerce platform using webhooks',
            icon: Webhook,
            color: 'bg-blue-500',
            connected: stores.find(s => s.platform === 'custom'),
            onConnect: () => setWebhookModalOpen(true),
        },
    ];

    if (loading) {
        return (
            < div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Store Integrations</h1>
                <p className="text-muted-foreground mt-2">
                    Connect your e-commerce stores to sync products, orders, and customer data
                </p>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storeConfigs.map((config) => {
                    const Icon = config.icon;
                    const store = config.connected;

                    return (
                        <Card key={config.id} className="relative">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`${config.color} p-2 rounded-lg`}>
                                            <Icon className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle>{config.name}</CardTitle>
                                            <CardDescription className="mt-1">
                                                {store ? store.storeName : config.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    {store && (
                                        <Badge variant={store.isActive ? 'default' : 'secondary'}>
                                            {store.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {store ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Store URL:</span>
                                                <span className="font-medium truncate ml-2" title={store.storeUrl}>
                                                    {store.storeUrl}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Products:</span>
                                                <span className="font-medium">{store.productsCount}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Orders:</span>
                                                <span className="font-medium">{store.ordersCount}</span>
                                            </div>
                                            {store.lastSyncAt && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Last Sync:</span>
                                                    <span className="font-medium">
                                                        {new Date(store.lastSyncAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDisconnect(store.id)}
                                            >
                                                Disconnect
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleSync(store.id)}
                                                disabled={syncing === store.id}
                                            >
                                                {syncing === store.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4" />
                                                )}
                                                <span className="ml-1">Sync</span>
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        className="w-full"
                                        onClick={config.onConnect}
                                    >
                                        Connect {config.name}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Modals */}
            <ShopifyModal
                open={shopifyModalOpen}
                onOpenChange={setShopifyModalOpen}
                onSuccess={handleStoreSuccess}
            />
            <WooCommerceModal
                open={wooModalOpen}
                onOpenChange={setWooModalOpen}
                onSuccess={handleStoreSuccess}
            />
            <WebhookModal
                open={webhookModalOpen}
                onOpenChange={setWebhookModalOpen}
                onSuccess={handleStoreSuccess}
            />
        </div>
    );
}
