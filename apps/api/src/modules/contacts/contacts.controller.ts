import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContactsController {
    constructor(private contactsService: ContactsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all contacts' })
    async findAll(@CurrentUser('tenantId') tenantId: string, @Query() query: any) {
        return this.contactsService.findAll(tenantId, query);
    }

    @Get('tags')
    @ApiOperation({ summary: 'Get all tags used in contacts' })
    async getAllTags(@CurrentUser('tenantId') tenantId: string) {
        return this.contactsService.getAllTags(tenantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get contact by ID' })
    async findOne(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
        const contact = await this.contactsService.findOne(id, tenantId);
        if (!contact) {
            throw new NotFoundException('Contact not found');
        }
        return contact;
    }

    @Get(':id/profile')
    @ApiOperation({ summary: 'Get unified customer profile with aggregated data' })
    async getProfile(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
        try {
            return await this.contactsService.getProfile(tenantId, id);
        } catch (error) {
            throw new NotFoundException('Contact not found');
        }
    }

    @Get(':id/timeline')
    @ApiOperation({ summary: 'Get activity timeline for a contact' })
    async getTimeline(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
        @Query('limit') limit?: number,
    ) {
        return this.contactsService.getTimeline(tenantId, id, limit || 20);
    }

    @Put(':id/tags')
    @ApiOperation({ summary: 'Update tags for a contact' })
    async updateTags(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
        @Body() body: { tags: string[] },
    ) {
        return this.contactsService.updateTags(tenantId, id, body.tags);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new contact' })
    async create(
        @CurrentUser('tenantId') tenantId: string,
        @Body() createContactDto: {
            name?: string;
            email?: string;
            phone?: string;
            source?: string;
            lifecycle?: string;
            tags?: string[];
        },
    ) {
        return this.contactsService.create(tenantId, createContactDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a contact' })
    async update(
        @Param('id') id: string,
        @CurrentUser('tenantId') tenantId: string,
        @Body() updateContactDto: Partial<{
            name: string;
            email: string;
            phone: string;
            source: string;
            lifecycle: string;
            tags: string[];
        }>,
    ) {
        return this.contactsService.update(id, tenantId, updateContactDto as any);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a contact' })
    async remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
        return this.contactsService.delete(id, tenantId);
    }
}


