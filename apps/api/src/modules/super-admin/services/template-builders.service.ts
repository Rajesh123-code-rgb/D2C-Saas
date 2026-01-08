import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationTemplate, WorkflowNode } from '../entities/automation-template.entity';
import { PremadeWhatsAppTemplate, WhatsAppButton } from '../entities/premade-whatsapp-template.entity';
import { PremadeEmailTemplate } from '../entities/premade-email-template.entity';

// DTOs
export interface CreateAutomationTemplateDto {
    name: string;
    description?: string;
    category: string;
    triggerType: string;
    nodes: WorkflowNode[];
    isActive?: boolean;
    allowedPlans?: string[];
}

export interface UpdateAutomationTemplateDto extends Partial<CreateAutomationTemplateDto> { }

export interface CreateWhatsAppTemplateDto {
    name: string;
    displayName: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;
    headerType: 'none' | 'text' | 'image' | 'video' | 'document';
    headerContent?: string;
    bodyText: string;
    footerText?: string;
    buttons?: WhatsAppButton[];
    status?: 'draft' | 'active' | 'archived';
    allowedPlans?: string[];
}

export interface UpdateWhatsAppTemplateDto extends Partial<CreateWhatsAppTemplateDto> { }

export interface CreateEmailTemplateDto {
    name: string;
    displayName: string;
    category: 'newsletter' | 'promotional' | 'transactional' | 'notification';
    subject: string;
    preheader?: string;
    htmlContent: string;
    textContent?: string;
    status?: 'draft' | 'active' | 'archived';
    allowedPlans?: string[];
}

export interface UpdateEmailTemplateDto extends Partial<CreateEmailTemplateDto> { }

@Injectable()
export class TemplateBuildersService {
    constructor(
        @InjectRepository(AutomationTemplate)
        private automationTemplateRepo: Repository<AutomationTemplate>,
        @InjectRepository(PremadeWhatsAppTemplate)
        private whatsappTemplateRepo: Repository<PremadeWhatsAppTemplate>,
        @InjectRepository(PremadeEmailTemplate)
        private emailTemplateRepo: Repository<PremadeEmailTemplate>,
    ) { }

    // ==================== AUTOMATION TEMPLATES ====================

    async getAllAutomationTemplates(filters?: { category?: string; isActive?: boolean }): Promise<AutomationTemplate[]> {
        const query = this.automationTemplateRepo.createQueryBuilder('template');

        if (filters?.category) {
            query.andWhere('template.category = :category', { category: filters.category });
        }
        if (filters?.isActive !== undefined) {
            query.andWhere('template.isActive = :isActive', { isActive: filters.isActive });
        }

        query.orderBy('template.createdAt', 'DESC');
        return query.getMany();
    }

    async getAutomationTemplateById(id: string): Promise<AutomationTemplate> {
        const template = await this.automationTemplateRepo.findOne({ where: { id } });
        if (!template) {
            throw new NotFoundException(`Automation template with ID ${id} not found`);
        }
        return template;
    }

    async createAutomationTemplate(dto: CreateAutomationTemplateDto, createdBy?: string): Promise<AutomationTemplate> {
        const template = this.automationTemplateRepo.create({
            ...dto,
            allowedPlans: dto.allowedPlans || ['starter', 'pro', 'enterprise'],
            createdBy,
        });
        return this.automationTemplateRepo.save(template);
    }

    async updateAutomationTemplate(id: string, dto: UpdateAutomationTemplateDto): Promise<AutomationTemplate> {
        const template = await this.getAutomationTemplateById(id);
        Object.assign(template, dto);
        return this.automationTemplateRepo.save(template);
    }

    async deleteAutomationTemplate(id: string): Promise<void> {
        const template = await this.getAutomationTemplateById(id);
        await this.automationTemplateRepo.remove(template);
    }

    async incrementAutomationUsage(id: string): Promise<void> {
        await this.automationTemplateRepo.increment({ id }, 'usageCount', 1);
    }

    // ==================== WHATSAPP TEMPLATES ====================

    async getAllWhatsAppTemplates(filters?: { category?: string; status?: string }): Promise<PremadeWhatsAppTemplate[]> {
        const query = this.whatsappTemplateRepo.createQueryBuilder('template');

        if (filters?.category) {
            query.andWhere('template.category = :category', { category: filters.category });
        }
        if (filters?.status) {
            query.andWhere('template.status = :status', { status: filters.status });
        }

        query.orderBy('template.createdAt', 'DESC');
        return query.getMany();
    }

