import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
    Campaign,
    CampaignStatus,
    CampaignType,
    CampaignChannel,
    CampaignVariant,
    CampaignExecution,
    CampaignStats,
} from './entities/campaign.entity';
import { SegmentsService } from '../segments/segments.service';

export interface CreateCampaignDto {
    name: string;
    description?: string;
    type: CampaignType;
    primaryChannel: CampaignChannel;
    content: any;
    targeting: any;
    schedule?: any;
    throttle?: any;
    isAbTest?: boolean;
    abTestWinnerMetric?: string;
    abTestSampleSize?: number;
    variants?: Array<{ name: string; content: any; percentage: number }>;
}

export interface CampaignStatsResponse {
    totalCampaigns: number;
    activeCampaigns: number;
    completedCampaigns: number;
    totalSent: number;
    totalDelivered: number;
    avgDeliveryRate: number;
    avgOpenRate: number;
    avgClickRate: number;
    totalConversions: number;
    totalConversionValue: number;
}

@Injectable()
export class CampaignsService {
    private readonly logger = new Logger(CampaignsService.name);

    constructor(
        @InjectRepository(Campaign)
        private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(CampaignVariant)
        private readonly variantRepository: Repository<CampaignVariant>,
        @InjectRepository(CampaignExecution)
        private readonly executionRepository: Repository<CampaignExecution>,
        @InjectQueue('campaigns')
        private readonly campaignsQueue: Queue,
        private readonly segmentsService: SegmentsService,
    ) { }

    async create(tenantId: string, dto: CreateCampaignDto): Promise<Campaign> {
        const campaign = this.campaignRepository.create({
            tenantId,
            name: dto.name,
            description: dto.description,
            type: dto.type,
            primaryChannel: dto.primaryChannel,
            content: dto.content,
            targeting: dto.targeting,
            schedule: dto.schedule,
            throttle: dto.throttle,
            isAbTest: dto.isAbTest || false,
            abTestWinnerMetric: dto.abTestWinnerMetric as any,
            abTestSampleSize: dto.abTestSampleSize,
            status: CampaignStatus.DRAFT,
            stats: this.getEmptyStats(),
        });

        await this.campaignRepository.save(campaign);

        // Create variants for A/B test
        if (dto.isAbTest && dto.variants) {
            for (const variant of dto.variants) {
                await this.variantRepository.save({
                    campaignId: campaign.id,
                    name: variant.name,
                    content: variant.content,
                    percentage: variant.percentage,
                    stats: this.getEmptyStats(),
                });
            }
        }

        this.logger.log(`Campaign created: ${campaign.name}`);
        return this.findById(tenantId, campaign.id);
    }

    async findAll(
        tenantId: string,
        options: { status?: CampaignStatus; type?: CampaignType } = {},
    ): Promise<Campaign[]> {
        const where: any = { tenantId };
        if (options.status) where.status = options.status;
        if (options.type) where.type = options.type;

        return this.campaignRepository.find({
            where,
            relations: ['variants'],
            order: { createdAt: 'DESC' },
        });
    }

    async findById(tenantId: string, id: string): Promise<Campaign> {
        const campaign = await this.campaignRepository.findOne({
            where: { id, tenantId },
            relations: ['variants'],
        });

        if (!campaign) {
            throw new NotFoundException('Campaign not found');
        }

        return campaign;
    }

    async update(
        tenantId: string,
        id: string,
        updates: Partial<CreateCampaignDto>,
    ): Promise<Campaign> {
        const campaign = await this.findById(tenantId, id);

        if (campaign.status === CampaignStatus.RUNNING) {
            throw new Error('Cannot update a running campaign');
        }

        Object.assign(campaign, updates);
        await this.campaignRepository.save(campaign);

        return this.findById(tenantId, id);
    }

    async delete(tenantId: string, id: string): Promise<void> {
        const campaign = await this.findById(tenantId, id);

        if (campaign.status === CampaignStatus.RUNNING) {
            throw new Error('Cannot delete a running campaign');
        }

        await this.campaignRepository.remove(campaign);
    }

    async schedule(tenantId: string, id: string, scheduledAt?: Date): Promise<Campaign> {
        const campaign = await this.findById(tenantId, id);

        if (scheduledAt) {
            campaign.scheduledAt = scheduledAt;
            campaign.status = CampaignStatus.SCHEDULED;
            campaign.schedule = { ...campaign.schedule, type: 'scheduled', scheduledAt };
        } else {
            campaign.status = CampaignStatus.SCHEDULED;
            campaign.schedule = { ...campaign.schedule, type: 'immediate' };
        }

        await this.campaignRepository.save(campaign);

        // Queue the campaign for execution
        const delay = scheduledAt ? new Date(scheduledAt).getTime() - Date.now() : 0;

        await this.campaignsQueue.add(
            'execute-campaign',
            { campaignId: id, tenantId },
            { delay: Math.max(0, delay) },
        );

        this.logger.log(`Campaign scheduled: ${campaign.name}`);
        return campaign;
    }

