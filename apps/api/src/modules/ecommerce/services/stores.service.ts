import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EcommerceStore, EcommercePlatform } from '../entities/store.entity';
import * as crypto from 'crypto';

export interface ConnectStoreDto {
    platform: EcommercePlatform;
    storeName: string;
    storeUrl: string;
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    settings?: Record<string, any>;
}

@Injectable()
export class StoresService {
    private readonly logger = new Logger(StoresService.name);

    constructor(
        @InjectRepository(EcommerceStore)
        private readonly storeRepository: Repository<EcommerceStore>,
    ) { }

    async connectStore(tenantId: string, dto: ConnectStoreDto): Promise<EcommerceStore> {
        // Check if store already connected
        const existing = await this.storeRepository.findOne({
            where: { tenantId, storeUrl: dto.storeUrl },
        });

        if (existing) {
            throw new BadRequestException('This store is already connected');
        }

        // Generate webhook secret
        const webhookSecret = crypto.randomBytes(32).toString('hex');

        const store = this.storeRepository.create({
            tenantId,
            platform: dto.platform,
            storeName: dto.storeName,
            storeUrl: this.normalizeUrl(dto.storeUrl),
            apiKey: dto.apiKey,
            apiSecret: dto.apiSecret,
            accessToken: dto.accessToken,
            webhookSecret,
            settings: {
                autoSyncProducts: true,
                syncInterval: 60,
                currency: 'INR',
                ...dto.settings,
            },
        });

        await this.storeRepository.save(store);
        this.logger.log(`Store connected: ${store.storeName} (${store.platform})`);

        return store;
    }

    async findAll(tenantId: string): Promise<EcommerceStore[]> {
        return this.storeRepository.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    async findById(tenantId: string, storeId: string): Promise<EcommerceStore> {
        const store = await this.storeRepository.findOne({
            where: { id: storeId, tenantId },
        });

        if (!store) {
            throw new NotFoundException('Store not found');
        }

        return store;
    }

    async findByWebhookSecret(webhookSecret: string): Promise<EcommerceStore | null> {
        return this.storeRepository.findOne({
            where: { webhookSecret },
        });
    }

    async updateStore(
        tenantId: string,
        storeId: string,
        updates: Partial<EcommerceStore>,
    ): Promise<EcommerceStore> {
        const store = await this.findById(tenantId, storeId);

        Object.assign(store, updates);
        await this.storeRepository.save(store);

        return store;
    }

    async disconnect(tenantId: string, storeId: string): Promise<void> {
        const store = await this.findById(tenantId, storeId);
        store.isActive = false;
        await this.storeRepository.save(store);

        this.logger.log(`Store disconnected: ${store.storeName}`);
    }

    async updateSyncTimestamp(storeId: string): Promise<void> {
        await this.storeRepository.update(storeId, {
            lastSyncAt: new Date(),
        });
    }

    async incrementOrderCount(storeId: string): Promise<void> {
        await this.storeRepository.increment({ id: storeId }, 'ordersCount', 1);
    }

    async incrementProductCount(storeId: string, count: number = 1): Promise<void> {
        await this.storeRepository.increment({ id: storeId }, 'productsCount', count);
    }

    private normalizeUrl(url: string): string {
        let normalized = url.toLowerCase().trim();

        // Remove trailing slashes
        while (normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }

        // Add https if no protocol
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            normalized = 'https://' + normalized;
        }

        return normalized;
    }
}
