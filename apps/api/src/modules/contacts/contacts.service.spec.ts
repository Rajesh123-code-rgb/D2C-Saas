import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContactsService } from './contacts.service';
import { Contact, ContactSource, LifecycleStage } from './contact.entity';

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
    createQueryBuilder: jest.fn(),
});

describe('ContactsService', () => {
    let service: ContactsService;
    let contactRepository: any;

    beforeEach(async () => {
        contactRepository = createMockRepository();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContactsService,
                { provide: getRepositoryToken(Contact), useValue: contactRepository },
            ],
        }).compile();

        service = module.get<ContactsService>(ContactsService);
    });

    const mockContact = (overrides: any = {}): any => ({
        id: 'contact-1',
        tenantId: 'tenant-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        optedInWhatsApp: true,
        optedInEmail: true,
        optedInSMS: false,
        source: ContactSource.MANUAL,
        lifecycleStage: LifecycleStage.LEAD,
        tags: ['vip', 'newsletter'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    });

    describe('findOne', () => {
        it('should return contact by id and tenantId', async () => {
            const contact = mockContact();
            contactRepository.findOne.mockResolvedValue(contact);

            const result = await service.findOne('contact-1', 'tenant-1');

            expect(result).toEqual(contact);
            expect(contactRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'contact-1', tenantId: 'tenant-1' },
            });
        });

        it('should return null for non-existent contact', async () => {
            contactRepository.findOne.mockResolvedValue(null);

            const result = await service.findOne('non-existent', 'tenant-1');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should create contact with all fields', async () => {
            const data = {
                name: 'New Contact',
                email: 'new@example.com',
                phone: '+9876543210',
            };
            const newContact = mockContact({ ...data, id: 'new-contact' });
            contactRepository.create.mockReturnValue(newContact);
            contactRepository.save.mockResolvedValue(newContact);

            const result = await service.create('tenant-1', data);

            expect(contactRepository.save).toHaveBeenCalled();
        });
    });

    describe('findOrCreateByPhone', () => {
        it('should return existing contact if found', async () => {
            const existingContact = mockContact({ phone: '+1234567890' });
            contactRepository.findOne.mockResolvedValue(existingContact);

            const result = await service.findOrCreateByPhone('+1234567890', 'tenant-1');

            expect(result).toEqual(existingContact);
            expect(contactRepository.save).not.toHaveBeenCalled();
        });

        it('should create new contact if not found', async () => {
            contactRepository.findOne.mockResolvedValue(null);
            const newContact = mockContact({ phone: '+9999999999' });
            contactRepository.create.mockReturnValue(newContact);
            contactRepository.save.mockResolvedValue(newContact);

            const result = await service.findOrCreateByPhone('+9999999999', 'tenant-1', { name: 'New' });

            expect(result).toEqual(newContact);
            expect(contactRepository.save).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should update contact fields', async () => {
            const contact = mockContact();
            contactRepository.update.mockResolvedValue({ affected: 1 });
            contactRepository.findOne.mockResolvedValue({ ...contact, name: 'Updated Name' });

            await service.update('contact-1', 'tenant-1', { name: 'Updated Name' });

            expect(contactRepository.update).toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('should delete contact by id and tenantId', async () => {
            contactRepository.delete.mockResolvedValue({ affected: 1 });

            await service.delete('contact-1', 'tenant-1');

            expect(contactRepository.delete).toHaveBeenCalledWith({
                id: 'contact-1',
                tenantId: 'tenant-1',
            });
        });
    });

    describe('updateTags', () => {
        it('should update tags for contact', async () => {
            const contact = mockContact({ tags: ['old'] });
            contactRepository.findOne.mockResolvedValue(contact);
            contactRepository.save.mockResolvedValue({ ...contact, tags: ['new', 'tags'] });

            const result = await service.updateTags('tenant-1', 'contact-1', ['new', 'tags']);

            expect(contactRepository.save).toHaveBeenCalled();
        });
    });
});
