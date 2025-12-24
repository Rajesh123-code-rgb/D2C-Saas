import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    Campaign,
    CampaignStatus,
    CampaignChannel,
    CampaignExecution,
} from './entities/campaign.entity';
import { CampaignsService } from './campaigns.service';
import { WhatsAppService } from '../channels/whatsapp/whatsapp.service';
import { Channel } from '../channels/channel.entity';
import { Contact } from '../contacts/contact.entity';

interface ExecuteCampaignJob {
    campaignId: string;
    tenantId: string;
}

interface SendMessageJob {
    executionId: string;
    campaignId: string;
    contactId: string;
    tenantId: string;
    content: {
        channel: CampaignChannel;
        templateId?: string;
        templateName?: string;
        templateVariables?: Record<string, string>;
        emailSubject?: string;
        emailBody?: string;
    };
}

@Injectable()
@Processor('campaigns')
export class CampaignsProcessor extends WorkerHost {
    private readonly logger = new Logger(CampaignsProcessor.name);

    constructor(
        @InjectRepository(Campaign)
        private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(CampaignExecution)
        private readonly executionRepository: Repository<CampaignExecution>,
        @InjectRepository(Channel)
        private readonly channelRepository: Repository<Channel>,
        @InjectRepository(Contact)
        private readonly contactRepository: Repository<Contact>,
        @Inject(forwardRef(() => CampaignsService))
        private readonly campaignsService: CampaignsService,
        @Inject(forwardRef(() => WhatsAppService))
        private readonly whatsAppService: WhatsAppService,
    ) {
        super();
    }

    async process(job: Job<ExecuteCampaignJob | SendMessageJob>): Promise<void> {
        const startTime = Date.now();

        this.logger.log({
            message: `Processing job: ${job.name}`,
            jobId: job.id,
            data: job.data,
        });

        try {
            switch (job.name) {
                case 'execute-campaign':
                    await this.executeCampaign(job.data as ExecuteCampaignJob);
                    break;
                case 'send-message':
                    await this.sendMessage(job.data as SendMessageJob);
                    break;
                default:
                    this.logger.warn(`Unknown job type: ${job.name}`);
            }

            const duration = Date.now() - startTime;
            this.logger.log({
                message: `Job completed: ${job.name}`,
                jobId: job.id,
                durationMs: duration,
            });
        } catch (error) {
            const err = error as Error;
            this.logger.error({
                message: `Job failed: ${job.name}`,
                jobId: job.id,
                error: err.message,
                stack: err.stack,
            });
            throw error; // Re-throw for retry
        }
    }

    /**
     * Execute a campaign - delegates to service which queues individual messages
     */
    private async executeCampaign(data: ExecuteCampaignJob): Promise<void> {
        const { campaignId, tenantId } = data;

        this.logger.log(`Executing campaign: ${campaignId}`);

        // Check if campaign is still valid for execution
        const campaign = await this.campaignRepository.findOne({
            where: { id: campaignId },
        });

        if (!campaign) {
            this.logger.warn(`Campaign not found: ${campaignId}`);
            return;
        }

        if (campaign.status === CampaignStatus.CANCELLED) {
            this.logger.log(`Campaign cancelled, skipping: ${campaignId}`);
            return;
        }

        if (campaign.status === CampaignStatus.PAUSED) {
            this.logger.log(`Campaign paused, skipping: ${campaignId}`);
            return;
        }

        // Delegate to service to start execution
        await this.campaignsService.startExecution(campaignId);
    }

    /**
     * Send an individual message for a campaign execution
     */
    private async sendMessage(data: SendMessageJob): Promise<void> {
        const { executionId, campaignId, contactId, content } = data;

        // Get execution record
        const execution = await this.executionRepository.findOne({
            where: { id: executionId },
        });

        if (!execution) {
            this.logger.warn(`Execution not found: ${executionId}`);
            return;
        }

        // Check if campaign is still running
        const campaign = await this.campaignRepository.findOne({
            where: { id: campaignId },
        });

        if (!campaign || campaign.status !== CampaignStatus.RUNNING) {
            this.logger.log(`Campaign not running, skipping message: ${executionId}`);
            await this.campaignsService.updateExecutionStatus(executionId, 'failed', {
                errorMessage: 'Campaign not running',
            });
            return;
        }

        // Get contact details
        const contact = await this.contactRepository.findOne({
            where: { id: contactId },
        });

        if (!contact) {
            this.logger.warn(`Contact not found: ${contactId}`);
            await this.campaignsService.updateExecutionStatus(executionId, 'failed', {
                errorMessage: 'Contact not found',
            });
            return;
        }

        // Mark as queued
        execution.status = 'queued';
        execution.queuedAt = new Date();
        await this.executionRepository.save(execution);

        try {
            if (content.channel === CampaignChannel.WHATSAPP) {
                await this.sendWhatsAppMessage(execution, campaign, contact, content);
            } else if (content.channel === CampaignChannel.EMAIL) {
                await this.sendEmailMessage(execution, campaign, contact, content);
            } else {
                throw new Error(`Unsupported channel: ${content.channel}`);
            }
        } catch (error) {
            const err = error as Error;
            this.logger.error({
                message: `Failed to send message`,
                executionId,
                contactId,
                error: err.message,
            });

            await this.campaignsService.updateExecutionStatus(executionId, 'failed', {
                errorMessage: err.message,
            });
        }
    }

