import { Controller, Get, Query, Res, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { google } from 'googleapis';
import { Channel, ChannelType, ChannelStatus } from '../channel.entity';

@ApiTags('Email OAuth')
@Controller('email/oauth')
export class EmailOAuthController {
    private readonly logger = new Logger(EmailOAuthController.name);

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(Channel)
        private readonly channelRepository: Repository<Channel>,
    ) { }

    /**
     * Gmail OAuth - Initiate authorization flow
     */
    @Get('gmail/authorize')
    @ApiOperation({ summary: 'Initiate Gmail OAuth flow' })
    async gmailAuthorize(
        @Query('tenantId') tenantId: string,
        @Res() res: Response,
    ): Promise<void> {
        try {
            const oauth2Client = this.getGmailOAuthClient();

            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: [
                    'https://www.googleapis.com/auth/gmail.send',
                    'https://www.googleapis.com/auth/gmail.readonly',
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile',
                ],
                state: tenantId, // Pass tenant ID for callback
                prompt: 'consent', // Force consent to get refresh token
            });

            res.redirect(authUrl);
        } catch (error: any) {
            this.logger.error(`Gmail OAuth error: ${error.message}`);
            res.redirect(`/oauth/error?message=${encodeURIComponent(error.message)}`);
        }
    }

    /**
     * Gmail OAuth - Handle callback
     */
    @Get('gmail/callback')
    @ApiOperation({ summary: 'Handle Gmail OAuth callback' })
    async gmailCallback(
        @Query('code') code: string,
        @Query('state') tenantId: string,
        @Query('error') error: string,
        @Res() res: Response,
    ): Promise<void> {
        if (error) {
            this.logger.error(`Gmail OAuth error: ${error}`);
            return res.redirect(`/oauth/error?message=${encodeURIComponent(error)}`);
        }

        if (!code || !tenantId) {
            return res.redirect('/oauth/error?message=Missing code or tenant ID');
        }

        try {
            const oauth2Client = this.getGmailOAuthClient();

            // Exchange code for tokens
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            // Get user email
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const { data } = await oauth2.userinfo.get();

            // Create or update channel
            const credentials = {
                provider: 'gmail',
                email: data.email,
                name: data.name,
                refreshToken: tokens.refresh_token,
                accessToken: tokens.access_token,
                expiryDate: tokens.expiry_date,
            };

            // Check if channel already exists
            const existingChannel = await this.channelRepository.findOne({
                where: {
                    tenantId,
                    channelType: 'email' as any,
                },
            });

            if (existingChannel) {
                // Update existing channel
                existingChannel.credentials = JSON.stringify(credentials);
                existingChannel.name = `${data.email} (Gmail)`;
                await this.channelRepository.save(existingChannel);
            } else {
                // Create new channel
                await this.channelRepository.save({
                    tenantId,
                    channelType: ChannelType.EMAIL,
                    name: `${data.email} (Gmail)`,
                    credentials: JSON.stringify(credentials),
                    status: ChannelStatus.CONNECTED,
                });
            }

            this.logger.log(`Gmail OAuth successful for ${data.email}`);
            res.redirect('/oauth/success');
        } catch (error: any) {
            this.logger.error(`Gmail callback error: ${error.message}`, error.stack);
            res.redirect(`/oauth/error?message=${encodeURIComponent(error.message)}`);
        }
    }




    /**
     * Helper to create Gmail OAuth client
     */
    private getGmailOAuthClient() {
        return new google.auth.OAuth2(
            this.configService.get<string>('GMAIL_CLIENT_ID'),
            this.configService.get<string>('GMAIL_CLIENT_SECRET'),
            this.configService.get<string>('GMAIL_REDIRECT_URI'),
        );
    }
}
