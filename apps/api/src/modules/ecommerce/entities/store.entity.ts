import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';

export enum EcommercePlatform {
    SHOPIFY = 'shopify',
    WOOCOMMERCE = 'woocommerce',
    MAGENTO = 'magento',
    CUSTOM = 'custom',
}

@Entity('ecommerce_stores')
export class EcommerceStore {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @Column({
        type: 'enum',
        enum: EcommercePlatform,
        default: EcommercePlatform.SHOPIFY,
    })
    platform: EcommercePlatform;

    @Column({ name: 'store_name' })
    storeName: string;

    @Column({ name: 'store_url' })
    storeUrl: string;

    @Column({ name: 'api_key', nullable: true })
    apiKey: string;

    @Column({ name: 'api_secret', nullable: true })
    apiSecret: string;

    @Column({ name: 'access_token', nullable: true })
    accessToken: string;

    @Column({ name: 'webhook_secret', nullable: true })
    webhookSecret: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ type: 'jsonb', nullable: true })
    settings: {
        autoSyncProducts?: boolean;
        syncInterval?: number; // minutes
        webhookEvents?: string[];
        currency?: string;
        timezone?: string;
        shopifyScope?: string; // OAuth scopes granted
        shopifyShopId?: string; // Shopify shop ID
    };

    @Column({ name: 'last_sync_at', nullable: true })
    lastSyncAt: Date;

    @Column({ name: 'products_count', default: 0 })
    productsCount: number;

    @Column({ name: 'orders_count', default: 0 })
    ordersCount: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
