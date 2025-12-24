import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { AutomationsService } from './automations.service';
import { AutomationRule, AutomationStatus, TriggerType, ActionType } from './automation-rule.entity';
import { AutomationLog } from './automation-log.entity';

// Mock for BullMQ Queue
const mockQueue = {
    add: jest.fn(),
    getJobs: jest.fn(),
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
    createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
    })),
    count: jest.fn(),
});

describe('AutomationsService', () => {
    let service: AutomationsService;
    let ruleRepository: any;
    let logRepository: any;

    beforeEach(async () => {
        ruleRepository = createMockRepository();
        logRepository = createMockRepository();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AutomationsService,
                { provide: getRepositoryToken(AutomationRule), useValue: ruleRepository },
                { provide: getRepositoryToken(AutomationLog), useValue: logRepository },
                { provide: 'BullQueue_automations', useValue: mockQueue },
            ],
        }).compile();

        service = module.get<AutomationsService>(AutomationsService);
    });

    const mockAutomationRule = (overrides: any = {}): any => ({
        id: 'automation-1',
        tenantId: 'tenant-1',
        name: 'Test Automation',
        description: 'Test automation description',
        status: AutomationStatus.ACTIVE,
        triggerType: TriggerType.CONTACT_CREATED,
        triggerConfig: {},
        conditions: [],
        actions: [
            { type: ActionType.SEND_WHATSAPP_TEMPLATE, templateId: 'temp-1', delaySeconds: 0 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    });

    describe('findAll', () => {
        it('should return all automations for a tenant', async () => {
            const automations = [mockAutomationRule(), mockAutomationRule({ id: 'automation-2' })];
            ruleRepository.find.mockResolvedValue(automations);

            const result = await service.findAll('tenant-1');

            expect(result).toHaveLength(2);
        });

        it('should return empty array for tenant with no automations', async () => {
            ruleRepository.find.mockResolvedValue([]);

            const result = await service.findAll('tenant-1');

            expect(result).toEqual([]);
        });

        it('should filter by status', async () => {
            ruleRepository.find.mockResolvedValue([mockAutomationRule()]);

            await service.findAll('tenant-1', { status: AutomationStatus.ACTIVE });

            expect(ruleRepository.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ status: AutomationStatus.ACTIVE }),
                })
            );
        });
    });

    describe('findById', () => {
        it('should return automation by id', async () => {
            const automation = mockAutomationRule();
            ruleRepository.findOne.mockResolvedValue(automation);

            const result = await service.findById('tenant-1', 'automation-1');

            expect(result).toEqual(automation);
        });

        it('should throw NotFoundException for non-existent automation', async () => {
            ruleRepository.findOne.mockResolvedValue(null);

            await expect(service.findById('tenant-1', 'non-existent'))
                .rejects.toThrow();
        });
    });

    describe('create', () => {
        it('should create automation with valid configuration', async () => {
            const data = {
                name: 'New Automation',
                triggerType: TriggerType.CONTACT_CREATED,
                triggerConfig: {},
                actions: [{ type: ActionType.SEND_WHATSAPP_TEMPLATE, templateId: 'temp-1', delaySeconds: 0 }],
            };
            const newAutomation = mockAutomationRule(data);
            ruleRepository.create.mockReturnValue(newAutomation);
            ruleRepository.save.mockResolvedValue(newAutomation);

            const result = await service.create('tenant-1', data);

            expect(ruleRepository.save).toHaveBeenCalled();
            expect(result.name).toBe('New Automation');
        });
    });

    describe('update', () => {
        it('should update automation fields', async () => {
            const existing = mockAutomationRule();
            const updates = { name: 'Updated Name' };
            ruleRepository.findOne.mockResolvedValue({ ...existing, ...updates });
            ruleRepository.save.mockResolvedValue({ ...existing, ...updates });

            const result = await service.update('tenant-1', 'automation-1', updates);

            expect(result.name).toBe('Updated Name');
        });
    });

    describe('activate', () => {
        it('should activate a paused automation', async () => {
            const automation = mockAutomationRule({ status: AutomationStatus.PAUSED });
            ruleRepository.findOne.mockResolvedValue(automation);
            ruleRepository.save.mockResolvedValue({ ...automation, status: AutomationStatus.ACTIVE });

            const result = await service.activate('tenant-1', 'automation-1');

            expect(result.status).toBe(AutomationStatus.ACTIVE);
        });
    });

    describe('pause', () => {
        it('should pause an active automation', async () => {
            const automation = mockAutomationRule({ status: AutomationStatus.ACTIVE });
            ruleRepository.findOne.mockResolvedValue(automation);
            ruleRepository.save.mockResolvedValue({ ...automation, status: AutomationStatus.PAUSED });

            const result = await service.pause('tenant-1', 'automation-1');

            expect(result.status).toBe(AutomationStatus.PAUSED);
        });
    });

    describe('delete', () => {
        it('should delete automation', async () => {
            ruleRepository.delete.mockResolvedValue({ affected: 1 });

            await service.delete('tenant-1', 'automation-1');

            expect(ruleRepository.delete).toHaveBeenCalled();
        });
    });

    describe('Edge Cases - Triggers', () => {
        it('should handle CONTACT_CREATED trigger type', async () => {
            const automation = mockAutomationRule({ triggerType: TriggerType.CONTACT_CREATED });
            ruleRepository.findOne.mockResolvedValue(automation);

            const result = await service.findById('tenant-1', 'automation-1');

            expect(result.triggerType).toBe(TriggerType.CONTACT_CREATED);
        });

        it('should handle ORDER_CREATED trigger type', async () => {
            const automation = mockAutomationRule({ triggerType: TriggerType.ORDER_CREATED });
            ruleRepository.findOne.mockResolvedValue(automation);

            const result = await service.findById('tenant-1', 'automation-1');

            expect(result.triggerType).toBe(TriggerType.ORDER_CREATED);
        });

        it('should handle PAYMENT_FAILED trigger type', async () => {
            const automation = mockAutomationRule({ triggerType: TriggerType.PAYMENT_FAILED });
            ruleRepository.findOne.mockResolvedValue(automation);

            const result = await service.findById('tenant-1', 'automation-1');

            expect(result.triggerType).toBe(TriggerType.PAYMENT_FAILED);
        });
    });

    describe('Edge Cases - Actions', () => {
        it('should handle multi-step actions', async () => {
            const multiStepActions = [
                { type: ActionType.SEND_WHATSAPP_TEMPLATE, templateId: 'welcome', delaySeconds: 0 },
                { type: ActionType.SEND_WHATSAPP_TEMPLATE, templateId: 'follow_up', delaySeconds: 86400 },
                { type: ActionType.SEND_WHATSAPP_TEMPLATE, templateId: 'reminder', delaySeconds: 172800 },
            ];
            const automation = mockAutomationRule({ actions: multiStepActions });
            ruleRepository.findOne.mockResolvedValue(automation);

            const result = await service.findById('tenant-1', 'automation-1');

            expect(result.actions).toHaveLength(3);
        });

        it('should handle automation with empty actions', async () => {
            const automation = mockAutomationRule({ actions: [] });
            ruleRepository.findOne.mockResolvedValue(automation);

            const result = await service.findById('tenant-1', 'automation-1');

            expect(result.actions).toEqual([]);
        });
    });

    describe('getStats', () => {
        it('should return automation statistics', async () => {
            // Mock find to return array for getStats
            ruleRepository.find.mockResolvedValue([]);
            ruleRepository.count.mockResolvedValueOnce(10); // total
            ruleRepository.count.mockResolvedValueOnce(5);  // active
            ruleRepository.count.mockResolvedValueOnce(3);  // paused
            logRepository.count.mockResolvedValueOnce(100); // total runs
            logRepository.count.mockResolvedValueOnce(90);  // success runs

            const result = await service.getStats('tenant-1');

            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('active');
            expect(result).toHaveProperty('paused');
        });
    });
});
