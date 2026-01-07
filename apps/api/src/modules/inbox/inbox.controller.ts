import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Query,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { InboxService } from './inbox.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConversationStatus } from './conversation.entity';
import { ChannelType } from '../channels/channel.entity';
import * as fs from 'fs';
import * as path from 'path';

interface ConversationFilters {
    status?: ConversationStatus;
    assignedToId?: string;
    channelType?: ChannelType;
    channelId?: string;
    limit?: number;
    offset?: number;
}

@ApiTags('inbox')
@Controller('inbox')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InboxController {
    constructor(private inboxService: InboxService) { }

    @Get('conversations')
    @ApiOperation({ summary: 'Get conversations with filters' })
    @ApiQuery({ name: 'status', required: false, enum: ConversationStatus })
    @ApiQuery({ name: 'channelType', required: false, enum: ChannelType })
    @ApiQuery({ name: 'channelId', required: false })
    @ApiQuery({ name: 'assignedToId', required: false })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async getConversations(
        @CurrentUser('tenantId') tenantId: string,
        @Query() query: ConversationFilters,
    ) {
        return this.inboxService.getConversations(tenantId, query);
    }

    @Get('conversations/counts')
    @ApiOperation({ summary: 'Get conversation counts by channel and status' })
    async getConversationCounts(@CurrentUser('tenantId') tenantId: string) {
        return this.inboxService.getConversationCounts(tenantId);
    }

    @Get('accounts')
    @ApiOperation({ summary: 'Get connected channel accounts' })
    @ApiQuery({ name: 'channelType', required: false, enum: ChannelType })
    async getChannelAccounts(
        @CurrentUser('tenantId') tenantId: string,
        @Query('channelType') channelType?: ChannelType,
    ) {
        return this.inboxService.getChannelAccounts(tenantId, channelType);
    }

    @Get('conversations/:id')
    @ApiOperation({ summary: 'Get conversation by ID' })
    async getConversation(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
    ) {
        return this.inboxService.getConversation(id, tenantId);
    }

    @Get('conversations/:id/messages')
    @ApiOperation({ summary: 'Get messages for conversation' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    async getMessages(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ) {
        try {
            console.log(`[InboxController] getMessages called: id=${id}, tenantId=${tenantId}`);
            return await this.inboxService.getMessages(id, tenantId, limit, offset);
        } catch (error: any) {
            console.error(`[InboxController] Error in getMessages:`, error);
            throw error;
        }
    }

    @Post('conversations/:id/messages')
    @ApiOperation({ summary: 'Send a message in conversation' })
    async sendMessage(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
        @CurrentUser('userId') userId: string,
        @Body() body: {
            content?: string;
            messageType?: string;
            media?: {
                url?: string;
                mimeType?: string;
                filename?: string;
                caption?: string;
            };
            templateId?: string;
            templateVariables?: Record<string, string>;
        },
    ) {
        return this.inboxService.sendMessage(id, tenantId, userId, body as any);
    }

    @Post('conversations/:id/media')
    @ApiOperation({ summary: 'Upload media for conversation' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadMedia(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
        @UploadedFile() file: any,
    ) {
        // Verify conversation exists and belongs to tenant
        await this.inboxService.getConversation(id, tenantId);

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'uploads', 'media');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `${id}-${timestamp}${ext}`;
        const filepath = path.join(uploadsDir, filename);

        // Save file
        fs.writeFileSync(filepath, file.buffer);

        // Return URL that can be used to send media
        const baseUrl = process.env.API_URL || 'http://localhost:3001';
        const mediaUrl = `${baseUrl}/uploads/media/${filename}`;

        return {
            url: mediaUrl,
            mediaUrl: mediaUrl, // Alias for compatibility
            filename: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
        };
    }

    @Patch('conversations/:id/status')
    @ApiOperation({ summary: 'Update conversation status' })
    async updateStatus(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
        @Body('status') status: ConversationStatus,
    ) {
        return this.inboxService.updateConversationStatus(id, tenantId, status);
    }

    @Patch('conversations/:id/assign')
    @ApiOperation({ summary: 'Assign conversation to agent' })
    async assignConversation(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
        @Body('assignedToId') assignedToId: string | null,
    ) {
        return this.inboxService.assignConversation(id, tenantId, assignedToId);
    }

    @Patch('conversations/:id/read')
    @ApiOperation({ summary: 'Mark conversation as read' })
    async markAsRead(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
    ) {
        return this.inboxService.markAsRead(id, tenantId);
    }

    @Get('conversations/:id/notes')
    @ApiOperation({ summary: 'Get internal notes for conversation' })
    async getInternalNotes(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
    ) {
        return this.inboxService.getInternalNotes(id, tenantId);
    }

    @Post('conversations/:id/notes')
    @ApiOperation({ summary: 'Add internal note to conversation' })
    async addInternalNote(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
        @CurrentUser('userId') userId: string,
        @Body('note') note: string,
    ) {
        return this.inboxService.addInternalNote(id, tenantId, userId, note);
    }

    @Get('agents')
    @ApiOperation({ summary: 'Get available agents for assignment' })
    async getAgents(@CurrentUser('tenantId') tenantId: string) {
        return this.inboxService.getAvailableAgents(tenantId);
    }

    @Get('chatbots')
    @ApiOperation({ summary: 'Get active chatbots for assignment' })
    async getChatbots(@CurrentUser('tenantId') tenantId: string) {
        return this.inboxService.getActiveChatbots(tenantId);
    }

    @Patch('conversations/:id/chatbot')
    @ApiOperation({ summary: 'Set or clear chatbot for conversation' })
    async setChatbot(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
        @Body('chatbotId') chatbotId: string | null,
    ) {
        return this.inboxService.setChatbot(id, tenantId, chatbotId);
    }
}