    async pause(tenantId: string, id: string): Promise<Campaign> {
        const campaign = await this.findById(tenantId, id);
        campaign.status = CampaignStatus.PAUSED;
        await this.campaignRepository.save(campaign);
        return campaign;
    }

    async cancel(tenantId: string, id: string): Promise<Campaign> {
        const campaign = await this.findById(tenantId, id);
        campaign.status = CampaignStatus.CANCELLED;
        await this.campaignRepository.save(campaign);
        return campaign;
    }

    /**
     * Start campaign execution
     */
    async startExecution(campaignId: string): Promise<void> {
        const campaign = await this.campaignRepository.findOne({
            where: { id: campaignId },
            relations: ['variants'],
        });

        if (!campaign) throw new Error('Campaign not found');

        // Mark as running
        campaign.status = CampaignStatus.RUNNING;
        campaign.startedAt = new Date();
        await this.campaignRepository.save(campaign);

        // Get target contacts
        const contactIds = await this.getTargetContacts(campaign);
        campaign.stats.totalTargeted = contactIds.length;
        await this.campaignRepository.save(campaign);

        this.logger.log(`Campaign ${campaign.name} started with ${contactIds.length} contacts`);

        // Create execution records and queue them
        for (const contactId of contactIds) {
            const variant = campaign.isAbTest
                ? this.selectVariant(campaign.variants)
                : null;

            const execution = await this.executionRepository.save({
                campaignId: campaign.id,
                variantId: variant?.id,
                contactId,
                channel: campaign.primaryChannel,
                status: 'pending',
            });

            // Queue for delivery with throttling
            await this.campaignsQueue.add(
                'send-message',
                {
                    executionId: execution.id,
                    campaignId: campaign.id,
                    contactId,
                    content: variant?.content || campaign.content,
                },
                { delay: this.calculateDelay(campaign, contactIds.indexOf(contactId)) },
            );
        }
    }

    /**
     * Get target contacts based on campaign targeting
     */
    private async getTargetContacts(campaign: Campaign): Promise<string[]> {
        const targeting = campaign.targeting || {};
        let contactIds: string[] = [];

        // Get contacts from segments
        if (targeting.segmentIds && targeting.segmentIds.length > 0) {
            for (const segmentId of targeting.segmentIds) {
                const ids = await this.segmentsService.getContactIds(campaign.tenantId, segmentId);
                contactIds = [...contactIds, ...ids];
            }
        }

        // Add specific contact IDs
        if (targeting.contactIds) {
            contactIds = [...contactIds, ...targeting.contactIds];
        }

        // Remove duplicates
        contactIds = [...new Set(contactIds)];

        // Exclude segments
        if (targeting.excludeSegmentIds) {
            for (const segmentId of targeting.excludeSegmentIds) {
                const excludeIds = await this.segmentsService.getContactIds(campaign.tenantId, segmentId);
                contactIds = contactIds.filter((id) => !excludeIds.includes(id));
            }
        }

        // Exclude specific contacts
        if (targeting.excludeContactIds) {
            contactIds = contactIds.filter((id) => !targeting.excludeContactIds.includes(id));
        }

        return contactIds;
    }

    /**
     * Select variant for A/B test
     */
    private selectVariant(variants: CampaignVariant[]): CampaignVariant {
        const random = Math.random() * 100;
        let cumulative = 0;

        for (const variant of variants) {
            cumulative += Number(variant.percentage);
            if (random <= cumulative) {
                return variant;
            }
        }

        return variants[0];
    }

    /**
     * Calculate delay for throttling
     */
    private calculateDelay(campaign: Campaign, index: number): number {
        const throttle = campaign.throttle;
        if (!throttle?.enabled) return 0;

        if (throttle.messagesPerMinute) {
            const delayPerMessage = 60000 / throttle.messagesPerMinute;
            return index * delayPerMessage;
        }

        if (throttle.messagesPerHour) {
            const delayPerMessage = 3600000 / throttle.messagesPerHour;
            return index * delayPerMessage;
        }

        return 0;
    }

