import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SegmentsService, CreateSegmentDto } from './segments.service';

@ApiTags('Segments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('segments')
export class SegmentsController {
    constructor(private readonly segmentsService: SegmentsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new segment' })
    async create(
        @CurrentUser() user: any,
        @Body() dto: CreateSegmentDto,
    ) {
        return this.segmentsService.create(user.tenantId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all segments' })
    async findAll(@CurrentUser() user: any) {
        return this.segmentsService.findAll(user.tenantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get segment by ID' })
    async findById(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.segmentsService.findById(user.tenantId, id);
    }

    @Get(':id/contacts')
    @ApiOperation({ summary: 'Get contacts in segment' })
    async getContacts(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.segmentsService.getContacts(user.tenantId, id);
    }

    @Post(':id/recalculate')
    @ApiOperation({ summary: 'Recalculate segment count' })
    async recalculate(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        const count = await this.segmentsService.recalculateCount(id);
        return { count };
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a segment' })
    async update(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() updates: Partial<CreateSegmentDto>,
    ) {
        return this.segmentsService.update(user.tenantId, id, updates);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a segment' })
    async delete(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        await this.segmentsService.delete(user.tenantId, id);
        return { success: true };
    }
}
