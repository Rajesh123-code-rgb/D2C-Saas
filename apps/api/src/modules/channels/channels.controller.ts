import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest {
    user: {
        tenantId: string;
        userId: string;
    };
}

@ApiTags('channels')
@ApiBearerAuth()
@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
    constructor(private readonly channelsService: ChannelsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all channels for tenant' })
    async findAll(@Request() req: AuthenticatedRequest) {
        return this.channelsService.findAll(req.user.tenantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get channel by ID' })
    async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
        return this.channelsService.findOne(id, req.user.tenantId);
    }

    @Post()
    @ApiOperation({ summary: 'Connect a new channel' })
    async create(@Body() createChannelDto: CreateChannelDto, @Request() req: AuthenticatedRequest) {
        return this.channelsService.create(req.user.tenantId, createChannelDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update channel configuration' })
    async update(
        @Param('id') id: string,
        @Body() updateChannelDto: UpdateChannelDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.channelsService.update(id, req.user.tenantId, updateChannelDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Disconnect channel' })
    async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
        await this.channelsService.remove(id, req.user.tenantId);
        return { message: 'Channel disconnected successfully' };
    }

    @Post(':id/test')
    @ApiOperation({ summary: 'Test channel connection' })
    async testConnection(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
        return this.channelsService.testConnection(id, req.user.tenantId);
    }

    @Get(':id/compliance')
    @ApiOperation({ summary: 'Check WhatsApp channel compliance and readiness to receive messages' })
    async checkCompliance(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
        return this.channelsService.checkWhatsAppCompliance(id, req.user.tenantId);
    }
}