    /**
     * Update execution status
     */
    async updateExecutionStatus(
        executionId: string,
        status: string,
        data?: { externalMessageId?: string; errorMessage?: string },
    ): Promise<void> {
        const execution = await this.executionRepository.findOne({
            where: { id: executionId },
        });

        if (!execution) return;

        execution.status = status as any;

        if (status === 'sent') execution.sentAt = new Date();
        if (status === 'delivered') execution.deliveredAt = new Date();
        if (status === 'opened') execution.openedAt = new Date();
        if (status === 'clicked') execution.clickedAt = new Date();
        if (status === 'replied') execution.repliedAt = new Date();
        if (status === 'failed') execution.errorMessage = data?.errorMessage || 'Unknown error';
        if (data?.externalMessageId) execution.externalMessageId = data.externalMessageId;

        await this.executionRepository.save(execution);

        // Update campaign stats
        await this.updateCampaignStats(execution.campaignId);
    }

    /**
     * Update campaign stats
     */
    async updateCampaignStats(campaignId: string): Promise<void> {
        const executions = await this.executionRepository.find({
            where: { campaignId },
        });

        const stats: CampaignStats = {
            totalTargeted: executions.length,
            totalSent: executions.filter((e) => e.sentAt).length,
            totalDelivered: executions.filter((e) => e.deliveredAt).length,
            totalFailed: executions.filter((e) => e.status === 'failed').length,
            totalOpened: executions.filter((e) => e.openedAt).length,
            totalClicked: executions.filter((e) => e.clickedAt).length,
            totalReplied: executions.filter((e) => e.repliedAt).length,
            totalConverted: executions.filter((e) => e.converted).length,
            conversionValue: executions.reduce((sum, e) => sum + (Number(e.conversionValue) || 0), 0),
        };

        await this.campaignRepository.update(campaignId, { stats });
    }

    /**
     * Get overall campaign stats for a tenant
     */
    async getStats(tenantId: string): Promise<CampaignStatsResponse> {
        const campaigns = await this.campaignRepository.find({ where: { tenantId } });

        const totalCampaigns = campaigns.length;
        const activeCampaigns = campaigns.filter((c) => c.status === CampaignStatus.RUNNING).length;
        const completedCampaigns = campaigns.filter((c) => c.status === CampaignStatus.COMPLETED).length;

        const aggregated = campaigns.reduce(
            (acc, c) => ({
                totalSent: acc.totalSent + (c.stats?.totalSent || 0),
                totalDelivered: acc.totalDelivered + (c.stats?.totalDelivered || 0),
                totalOpened: acc.totalOpened + (c.stats?.totalOpened || 0),
                totalClicked: acc.totalClicked + (c.stats?.totalClicked || 0),
                totalConverted: acc.totalConverted + (c.stats?.totalConverted || 0),
                conversionValue: acc.conversionValue + (c.stats?.conversionValue || 0),
            }),
            { totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, totalConverted: 0, conversionValue: 0 },
        );

        return {
            totalCampaigns,
            activeCampaigns,
            completedCampaigns,
            totalSent: aggregated.totalSent,
            totalDelivered: aggregated.totalDelivered,
            avgDeliveryRate: aggregated.totalSent > 0 ? (aggregated.totalDelivered / aggregated.totalSent) * 100 : 0,
            avgOpenRate: aggregated.totalDelivered > 0 ? (aggregated.totalOpened / aggregated.totalDelivered) * 100 : 0,
            avgClickRate: aggregated.totalOpened > 0 ? (aggregated.totalClicked / aggregated.totalOpened) * 100 : 0,
            totalConversions: aggregated.totalConverted,
            totalConversionValue: aggregated.conversionValue,
        };
    }

    /**
     * Get execution logs for a campaign
     */
    async getExecutions(
        tenantId: string,
        campaignId: string,
        options: { page?: number; limit?: number; status?: string } = {},
    ): Promise<{ executions: CampaignExecution[]; total: number }> {
        const campaign = await this.findById(tenantId, campaignId);

        const where: any = { campaignId };
        if (options.status) where.status = options.status;

        const [executions, total] = await this.executionRepository.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip: ((options.page || 1) - 1) * (options.limit || 20),
            take: options.limit || 20,
        });

        return { executions, total };
    }

    private getEmptyStats(): CampaignStats {
        return {
            totalTargeted: 0,
            totalSent: 0,
            totalDelivered: 0,
            totalFailed: 0,
            totalOpened: 0,
            totalClicked: 0,
            totalReplied: 0,
            totalConverted: 0,
            conversionValue: 0,
        };
    }
}
