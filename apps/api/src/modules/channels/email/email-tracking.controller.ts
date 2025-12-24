import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../inbox/message.entity';

@ApiTags('Email Tracking')
@Controller('email/track')
export class EmailTrackingController {
    private readonly logger = new Logger(EmailTrackingController.name);

    constructor(
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
    ) { }

    /**
     * Track email opens via invisible tracking pixel
     */
    @Get(':messageId/open')
    @ApiOperation({ summary: 'Track email open (returns 1x1 transparent GIF)' })
    async trackOpen(
        @Param('messageId') messageId: string,
        @Res() res: Response,
    ): Promise<void> {
        try {
            // Find message by ID
            const message = await this.messageRepository.findOne({
                where: { id: messageId },
            });

            if (message) {
                // Update tracking data
                if (!message.openedAt) {
                    message.openedAt = new Date();
                }
                message.openCount = (message.openCount || 0) + 1;

                await this.messageRepository.save(message);
                this.logger.log(`Email opened: ${messageId} (count: ${message.openCount})`);
            }
        } catch (error: any) {
            this.logger.error(`Error tracking email open: ${error.message}`);
            // Don't throw error - still return pixel
        }

        // Return 1x1 transparent GIF
        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64',
        );

        res.set({
            'Content-Type': 'image/gif',
            'Content-Length': pixel.length.toString(),
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        });

        res.send(pixel);
    }
}
