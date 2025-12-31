
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppTemplate } from '../../channels/whatsapp/entities/whatsapp-template.entity';
import { WhatsAppTemplatePolicy } from '../entities/whatsapp-template-policy.entity';
import { Tenant } from '../../tenants/tenant.entity';

@Injectable()
export class TemplateGovernanceService {
    private readonly logger = new Logger(TemplateGovernanceService.name);

    constructor(
        @InjectRepository(WhatsAppTemplatePolicy)
        private readonly policyRepository: Repository<WhatsAppTemplatePolicy>,
        @InjectRepository(Tenant)
        private readonly tenantRepository: Repository<Tenant>,
        @InjectRepository(WhatsAppTemplate)
        private readonly templateRepository: Repository<WhatsAppTemplate>,
    ) { }

    /**
     * Get all templates with optional filters
     */
    async getTemplates(
        filters: {
            tenantId?: string;
            status?: string;
            category?: string;
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<{ templates: WhatsAppTemplate[], total: number }> {
        const query = this.templateRepository.createQueryBuilder('template')
            .leftJoinAndSelect('template.tenant', 'tenant')
            .leftJoinAndSelect('template.channel', 'channel')
            .orderBy('template.createdAt', 'DESC');

        if (filters.tenantId) {
            query.andWhere('template.tenantId = :tenantId', { tenantId: filters.tenantId });
        }

        if (filters.status) {
            query.andWhere('template.status = :status', { status: filters.status });
        }

        if (filters.category) {
            query.andWhere('template.category = :category', { category: filters.category });
        }

        if (filters.limit) {
            query.take(filters.limit);
        }

        if (filters.offset) {
            query.skip(filters.offset);
        }

        const [templates, total] = await query.getManyAndCount();

        return { templates, total };
    }


    /**
     * Get the global template policy
     */
    async getPolicy(): Promise<WhatsAppTemplatePolicy> {
        let policy = await this.policyRepository.findOne({
            where: { name: 'default' },
        });

        if (!policy) {
            this.logger.log('No default policy found, creating default.');
            // Use the default constant or manual if imports difficult
            // For now manual based on entity structure
            policy = this.policyRepository.create({
                name: 'default',
                allowedCategories: {
                    utility: true,
                    marketing: true,
                    authentication: true,
                },
                allowedLanguages: ['en', 'es', 'pt', 'hi'],
                buttonTypes: { callToAction: true, quickReply: true, maxButtons: 3 },
                mediaSupport: { image: true, video: true, document: true, location: true, maxFileSizeMB: 16 },
                planRestrictions: {
                    free: { canCreateTemplates: true, maxTemplates: 5, canUseMediaHeaders: false, canUseButtons: true, maxVariables: 2 },
                    starter: { canCreateTemplates: true, maxTemplates: 20, canUseMediaHeaders: true, canUseButtons: true, maxVariables: 5 },
                    pro: { canCreateTemplates: true, maxTemplates: 100, canUseMediaHeaders: true, canUseButtons: true, maxVariables: 10 },
                    enterprise: { canCreateTemplates: true, maxTemplates: 1000, canUseMediaHeaders: true, canUseButtons: true, maxVariables: 10 },
                },
                blockedKeywords: ['guaranteed', 'free money', 'lottery', 'investment scheme'],
                blockedUrlDomains: ['bit.ly'],
                validateBeforeSubmission: true,
            });
            await this.policyRepository.save(policy);
        }

        return policy;
    }

    /**
     * Update the global template policy
     */
    async updatePolicy(data: Partial<WhatsAppTemplatePolicy>): Promise<WhatsAppTemplatePolicy> {
        const policy = await this.getPolicy();
        Object.assign(policy, data);
        return await this.policyRepository.save(policy);
    }

    /**
     * Validate a template before submission
     */
    async validateTemplate(tenantId: string, templateData: any): Promise<{ valid: boolean; reason?: string }> {
        const policy = await this.getPolicy();
        const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });

        if (!tenant) {
            throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
        }

        const plan = tenant.subscriptionTier || 'free';
        const planSettings = policy.planRestrictions[plan] || policy.planRestrictions['free'];

        if (!planSettings.canCreateTemplates) {
            throw new HttpException(`Your plan (${plan}) does not allow creating templates.`, HttpStatus.FORBIDDEN);
        }

        // 1. Check Category
        // category in templateData is usually uppercase: MARKETING, UTILITY
        const category = (templateData.category || '').toLowerCase();
        // allowedCategories keys are lowercase: marketing, utility

        // Use type assertion or index access safely
        const allowedCats = policy.allowedCategories as any;
        if (allowedCats[category] === false) {
            throw new HttpException(
                `Template category '${category}' is not allowed by system policy.`,
                HttpStatus.FORBIDDEN,
            );
        }

        // 2. Check Media
        // If template has header TYPE='IMAGE' etc.
        // This requires parsing components. Simple check for now.
        const hasMedia = templateData.components?.some((c: any) => c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format));
        if (hasMedia && !planSettings.canUseMediaHeaders) {
            throw new HttpException(
                `Your plan (${plan}) does not allow media in template headers.`,
                HttpStatus.FORBIDDEN,
            );
        }

        // 3. Check Blocked Keywords
        if (policy.blockedKeywords && policy.blockedKeywords.length > 0) {
            const contentString = JSON.stringify(templateData).toLowerCase();
            const foundKeywords = policy.blockedKeywords.filter(keyword => contentString.includes(keyword.toLowerCase()));

            if (foundKeywords.length > 0) {
                const reason = `Template contains prohibited keywords: ${foundKeywords.join(', ')}`;
                if (policy.validateBeforeSubmission) {
                    throw new HttpException(reason, HttpStatus.BAD_REQUEST);
                }
                this.logger.warn(`Tenant ${tenantId} submitting template with flagged keywords: ${foundKeywords.join(', ')}`);
            }
        }

        return { valid: true };
    }
}