    async getWhatsAppTemplateById(id: string): Promise<PremadeWhatsAppTemplate> {
        const template = await this.whatsappTemplateRepo.findOne({ where: { id } });
        if (!template) {
            throw new NotFoundException(`WhatsApp template with ID ${id} not found`);
        }
        return template;
    }

    async createWhatsAppTemplate(dto: CreateWhatsAppTemplateDto, createdBy?: string): Promise<PremadeWhatsAppTemplate> {
        const template = this.whatsappTemplateRepo.create({
            ...dto,
            buttons: dto.buttons || [],
            allowedPlans: dto.allowedPlans || ['starter', 'pro', 'enterprise'],
            status: dto.status || 'draft',
            createdBy,
        });
        return this.whatsappTemplateRepo.save(template);
    }

    async updateWhatsAppTemplate(id: string, dto: UpdateWhatsAppTemplateDto): Promise<PremadeWhatsAppTemplate> {
        const template = await this.getWhatsAppTemplateById(id);
        Object.assign(template, dto);
        return this.whatsappTemplateRepo.save(template);
    }

    async deleteWhatsAppTemplate(id: string): Promise<void> {
        // Use delete which is more efficient for simple ID-based deletion
        // and doesn't require fetching (though we might want to check existence if strict)
        // But getWhatsAppTemplateById checks existence.

        // Wait, if we use delete(id), we don't need to fetch it first technically,
        // but if we want to ensure it existed (to throw 404), we keep the fetch.
        // However, standard delete returns DeleteResult which we can check affected > 0.

        // Let's keep the check for 404 correctness, but use delete(id) to avoid object-state issues.
        await this.getWhatsAppTemplateById(id);
        await this.whatsappTemplateRepo.delete(id);
    }

    async incrementWhatsAppUsage(id: string): Promise<void> {
        await this.whatsappTemplateRepo.increment({ id }, 'usageCount', 1);
    }

    // ==================== EMAIL TEMPLATES ====================

    async getAllEmailTemplates(filters?: { category?: string; status?: string }): Promise<PremadeEmailTemplate[]> {
        const query = this.emailTemplateRepo.createQueryBuilder('template');

        if (filters?.category) {
            query.andWhere('template.category = :category', { category: filters.category });
        }
        if (filters?.status) {
            query.andWhere('template.status = :status', { status: filters.status });
        }

        query.orderBy('template.createdAt', 'DESC');
        return query.getMany();
    }

    async getEmailTemplateById(id: string): Promise<PremadeEmailTemplate> {
        const template = await this.emailTemplateRepo.findOne({ where: { id } });
        if (!template) {
            throw new NotFoundException(`Email template with ID ${id} not found`);
        }
        return template;
    }

    async createEmailTemplate(dto: CreateEmailTemplateDto, createdBy?: string): Promise<PremadeEmailTemplate> {
        const template = this.emailTemplateRepo.create({
            ...dto,
            allowedPlans: dto.allowedPlans || ['starter', 'pro', 'enterprise'],
            status: dto.status || 'draft',
            createdBy,
        });
        return this.emailTemplateRepo.save(template);
    }

    async updateEmailTemplate(id: string, dto: UpdateEmailTemplateDto): Promise<PremadeEmailTemplate> {
        const template = await this.getEmailTemplateById(id);
        Object.assign(template, dto);
        return this.emailTemplateRepo.save(template);
    }

    async deleteEmailTemplate(id: string): Promise<void> {
        const template = await this.getEmailTemplateById(id);
        await this.emailTemplateRepo.remove(template);
    }

    async incrementEmailUsage(id: string): Promise<void> {
        await this.emailTemplateRepo.increment({ id }, 'usageCount', 1);
    }

    // ==================== AGGREGATED STATS ====================

    async getBuilderStats(): Promise<{
        automation: { total: number; active: number };
        whatsapp: { total: number; active: number };
        email: { total: number; active: number };
    }> {
        const [automationTotal, automationActive] = await Promise.all([
            this.automationTemplateRepo.count(),
            this.automationTemplateRepo.count({ where: { isActive: true } }),
        ]);

        const [whatsappTotal, whatsappActive] = await Promise.all([
            this.whatsappTemplateRepo.count(),
            this.whatsappTemplateRepo.count({ where: { status: 'active' } }),
        ]);

        const [emailTotal, emailActive] = await Promise.all([
            this.emailTemplateRepo.count(),
            this.emailTemplateRepo.count({ where: { status: 'active' } }),
        ]);

        return {
            automation: { total: automationTotal, active: automationActive },
            whatsapp: { total: whatsappTotal, active: whatsappActive },
            email: { total: emailTotal, active: emailActive },
        };
    }
}