    /**
     * Send WhatsApp template message
     */
    private async sendWhatsAppMessage(
        execution: CampaignExecution,
        campaign: Campaign,
        contact: Contact,
        content: SendMessageJob['content'],
    ): Promise<void> {
        // Get WhatsApp channel for tenant
        const channel = await this.channelRepository.findOne({
            where: {
                tenantId: campaign.tenantId,
                channelType: 'whatsapp' as any,
            },
        });

        if (!channel) {
            throw new Error('No WhatsApp channel configured');
        }

        if (!contact.phone) {
            throw new Error('Contact has no phone number');
        }

        // Build template components from variables
        const components: any[] = [];
        if (content.templateVariables && Object.keys(content.templateVariables).length > 0) {
            const parameters = Object.values(content.templateVariables).map((value) => ({
                type: 'text',
                text: value,
            }));
            components.push({
                type: 'body',
                parameters,
            });
        }

        // Send via WhatsApp service
        const result = await this.whatsAppService.sendTemplateMessage(
            channel.id,
            contact.phone,
            content.templateName || content.templateId || '',
            'en', // Default language
            components,
        );

        // Update execution with success
        const messageId = result?.messages?.[0]?.id;
        await this.campaignsService.updateExecutionStatus(execution.id, 'sent', {
            externalMessageId: messageId,
        });

        this.logger.log({
            message: 'WhatsApp message sent',
            executionId: execution.id,
            contactPhone: contact.phone,
            messageId,
        });
    }

    /**
     * Send Email message
     */
    private async sendEmailMessage(
        execution: CampaignExecution,
        campaign: Campaign,
        contact: Contact,
        content: SendMessageJob['content'],
    ): Promise<void> {
        if (!contact.email) {
            throw new Error('Contact has no email address');
        }

        // TODO: Integrate with email service (Nodemailer, SendGrid, etc.)
        // For now, log and mark as sent for testing
        this.logger.log({
            message: 'Email would be sent',
            executionId: execution.id,
            contactEmail: contact.email,
            subject: content.emailSubject,
        });

        // Mark as sent (placeholder for email integration)
        await this.campaignsService.updateExecutionStatus(execution.id, 'sent', {
            externalMessageId: `email_${Date.now()}`,
        });
    }

    /**
     * Check for scheduled campaigns that are due for execution
     * Runs every minute
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async checkScheduledCampaigns(): Promise<void> {
        const now = new Date();

        // Find campaigns that are scheduled and due
        const dueCampaigns = await this.campaignRepository.find({
            where: {
                status: CampaignStatus.SCHEDULED,
                scheduledAt: LessThanOrEqual(now),
            },
        });

        if (dueCampaigns.length === 0) return;

        this.logger.log(`Found ${dueCampaigns.length} campaigns due for execution`);

        for (const campaign of dueCampaigns) {
            this.logger.log(`Starting scheduled campaign: ${campaign.name}`);

            try {
                await this.campaignsService.startExecution(campaign.id);
            } catch (error) {
                const err = error as Error;
                this.logger.error({
                    message: `Failed to start scheduled campaign`,
                    campaignId: campaign.id,
                    error: err.message,
                });
            }
        }
    }

    /**
     * Mark completed campaigns
     * Runs every 5 minutes
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async markCompletedCampaigns(): Promise<void> {
        // Find running campaigns where all executions are complete
        const runningCampaigns = await this.campaignRepository.find({
            where: { status: CampaignStatus.RUNNING },
        });

        for (const campaign of runningCampaigns) {
            const pendingCount = await this.executionRepository.count({
                where: {
                    campaignId: campaign.id,
                    status: 'pending' as any,
                },
            });

            const queuedCount = await this.executionRepository.count({
                where: {
                    campaignId: campaign.id,
                    status: 'queued' as any,
                },
            });

            // If no pending or queued executions, mark as completed
            if (pendingCount === 0 && queuedCount === 0) {
                campaign.status = CampaignStatus.COMPLETED;
                campaign.completedAt = new Date();
                await this.campaignRepository.save(campaign);

                // Final stats update
                await this.campaignsService.updateCampaignStats(campaign.id);

                this.logger.log(`Campaign completed: ${campaign.name}`);
            }
        }
    }
}
