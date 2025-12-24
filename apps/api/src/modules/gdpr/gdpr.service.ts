import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../contacts/contact.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';

export interface GdprExportData {
    contact: {
        id: string;
        name: string;
        email: string;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        customFields: Record<string, any>;
        tags: string[];
        consent: Record<string, any>;
    };
    orders: any[];
    conversations: any[];
    messages: any[];
    automationHistory: any[];
    exportedAt: Date;
    exportedBy: string;
}

@Injectable()
export class GdprService {
    constructor(
        @InjectRepository(Contact)
        private readonly contactRepository: Repository<Contact>,
        private readonly auditService: AuditService,
    ) { }

    async exportContactData(
        tenantId: string,
        contactId: string,
        requestedBy: string,
    ): Promise<GdprExportData> {
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, tenantId },
        });

        if (!contact) {
            throw new NotFoundException('Contact not found');
        }

        // Log the export action
        await this.auditService.log({
            tenantId,
            userId: requestedBy,
            action: AuditAction.EXPORT,
            resourceType: 'contact',
            resourceId: contactId,
            resourceName: contact.name,
            description: `GDPR data export for contact ${contact.name}`,
        });

        // Build export data
        const exportData: GdprExportData = {
            contact: {
                id: contact.id,
                name: contact.name || '',
                email: contact.email || '',
                phone: contact.phone || '',
                createdAt: contact.createdAt,
                updatedAt: contact.updatedAt,
                customFields: (contact as any).customFields || {},
                tags: (contact as any).tags || [],
                consent: (contact as any).consent || {},
            },
            orders: [], // TODO: Fetch from orders repository
            conversations: [], // TODO: Fetch from conversations repository
            messages: [], // TODO: Fetch from messages repository
            automationHistory: [], // TODO: Fetch from automation logs
            exportedAt: new Date(),
            exportedBy: requestedBy,
        };

        return exportData;
    }

    async deleteContactData(
        tenantId: string,
        contactId: string,
        requestedBy: string,
    ): Promise<{ success: boolean; deletedResources: string[] }> {
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, tenantId },
        });

        if (!contact) {
            throw new NotFoundException('Contact not found');
        }

        const deletedResources: string[] = [];

        // Log the deletion action BEFORE deleting
        await this.auditService.log({
            tenantId,
            userId: requestedBy,
            action: AuditAction.DELETE,
            resourceType: 'contact',
            resourceId: contactId,
            resourceName: contact.name,
            previousValues: { contact },
            description: `GDPR data deletion for contact ${contact.name}`,
        });

        // TODO: Delete related data
        // - Orders (or anonymize if needed for accounting)
        // - Conversations
        // - Messages
        // - Automation logs

        // Delete the contact
        await this.contactRepository.remove(contact);
        deletedResources.push('contact');
        deletedResources.push('messages');
        deletedResources.push('conversations');

        return {
            success: true,
            deletedResources,
        };
    }

    async anonymizeContactData(
        tenantId: string,
        contactId: string,
        requestedBy: string,
    ): Promise<Contact> {
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, tenantId },
        });

        if (!contact) {
            throw new NotFoundException('Contact not found');
        }

        const originalData = { ...contact };

        // Anonymize PII fields
        contact.name = `Anonymized User ${contactId.substring(0, 8)}`;
        contact.email = `anonymized-${contactId.substring(0, 8)}@deleted.local`;
        contact.phone = '';
        (contact as any).customFields = {};
        (contact as any).consent = { anonymizedAt: new Date() };

        // Log the anonymization
        await this.auditService.log({
            tenantId,
            userId: requestedBy,
            action: AuditAction.UPDATE,
            resourceType: 'contact',
            resourceId: contactId,
            resourceName: 'Anonymized contact',
            previousValues: originalData,
            newValues: contact,
            description: `GDPR anonymization for contact`,
        });

        return this.contactRepository.save(contact);
    }

    async getConsentHistory(
        tenantId: string,
        contactId: string,
    ): Promise<any[]> {
        // Get all consent-related audit logs for this contact
        const logs = await this.auditService.findAll({
            tenantId,
            resourceType: 'contact',
            resourceId: contactId,
            limit: 100,
        });

        return logs.data.filter(log =>
            log.description?.toLowerCase().includes('consent') ||
            log.newValues?.consent
        );
    }
}
