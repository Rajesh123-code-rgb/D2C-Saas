import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Channel } from '../channel.entity';
import { InboxService } from '../../inbox/inbox.service';
import { ContactsService } from '../../contacts/contacts.service';
import { EmailGovernanceService } from '../../super-admin/services/email-governance.service';
interface EmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    cc?: string[];
    bcc?: string[];
    from?: string;
    replyTo?: string;
    attachments?: Array<{
        filename: string;
        content?: Buffer | string;
        path?: string;
        contentType?: string;
    }>;
    messageId?: string; // Optional DB message ID for tracking pixel
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly inboxService: InboxService,
        private readonly contactsService: ContactsService,
        private readonly emailGovernanceService: EmailGovernanceService,
        @InjectRepository(Channel)
        private readonly channelRepository: Repository<Channel>,
    ) {
        this.initializeTransporter();
    }

    /**
     * Initialize email transporter
     */
    private initializeTransporter() {
        const emailService = this.configService.get<string>('EMAIL_SERVICE');
        const emailHost = this.configService.get<string>('EMAIL_HOST');
        const emailPort = this.configService.get<number>('EMAIL_PORT');
        const emailUser = this.configService.get<string>('EMAIL_USER');
        const emailPass = this.configService.get<string>('EMAIL_PASS');

        if (emailService === 'sendgrid') {
            // SendGrid configuration
            this.transporter = nodemailer.createTransport({
                host: 'smtp.sendgrid.net',
                port: 587,
                secure: false,
                auth: {
                    user: 'apikey',
                    pass: this.configService.get<string>('SENDGRID_API_KEY'),
                },
            });
        } else if (emailHost) {
            // Custom SMTP configuration
            this.transporter = nodemailer.createTransport({
                host: emailHost,
                port: emailPort || 587,
                secure: emailPort === 465,
                auth: {
                    user: emailUser,
                    pass: emailPass,
                },
            });
        } else {
            this.logger.warn('No email service configured');
        }
    }

    /**
     * Get tenant ID from email address
     */
    async getTenantIdFromEmail(email: string): Promise<string | null> {
        try {
            // Find channel where credentials contains this email
            const channels = await this.channelRepository.find({
                where: { channelType: 'email' as any },
            });

            for (const channel of channels) {
                if (channel.credentials) {
                    const creds = JSON.parse(channel.credentials);
                    if (creds.email && creds.email.toLowerCase() === email.toLowerCase()) {
                        return (channel as any).tenantId;
                    }
                }
            }

            return null;
        } catch (error: any) {
            this.logger.error(`Error finding tenant for email ${email}: ${error.message}`);
            return null;
        }
    }

    /**
     * Send an email
     */
    async sendEmail(channelId: string, options: EmailOptions): Promise<any> {
        const channel = await this.channelRepository.findOne({
            where: { id: channelId },
        });

        // Governance Validation
        if (channel && channel.tenantId) {
            await this.emailGovernanceService.validateEmail(channel.tenantId, {
                subject: options.subject,
                body: (options.html || options.text) || '',
                attachments: options.attachments,
            });
        }


        if (!channel || channel.channelType !== 'email') {
            throw new Error('Invalid email channel');
        }

        const creds = channel.credentials ? JSON.parse(channel.credentials) : {};
        const fromEmail = creds['email'] || this.configService.get<string>('EMAIL_FROM');
        const fromName = creds['displayName'] || 'OmniChannel';

        if (!this.transporter) {
            throw new Error('Email transporter not configured');
        }

        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
            attachments: options.attachments,
            cc: options.cc?.join(','),
            bcc: options.bcc?.join(','),
            replyTo: options.replyTo || fromEmail,
        };

        // Inject tracking pixel for HTML emails (if enabled and message ID provided)
        if (mailOptions.html && options.messageId) {
            const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
            const trackingPixel = `<img src="${baseUrl}/api/email/track/${options.messageId}/open" width="1" height="1" style="display:none;border:0;" alt="" />`;
            mailOptions.html = mailOptions.html + trackingPixel;
        }

        try {
            const result = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email sent to ${options.to}: ${result.messageId}`);
            return {
                success: true,
                messageId: result.messageId,
                smtpMessageId: result.messageId, // SMTP message ID from server
            };
        } catch (error: any) {
            this.logger.error(`Error sending email: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Send a template email
     */
    async sendTemplateEmail(
        channelId: string,
        to: string,
        templateId: string,
        variables: Record<string, string>,
    ): Promise<any> {
        // TODO: Implement template loading and variable substitution
        // For now, use basic variable replacement

        const templates: Record<string, { subject: string; html: string }> = {
            welcome: {
                subject: 'Welcome to {{companyName}}!',
                html: `
          <h1>Welcome, {{name}}!</h1>
          <p>Thank you for joining {{companyName}}. We're excited to have you on board.</p>
          <p>Best regards,<br>The {{companyName}} Team</p>
        `,
            },
            order_confirmation: {
                subject: 'Order Confirmation #{{orderId}}',
                html: `
          <h1>Thank you for your order!</h1>
          <p>Hi {{name}},</p>
          <p>Your order #{{orderId}} has been confirmed.</p>
          <p>Total: {{total}}</p>
          <p>We'll notify you when it ships.</p>
        `,
            },
            password_reset: {
                subject: 'Reset Your Password',
                html: `
          <h1>Password Reset Request</h1>
          <p>Hi {{name}},</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="{{resetLink}}">Reset Password</a></p>
          <p>This link expires in 24 hours.</p>
        `,
            },
        };

        const template = templates[templateId];
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        // Replace variables
        let subject = template.subject;
        let html = template.html;

        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, value);
            html = html.replace(regex, value);
        }

        return this.sendEmail(channelId, { to, subject, html });
    }

    /**
     * Process incoming email (from webhook/IMAP)
     */
    async processIncomingEmail(emailData: any, tenantId: string): Promise<void> {
        try {
            const { from, to, subject, text, html, messageId, date, attachments } = emailData;

            // Parse sender email
            const senderEmail = this.parseEmailAddress(from);
            if (!senderEmail) {
                this.logger.warn('Could not parse sender email');
                return;
            }

            const channel = await this.channelRepository.findOne({
                where: { tenantId, channelType: 'email' } as any,
            });

            if (!channel) {
                this.logger.error(`No email channel found for tenant ${tenantId}`);
                return;
            }

            const contact = await this.contactsService.findOrCreate(
                tenantId,
                { email: senderEmail.address },
                {
                    name: senderEmail.name || senderEmail.address,
                    source: 'email',
                },
            );

            // Find or create conversation
            const conversation = await this.inboxService.findOrCreateConversation(
                tenantId,
                contact.id,
                'email' as any,
                channel.id,
            );

            // Create message
            await this.inboxService.createMessage(
                conversation.id,
                tenantId,
                {
                    direction: 'inbound' as any,
                    messageType: 'text' as any,
                    content: subject,
                },
            );

            this.logger.log(`Processed incoming email from ${senderEmail.address}`);
        } catch (error: any) {
            this.logger.error(`Error processing incoming email: ${error.message}`, error.stack);
        }
    }

    /**
     * Parse email address from various formats
     */
    private parseEmailAddress(from: string): { address: string; name?: string } | null {
        if (!from) return null;

        // Handle "Name <email@example.com>" format
        const match = from.match(/(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?/);
        if (match) {
            return {
                name: match[1]?.trim(),
                address: match[2].trim(),
            };
        }

        // Handle plain email
        if (from.includes('@')) {
            return { address: from.trim() };
        }

        return null;
    }

    /**
     * Verify email configuration
     */
    async verifyConnection(): Promise<boolean> {
        if (!this.transporter) {
            return false;
        }

        try {
            await this.transporter.verify();
            this.logger.log('Email transporter verified successfully');
            return true;
        } catch (error: any) {
            this.logger.error(`Email verification failed: ${error.message}`);
            return false;
        }
    }
}
