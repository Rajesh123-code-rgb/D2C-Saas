import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UsageRecord, UsageResourceType, UsageSnapshot } from '../entities/usage.entity';

@Injectable()
export class UsageService {
    constructor(
        @InjectRepository(UsageRecord)
        private readonly usageRepository: Repository<UsageRecord>,
        @InjectRepository(UsageSnapshot)
        private readonly snapshotRepository: Repository<UsageSnapshot>,
    ) { }

    private getCurrentBillingPeriod(): string {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    async incrementUsage(
        tenantId: string,
        resourceType: UsageResourceType,
        quantity: number = 1,
    ): Promise<UsageRecord> {
        const billingPeriod = this.getCurrentBillingPeriod();

        // Try to find existing record for this period
        let record = await this.usageRepository.findOne({
            where: { tenantId, resourceType, billingPeriod },
        });

        if (record) {
            record.quantity += quantity;
            return this.usageRepository.save(record);
        }

        // Create new record
        record = this.usageRepository.create({
            tenantId,
            resourceType,
            quantity,
            billingPeriod,
        });

        return this.usageRepository.save(record);
    }

    async getUsageForPeriod(
        tenantId: string,
        billingPeriod?: string,
    ): Promise<Record<UsageResourceType, number>> {
        const period = billingPeriod || this.getCurrentBillingPeriod();

        const records = await this.usageRepository.find({
            where: { tenantId, billingPeriod: period },
        });

        const usage: Record<string, number> = {};
        for (const type of Object.values(UsageResourceType)) {
            usage[type] = 0;
        }

        for (const record of records) {
            usage[record.resourceType] = record.quantity;
        }

        return usage as Record<UsageResourceType, number>;
    }

    async getUsageHistory(
        tenantId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<UsageSnapshot[]> {
        return this.snapshotRepository.find({
            where: {
                tenantId,
                snapshotDate: Between(startDate, endDate),
            },
            order: { snapshotDate: 'ASC' },
        });
    }

    async createSnapshot(tenantId: string): Promise<UsageSnapshot> {
        const usage = await this.getUsageForPeriod(tenantId);

        const snapshot = this.snapshotRepository.create({
            tenantId,
            snapshotDate: new Date(),
            totalContacts: usage[UsageResourceType.CONTACTS] || 0,
            totalMessages: usage[UsageResourceType.MESSAGES] || 0,
            totalCampaigns: usage[UsageResourceType.CAMPAIGNS] || 0,
            totalAutomations: usage[UsageResourceType.AUTOMATIONS] || 0,
            totalAgents: usage[UsageResourceType.AGENTS] || 0,
            aiRequestsCount: usage[UsageResourceType.AI_REQUESTS] || 0,
        });

        return this.snapshotRepository.save(snapshot);
    }

    async getTotalUsage(tenantId: string): Promise<{
        contacts: number;
        messages: number;
        campaigns: number;
        automations: number;
        agents: number;
        aiRequests: number;
    }> {
        const usage = await this.getUsageForPeriod(tenantId);

        return {
            contacts: usage[UsageResourceType.CONTACTS] || 0,
            messages: usage[UsageResourceType.MESSAGES] || 0,
            campaigns: usage[UsageResourceType.CAMPAIGNS] || 0,
            automations: usage[UsageResourceType.AUTOMATIONS] || 0,
            agents: usage[UsageResourceType.AGENTS] || 0,
            aiRequests: usage[UsageResourceType.AI_REQUESTS] || 0,
        };
    }

    async resetUsageForPeriod(tenantId: string, billingPeriod: string): Promise<void> {
        await this.usageRepository.delete({ tenantId, billingPeriod });
    }
}
