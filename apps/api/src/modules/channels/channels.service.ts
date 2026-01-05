import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel, ChannelType, ChannelStatus } from './channel.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import * as crypto from 'crypto';

@Injectable()
export class ChannelsService {
    private readonly encryptionKey: string;

    constructor(
        @InjectRepository(Channel)
        private channelsRepository: Repository<Channel>,
    ) {
        // Use environment variable for encryption key in production
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    }

    async findAll(tenantId: string): Promise<Channel[]> {
        console.log(`[ChannelsService] findAll called with tenantId: ${tenantId}`);

        const channels = await this.channelsRepository.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
        });

        console.log(`[ChannelsService] Found ${channels.length} channels for tenant ${tenantId}`);

        // Decrypt credentials for display (only show partial info)
        return channels.map(channel => ({
            ...channel,
            credentials: this.getPartialCredentials(channel.channelType),
        }));
    }

    async findOne(id: string, tenantId: string): Promise<Channel> {
        const channel = await this.channelsRepository.findOne({
            where: { id, tenantId },
        });

        if (!channel) {
            throw new NotFoundException(`Channel with ID ${id} not found`);
        }

        return channel;
    }

    async create(tenantId: string, createChannelDto: CreateChannelDto): Promise<Channel> {
        // Validate credentials based on channel type
        await this.validateCredentials(createChannelDto.channelType, createChannelDto.credentials);

        // Encrypt credentials before storing
        const encryptedCredentials = this.encryptCredentials(createChannelDto.credentials);

        const channel = this.channelsRepository.create({
            ...createChannelDto,
            tenantId,
            credentials: encryptedCredentials,
            status: ChannelStatus.PENDING,
        });

        const savedChannel = await this.channelsRepository.save(channel);

        // Test connection
        try {
            await this.testConnection(savedChannel.id, tenantId);
            savedChannel.status = ChannelStatus.CONNECTED;
            await this.channelsRepository.save(savedChannel);
        } catch (error: any) {
            savedChannel.status = ChannelStatus.ERROR;
            await this.channelsRepository.save(savedChannel);
            throw new BadRequestException(`Failed to connect channel: ${error.message || error}`);
        }

        return savedChannel;
    }

    async update(id: string, tenantId: string, updateChannelDto: UpdateChannelDto): Promise<Channel> {
        const channel = await this.findOne(id, tenantId);

        if (updateChannelDto.credentials) {
            updateChannelDto.credentials = this.encryptCredentials(updateChannelDto.credentials) as any;
        }

        Object.assign(channel, updateChannelDto);
        return this.channelsRepository.save(channel);
    }

    async remove(id: string, tenantId: string): Promise<void> {
        const channel = await this.findOne(id, tenantId);
        await this.channelsRepository.remove(channel);
    }

    async testConnection(id: string, tenantId: string): Promise<{ success: boolean; message: string }> {
        const channel = await this.findOne(id, tenantId);
        const credentials = this.decryptCredentials(channel.credentials);

        try {
            switch (channel.channelType) {
                case ChannelType.WHATSAPP:
                    await this.testWhatsAppConnection(credentials);
                    break;
                case ChannelType.INSTAGRAM:
                    await this.testInstagramConnection(credentials);
                    break;
                case ChannelType.EMAIL:
                    await this.testEmailConnection(credentials);
                    break;
                default:
                    throw new BadRequestException('Unknown channel type');
            }

            // Update last sync time
            channel.lastSyncAt = new Date();
            channel.status = ChannelStatus.CONNECTED;
            await this.channelsRepository.save(channel);

            return { success: true, message: 'Connection successful' };
        } catch (error) {
            channel.status = ChannelStatus.ERROR;
            await this.channelsRepository.save(channel);
            throw error;
        }
    }

    /**
     * Check WhatsApp Business Account compliance and readiness to receive messages
     */
    async checkWhatsAppCompliance(id: string, tenantId: string): Promise<{
        isReady: boolean;
        checks: {
            name: string;
            passed: boolean;
            message: string;
            severity: 'error' | 'warning' | 'info';
        }[];
        recommendations: string[];
    }> {
        const channel = await this.findOne(id, tenantId);
        if (channel.channelType !== ChannelType.WHATSAPP) {
            throw new BadRequestException('This is not a WhatsApp channel');
        }

        const credentials = this.decryptCredentials(channel.credentials);
        const checks: { name: string; passed: boolean; message: string; severity: 'error' | 'warning' | 'info' }[] = [];
        const recommendations: string[] = [];

        try {
            // 1. Check Phone Number Status
            const phoneResponse = await fetch(
                `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,throughput,name_status&access_token=${credentials.accessToken}`
            );
            const phoneData = await phoneResponse.json() as any;

            if (phoneData.error) {
                checks.push({
                    name: 'Phone Number Access',
                    passed: false,
                    message: `Cannot access phone number: ${phoneData.error.message}`,
                    severity: 'error'
                });
            } else {
                checks.push({
                    name: 'Phone Number Access',
                    passed: true,
                    message: `Phone: ${phoneData.display_phone_number || 'Unknown'}`,
                    severity: 'info'
                });

                // Check verified name
                if (phoneData.verified_name) {
                    checks.push({
                        name: 'Verified Business Name',
                        passed: true,
                        message: `Verified as: ${phoneData.verified_name}`,
                        severity: 'info'
                    });
                } else {
                    checks.push({
                        name: 'Verified Business Name',
                        passed: false,
                        message: 'Business name not verified. You can only receive messages from test numbers.',
                        severity: 'warning'
                    });
                    recommendations.push('Complete business verification in Meta Business Suite to receive messages from any number');
                }

                // Check quality rating
                const qualityRating = phoneData.quality_rating;
                if (qualityRating) {
                    const qualityPassed = qualityRating === 'GREEN' || qualityRating === 'YELLOW';
                    checks.push({
                        name: 'Quality Rating',
                        passed: qualityPassed,
                        message: `Quality: ${qualityRating}`,
                        severity: qualityRating === 'RED' ? 'error' : qualityRating === 'YELLOW' ? 'warning' : 'info'
                    });
                    if (qualityRating === 'RED') {
                        recommendations.push('Your phone number has RED quality rating. Meta may limit or block messaging. Review your messaging practices.');
                    }
                }

                // Check name status
                if (phoneData.name_status && phoneData.name_status !== 'APPROVED') {
                    checks.push({
                        name: 'Display Name Status',
                        passed: phoneData.name_status === 'APPROVED',
                        message: `Name status: ${phoneData.name_status}`,
                        severity: phoneData.name_status === 'DECLINED' ? 'error' : 'warning'
                    });
                }
            }

            // 2. Check WABA (WhatsApp Business Account) if available
            if (credentials.wabaId) {
                const wabaResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${credentials.wabaId}?fields=name,timezone_id,message_template_namespace,account_review_status&access_token=${credentials.accessToken}`
                );
                const wabaData = await wabaResponse.json() as any;

                if (wabaData.error) {
                    checks.push({
                        name: 'WABA Access',
                        passed: false,
                        message: `Cannot access WABA: ${wabaData.error.message}`,
                        severity: 'error'
                    });
                } else {
                    checks.push({
                        name: 'WABA Access',
                        passed: true,
                        message: `WABA: ${wabaData.name || credentials.wabaId}`,
                        severity: 'info'
                    });

                    // Check account review status
                    if (wabaData.account_review_status) {
                        checks.push({
                            name: 'Account Review Status',
                            passed: wabaData.account_review_status === 'APPROVED',
                            message: `Review status: ${wabaData.account_review_status}`,
                            severity: wabaData.account_review_status !== 'APPROVED' ? 'warning' : 'info'
                        });
                    }
                }
            }

            // 3. Check if webhook is configured (by checking subscribed_apps)
            if (credentials.wabaId) {
                const subsResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${credentials.wabaId}/subscribed_apps?access_token=${credentials.accessToken}`
                );
                const subsData = await subsResponse.json() as any;

                if (subsData.data && subsData.data.length > 0) {
                    checks.push({
                        name: 'App Subscription',
                        passed: true,
                        message: `App subscribed to WABA webhooks`,
                        severity: 'info'
                    });
                } else {
                    checks.push({
                        name: 'App Subscription',
                        passed: false,
                        message: 'No app subscribed to WABA. Messages may not be delivered.',
                        severity: 'error'
                    });
                    recommendations.push('Subscribe your app to WABA webhooks: POST /{WABA_ID}/subscribed_apps');
                }
            }

            // 4. Check webhook field subscriptions
            checks.push({
                name: 'Webhook Configuration',
                passed: true,
                message: 'Ensure webhook URL is configured in Meta Developer Console under WhatsApp > Configuration',
                severity: 'info'
            });
            recommendations.push('Verify webhook URL in Meta Developer Console: WhatsApp > Configuration > Webhooks');
            recommendations.push('Make sure "messages" field is subscribed under webhook fields');

        } catch (error: any) {
            checks.push({
                name: 'API Access',
                passed: false,
                message: `Error checking compliance: ${error.message}`,
                severity: 'error'
            });
        }

        // Determine if ready
        const hasErrors = checks.some(c => c.severity === 'error' && !c.passed);
        const isReady = !hasErrors;

        // Update channel metadata with compliance info
        channel.metadata = {
            ...channel.metadata,
            lastComplianceCheck: new Date().toISOString(),
            complianceStatus: isReady ? 'ready' : 'issues_found',
            checksCount: checks.length,
            errorCount: checks.filter(c => c.severity === 'error' && !c.passed).length,
        };
        await this.channelsRepository.save(channel);

        return { isReady, checks, recommendations };
    }

    private async validateCredentials(channelType: ChannelType, credentials: any): Promise<void> {
        switch (channelType) {
            case ChannelType.WHATSAPP:
                if (!credentials.accessToken || !credentials.phoneNumberId) {
                    throw new BadRequestException('WhatsApp requires accessToken and phoneNumberId');
                }
                break;
            case ChannelType.INSTAGRAM:
                if (!credentials.accessToken || !credentials.instagramAccountId) {
                    throw new BadRequestException('Instagram requires accessToken and instagramAccountId');
                }
                break;
            case ChannelType.EMAIL:
                if (!credentials.email || !credentials.password) {
                    throw new BadRequestException('Email requires email and password');
                }
                break;
        }
    }

    private async testWhatsAppConnection(credentials: any): Promise<void> {
        if (!credentials.accessToken || !credentials.phoneNumberId) {
            throw new Error('Invalid WhatsApp credentials: Missing accessToken or phoneNumberId');
        }

        try {
            // Validate access token by calling Meta Graph API
            const response = await fetch(
                `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}?access_token=${credentials.accessToken}`
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
                const errorMessage = errorData.error?.message || `HTTP ${response.status}`;

                if (response.status === 400) {
                    throw new Error(`Invalid Phone Number ID: ${errorMessage}`);
                } else if (response.status === 401 || response.status === 403) {
                    throw new Error(`Invalid Access Token or insufficient permissions: ${errorMessage}`);
                } else {
                    throw new Error(`WhatsApp API error: ${errorMessage}`);
                }
            }

            const data = await response.json() as { display_phone_number?: string };
            console.log(`✅ WhatsApp connection successful for phone number: ${data.display_phone_number || credentials.phoneNumberId}`);
        } catch (error: any) {
            if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
                throw new Error('Cannot reach Meta API. Check your internet connection.');
            }
            throw error;
        }
    }

    private async testInstagramConnection(credentials: any): Promise<void> {
        console.log('[Instagram] Testing connection...');
        console.log('[Instagram] Account ID:', credentials.instagramAccountId);
        console.log('[Instagram] Token length:', credentials.accessToken?.length || 0);

        if (!credentials.accessToken || !credentials.instagramAccountId) {
            throw new Error('Invalid Instagram credentials: Missing accessToken or instagramAccountId');
        }

        try {
            // Validate by fetching Instagram account info
            const url = `https://graph.facebook.com/v18.0/${credentials.instagramAccountId}?fields=id,username&access_token=${credentials.accessToken}`;
            console.log('[Instagram] Calling Graph API:', url.substring(0, 100) + '...');

            const response = await fetch(url);
            const responseText = await response.text();
            console.log('[Instagram] Response status:', response.status);
            console.log('[Instagram] Response body:', responseText.substring(0, 200));

            if (!response.ok) {
                let errorData: { error?: { message?: string; code?: number; type?: string } } = {};
                try {
                    errorData = JSON.parse(responseText);
                } catch { }

                const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
                const errorType = errorData.error?.type || 'Unknown';
                const errorCode = errorData.error?.code || 0;

                console.log('[Instagram] Error details:', { errorType, errorCode, errorMessage });

                if (response.status === 400 || errorCode === 100) {
                    throw new Error(`Invalid Instagram Account ID. Please verify the ID is correct. (${errorMessage})`);
                } else if (response.status === 401 || response.status === 403 || errorCode === 190) {
                    throw new Error(`Access Token is invalid or expired. Please generate a new Page Access Token. (${errorMessage})`);
                } else if (errorCode === 10) {
                    throw new Error(`Permission denied. Please make sure your token has instagram_basic and instagram_manage_messages permissions.`);
                } else {
                    throw new Error(`Instagram API error: ${errorMessage}`);
                }
            }

            const data = JSON.parse(responseText) as { username?: string; id?: string };
            console.log(`✅ Instagram connection successful for @${data.username || data.id}`);
        } catch (error: any) {
            console.log('[Instagram] Error:', error.message);
            if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
                throw new Error('Cannot reach Meta API. Check your internet connection.');
            }
            throw error;
        }
    }

    private async testEmailConnection(credentials: any): Promise<void> {
        const nodemailer = require('nodemailer');

        if (!credentials.email || !credentials.password || !credentials.smtpHost) {
            throw new Error('Missing required email credentials (email, password, smtpHost)');
        }

        try {
            // Create test transporter
            const transporter = nodemailer.createTransport({
                host: credentials.smtpHost,
                port: credentials.smtpPort || 587,
                secure: credentials.smtpPort === 465, // true for 465, false for other ports
                auth: {
                    user: credentials.email,
                    pass: credentials.password,
                },
                tls: {
                    // Don't fail on invalid certs in development
                    rejectUnauthorized: process.env.NODE_ENV === 'production',
                },
                connectionTimeout: 10000, // 10 seconds
                greetingTimeout: 10000,
            });

            // Verify connection
            await transporter.verify();

            console.log(`✅ SMTP connection successful for ${credentials.email}`);
        } catch (error: any) {
            console.error('SMTP connection error:', error);

            // Provide specific error messages based on error type
            if (error.code === 'EAUTH') {
                throw new Error('Authentication failed. Email or password is incorrect. For Gmail, use an App Password instead of your regular password.');
            } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
                throw new Error(`Connection timeout. Cannot reach ${credentials.smtpHost}:${credentials.smtpPort}. Check your SMTP host and port settings, and ensure your firewall allows outgoing connections.`);
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error(`Connection refused by ${credentials.smtpHost}:${credentials.smtpPort}. Verify the SMTP host and port are correct.`);
            } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
                throw new Error(`Cannot find SMTP server "${credentials.smtpHost}". Check that the hostname is correct.`);
            } else if (error.message && error.message.includes('TLS')) {
                throw new Error(`TLS/SSL error. Try port 587 with STARTTLS or port 465 with SSL/TLS.`);
            } else if (error.message && error.message.includes('AUTHENTICATIONFAILED')) {
                throw new Error('Authentication failed. Your email provider rejected the credentials. For Gmail, enable 2-Step Verification and use an App Password.');
            } else {
                // Generic error with original message
                throw new Error(`SMTP connection failed: ${error.message || 'Unknown error'}`);
            }
        }
    }

    private encryptCredentials(credentials: any): string {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    }

    private decryptCredentials(encryptedData: string): any {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

        const parts = encryptedData.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }

    private getPartialCredentials(channelType: ChannelType): any {
        // Return placeholder info, not actual credentials
        switch (channelType) {
            case ChannelType.WHATSAPP:
                return { type: 'whatsapp', configured: true };
            case ChannelType.INSTAGRAM:
                return { type: 'instagram', configured: true };
            case ChannelType.EMAIL:
                return { type: 'email', configured: true };
            default:
                return {};
        }
    }
}
