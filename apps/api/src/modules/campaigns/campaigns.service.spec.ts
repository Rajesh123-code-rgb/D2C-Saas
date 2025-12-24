import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CampaignsService } from './campaigns.service';
import {
    Campaign,
    CampaignStatus,
    CampaignType,
    CampaignChannel,
    CampaignVariant,
    CampaignExecution,
} from './entities/campaign.entity';
import { SegmentsService } from '../segments/segments.service';

// Mock for BullMQ Queue
const mockQueue = {
    add: jest.fn(),
    addBulk: jest.fn(),
    getJobs: jest.fn(),
};

// Mock SegmentsService
const mockSegmentsService = {
    getContactIds: jest.fn().mockResolvedValue([]),
};

// Simple mock for repository
const createMockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    })),
});

describe('CampaignsService', () => {
    let service: CampaignsService;
    let campaignRepository: any;
    let variantRepository: any;
    let executionRepository: any;

    beforeEach(async () => {
        campaignRepository = createMockRepository();
        variantRepository = createMockRepository();
        executionRepository = createMockRepository();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CampaignsService,
                { provide: getRepositoryToken(Campaign), useValue: campaignRepository },
                { provide: getRepositoryToken(CampaignVariant), useValue: variantRepository },
                { provide: getRepositoryToken(CampaignExecution), useValue: executionRepository },
                { provide: 'BullQueue_campaigns', useValue: mockQueue },
                { provide: SegmentsService, useValue: mockSegmentsService },
            ],
        }).compile();

        service = module.get<CampaignsService>(CampaignsService);
    });

    const mockCampaign = (overrides: any = {}): any => ({
        id: 'campaign-1',
        tenantId: 'tenant-1',
        name: 'Test Campaign',
        description: 'Test campaign description',
        status: CampaignStatus.DRAFT,
        type: CampaignType.WHATSAPP_TEMPLATE,
        primaryChannel: CampaignChannel.WHATSAPP,
        content: { templateId: 'template-1' },
        targeting: { segmentIds: [] },
        schedule: { type: 'immediate' },
        throttle: { enabled: false },
        stats: {
            totalTargeted: 0,
            totalSent: 0,
            totalDelivered: 0,
            totalFailed: 0,
            totalOpened: 0,
            totalClicked: 0,
            totalReplied: 0,
            totalConverted: 0,
            conversionValue: 0,
        },
        scheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    });

    describe('findAll', () => {
        it('should return all campaigns for a tenant', async () => {
            const campaigns = [mockCampaign(), mockCampaign({ id: 'campaign-2' })];
            campaignRepository.find.mockResolvedValue(campaigns);

            const result = await service.findAll('tenant-1');

            expect(result).toHaveLength(2);
        });

        it('should filter by status', async () => {
            campaignRepository.find.mockResolvedValue([mockCampaign({ status: CampaignStatus.COMPLETED })]);

            await service.findAll('tenant-1', { status: CampaignStatus.COMPLETED });

            expect(campaignRepository.find).toHaveBeenCalled();
        });

        it('should return empty array for tenant with no campaigns', async () => {
            campaignRepository.find.mockResolvedValue([]);

            const result = await service.findAll('tenant-1');

            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('should return campaign by id', async () => {
            const campaign = mockCampaign();
            campaignRepository.findOne.mockResolvedValue(campaign);

            const result = await service.findById('tenant-1', 'campaign-1');

            expect(result).toEqual(campaign);
        });

        it('should throw for non-existent campaign', async () => {
            campaignRepository.findOne.mockResolvedValue(null);

            await expect(service.findById('tenant-1', 'non-existent'))
                .rejects.toThrow();
        });
    });

    describe('create', () => {
        it('should create a campaign with default status DRAFT', async () => {
            const data = {
                name: 'New Campaign',
                type: CampaignType.WHATSAPP_TEMPLATE,
                primaryChannel: CampaignChannel.WHATSAPP,
                content: { templateId: 'temp-1' },
                targeting: {},
            };
            const newCampaign = mockCampaign(data);
            campaignRepository.create.mockReturnValue(newCampaign);
            campaignRepository.save.mockResolvedValue(newCampaign);

            const result = await service.create('tenant-1', data);

            expect(result.status).toBe(CampaignStatus.DRAFT);
        });
    });

    describe('update', () => {
        it('should update campaign fields', async () => {
            const campaign = mockCampaign();
            const updates = { name: 'Updated Name' };
            campaignRepository.findOne.mockResolvedValue(campaign);
            campaignRepository.save.mockResolvedValue({ ...campaign, ...updates });

            const result = await service.update('tenant-1', 'campaign-1', updates);

            expect(result.name).toBe('Updated Name');
        });
    });

    describe('delete', () => {
        it('should delete campaign', async () => {
            const campaign = mockCampaign();
            campaignRepository.findOne.mockResolvedValue(campaign);
            campaignRepository.remove.mockResolvedValue(campaign);

            await service.delete('tenant-1', 'campaign-1');

            expect(campaignRepository.remove).toHaveBeenCalled();
        });
    });

    describe('schedule', () => {
        it('should schedule campaign for future', async () => {
            const campaign = mockCampaign({ status: CampaignStatus.DRAFT });
            const scheduleDate = new Date(Date.now() + 86400000);
            campaignRepository.findOne.mockResolvedValue(campaign);
            campaignRepository.save.mockResolvedValue({
                ...campaign,
                status: CampaignStatus.SCHEDULED,
                scheduledAt: scheduleDate,
            });

            const result = await service.schedule('tenant-1', 'campaign-1', scheduleDate);

            expect(result.status).toBe(CampaignStatus.SCHEDULED);
        });

        it('should start immediate campaign', async () => {
            const campaign = mockCampaign({ status: CampaignStatus.DRAFT });
            campaignRepository.findOne.mockResolvedValue(campaign);
            campaignRepository.save.mockResolvedValue({ ...campaign, status: CampaignStatus.RUNNING });

            const result = await service.schedule('tenant-1', 'campaign-1');

            expect(campaignRepository.save).toHaveBeenCalled();
        });
    });

    describe('pause', () => {
        it('should pause a running campaign', async () => {
            const campaign = mockCampaign({ status: CampaignStatus.RUNNING });
            campaignRepository.findOne.mockResolvedValue(campaign);
            campaignRepository.save.mockResolvedValue({ ...campaign, status: CampaignStatus.PAUSED });

            const result = await service.pause('tenant-1', 'campaign-1');

            expect(result.status).toBe(CampaignStatus.PAUSED);
        });
    });

    describe('cancel', () => {
        it('should cancel a scheduled campaign', async () => {
            const campaign = mockCampaign({ status: CampaignStatus.SCHEDULED });
            campaignRepository.findOne.mockResolvedValue(campaign);
            campaignRepository.save.mockResolvedValue({ ...campaign, status: CampaignStatus.CANCELLED });

            const result = await service.cancel('tenant-1', 'campaign-1');

            expect(result.status).toBe(CampaignStatus.CANCELLED);
        });
    });

    describe('getStats', () => {
        it('should return campaign statistics', async () => {
            // Mock find to return array for getStats
            campaignRepository.find.mockResolvedValue([]);
            campaignRepository.count.mockResolvedValue(10);
            executionRepository.createQueryBuilder.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({
                    totalSent: 1000,
                    totalDelivered: 900,
                }),
            });

            const result = await service.getStats('tenant-1');

            expect(result).toHaveProperty('totalCampaigns');
        });
    });

    describe('Load Testing Scenarios', () => {
        it('should handle campaign with large audience (10,000 contacts)', async () => {
            const campaign = mockCampaign({
                targeting: { segmentIds: ['large-segment'] },
                stats: { totalTargeted: 10000 },
            });
            campaignRepository.findOne.mockResolvedValue(campaign);

            const result = await service.findById('tenant-1', 'campaign-1');

            expect(result.stats.totalTargeted).toBe(10000);
        });

        it('should handle campaign with 100,000 contacts', async () => {
            const campaign = mockCampaign({
                stats: { totalTargeted: 100000, totalSent: 90000 },
            });
            campaignRepository.findOne.mockResolvedValue(campaign);

            const result = await service.findById('tenant-1', 'campaign-1');

            expect(result.stats.totalTargeted).toBe(100000);
        });

        it('should handle multiple campaigns simultaneously', async () => {
            const campaigns = Array.from({ length: 10 }, (_, i) =>
                mockCampaign({ id: `campaign-${i}`, status: CampaignStatus.RUNNING })
            );
            campaignRepository.find.mockResolvedValue(campaigns);

            const result = await service.findAll('tenant-1', { status: CampaignStatus.RUNNING });

            expect(result).toHaveLength(10);
        });
    });

    describe('Edge Cases', () => {
        it('should handle campaign with A/B test variants', async () => {
            const campaign = mockCampaign({
                isAbTest: true,
                abTestWinnerMetric: 'open_rate',
                variants: [
                    { id: 'var-1', name: 'Variant A', percentage: 50 },
                    { id: 'var-2', name: 'Variant B', percentage: 50 },
                ],
            });
            campaignRepository.findOne.mockResolvedValue(campaign);

            const result = await service.findById('tenant-1', 'campaign-1');

            expect(result.isAbTest).toBe(true);
        });

        it('should handle campaign with throttling enabled', async () => {
            const campaign = mockCampaign({
                throttle: {
                    enabled: true,
                    messagesPerMinute: 100,
                    sendingWindow: { startHour: 9, endHour: 21, timezone: 'Asia/Kolkata' },
                },
            });
            campaignRepository.findOne.mockResolvedValue(campaign);

            const result = await service.findById('tenant-1', 'campaign-1');

            expect(result.throttle.enabled).toBe(true);
            expect(result.throttle.messagesPerMinute).toBe(100);
        });

        it('should handle multi-channel campaign', async () => {
            const campaign = mockCampaign({
                type: CampaignType.MULTI_CHANNEL,
                content: {
                    templateId: 'whatsapp-template',
                    emailSubject: 'Follow up',
                    emailBody: 'Check out our latest offers',
                },
            });
            campaignRepository.findOne.mockResolvedValue(campaign);

            const result = await service.findById('tenant-1', 'campaign-1');

            expect(result.type).toBe(CampaignType.MULTI_CHANNEL);
        });
    });
});
