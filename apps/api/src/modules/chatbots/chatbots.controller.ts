import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatbotsService } from './chatbots.service';
import { CreateChatbotDto } from './dto/create-chatbot.dto';
import { UpdateChatbotDto } from './dto/update-chatbot.dto';
import { ChatbotChannel } from './chatbot.entity';

interface AuthenticatedRequest extends Request {
    user: { tenantId: string; userId: string };
}

@ApiTags('Chatbots')
@ApiBearerAuth()
@Controller('chatbots')
@UseGuards(JwtAuthGuard)
export class ChatbotsController {
    constructor(private readonly chatbotsService: ChatbotsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all chatbots for tenant' })
    @ApiQuery({ name: 'channel', required: false, enum: ['whatsapp', 'instagram', 'email'] })
    async findAll(
        @Request() req: AuthenticatedRequest,
        @Query('channel') channel?: ChatbotChannel,
    ) {
        return this.chatbotsService.findAll(req.user.tenantId, channel);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get chatbot statistics' })
    async getStats(@Request() req: AuthenticatedRequest) {
        return this.chatbotsService.getStats(req.user.tenantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get chatbot by ID' })
    async findOne(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.chatbotsService.findOne(id, req.user.tenantId);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new chatbot' })
    async create(
        @Body() dto: CreateChatbotDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.chatbotsService.create(req.user.tenantId, dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a chatbot' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateChatbotDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.chatbotsService.update(id, req.user.tenantId, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a chatbot' })
    async delete(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
    ) {
        await this.chatbotsService.delete(id, req.user.tenantId);
        return { success: true };
    }

    @Post(':id/activate')
    @ApiOperation({ summary: 'Activate a chatbot' })
    async activate(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.chatbotsService.activate(id, req.user.tenantId);
    }

    @Post(':id/deactivate')
    @ApiOperation({ summary: 'Deactivate a chatbot' })
    async deactivate(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.chatbotsService.deactivate(id, req.user.tenantId);
    }

    @Post(':id/duplicate')
    @ApiOperation({ summary: 'Duplicate a chatbot' })
    async duplicate(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.chatbotsService.duplicate(id, req.user.tenantId);
    }
}
