
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplatePolicy } from '../entities/email-template-policy.entity';
import { Tenant } from '../../tenants/tenant.entity';

@Injectable()
export class EmailGovernanceService {
    private readonly logger = new Logger(EmailGovernanceService.name);

    constructor(
        @InjectRepository(EmailTemplatePolicy)
        private readonly policyRepository: Repository<EmailTemplatePolicy>,
        @InjectRepository(Tenant)
        private readonly tenantRepository: Repository<Tenant>,
    ) { }

    /**
     * Get the global email policy
     */
    async getPolicy(): Promise<EmailTemplatePolicy> {
        let policy = await this.policyRepository.findOne({
            where: { isGlobal: true },
        });

        if (!policy) {
            this.logger.log('No global email policy found, creating default.');
            policy = this.policyRepository.create({
                isGlobal: true,
                maxDailyEmails: {
                    free: 100,
                    starter: 1000,
                    pro: 10000,
                    enterprise: 100000,
                },
                prohibitedKeywords: ['lottery', 'guaranteed winner', 'urgent wire transfer'],
                requireDomainVerification: true,
                allowedAttachmentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
                maxAttachmentSize: 10485760, // 10MB
            });
            await this.policyRepository.save(policy);
        }

        return policy;
    }

    /**
     * Update the global email policy
     */
    async updatePolicy(data: Partial<EmailTemplatePolicy>): Promise<EmailTemplatePolicy> {
        const policy = await this.getPolicy();
        Object.assign(policy, data);
        return await this.policyRepository.save(policy);
    }

    /**
     * Validate email content before sending
     */
    async validateEmail(tenantId: string, emailContent: { subject: string; body: string; attachments?: any[] }): Promise<{ valid: boolean }> {
        const policy = await this.getPolicy();
        const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });

        if (!tenant) {
            throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
        }

        // 1. Check Prohibited Keywords
        if (policy.prohibitedKeywords && policy.prohibitedKeywords.length > 0) {
            const content = (emailContent.subject + ' ' + emailContent.body).toLowerCase();
            const foundKeywords = policy.prohibitedKeywords.filter(keyword => content.includes(keyword.toLowerCase()));

            if (foundKeywords.length > 0) {
                throw new HttpException(
                    `Email contains prohibited keywords: ${foundKeywords.join(', ')}`,
                    HttpStatus.BAD_REQUEST
                );
            }
        }

        // 2. Check Attachments
        if (emailContent.attachments && emailContent.attachments.length > 0) {
            for (const attachment of emailContent.attachments) {
                // Check Size
                if (attachment.size && attachment.size > policy.maxAttachmentSize) {
                    throw new HttpException(
                        `Attachment exceeds maximum size of ${policy.maxAttachmentSize / 1024 / 1024}MB`,
                        HttpStatus.BAD_REQUEST
                    );
                }

                // Check Type (MIME) - simple check
                if (attachment.contentType && !policy.allowedAttachmentTypes.includes(attachment.contentType)) {
                    throw new HttpException(
                        `Attachment type '${attachment.contentType}' is not allowed.`,
                        HttpStatus.BAD_REQUEST
                    );
                }
            }
        }

        // 3. Domain Verification Check (Mock for now, assume tenant needs 'verified' flag)
        if (policy.requireDomainVerification) {
            // Logic to check if tenant's sending domain is verified would go here
            // if (!tenant.isEmailVerified) throw ...
        }

        return { valid: true };
    }
}
