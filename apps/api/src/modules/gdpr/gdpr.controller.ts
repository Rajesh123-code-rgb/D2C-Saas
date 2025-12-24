import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { GdprService } from './gdpr.service';

@Controller('api/v1/gdpr')
export class GdprController {
    constructor(private readonly gdprService: GdprService) { }

    @Post('export/:contactId')
    async exportData(
        @Query('tenantId') tenantId: string,
        @Param('contactId') contactId: string,
        @Query('userId') userId: string,
    ) {
        return this.gdprService.exportContactData(tenantId, contactId, userId);
    }

    @Post('export/:contactId/download')
    async downloadExport(
        @Query('tenantId') tenantId: string,
        @Param('contactId') contactId: string,
        @Query('userId') userId: string,
        @Res() res: Response,
    ) {
        const data = await this.gdprService.exportContactData(tenantId, contactId, userId);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=gdpr-export-${contactId}.json`);
        return res.json(data);
    }

    @Post('delete/:contactId')
    async deleteData(
        @Query('tenantId') tenantId: string,
        @Param('contactId') contactId: string,
        @Query('userId') userId: string,
    ) {
        return this.gdprService.deleteContactData(tenantId, contactId, userId);
    }

    @Post('anonymize/:contactId')
    async anonymizeData(
        @Query('tenantId') tenantId: string,
        @Param('contactId') contactId: string,
        @Query('userId') userId: string,
    ) {
        return this.gdprService.anonymizeContactData(tenantId, contactId, userId);
    }

    @Get('consent/:contactId')
    async getConsentHistory(
        @Query('tenantId') tenantId: string,
        @Param('contactId') contactId: string,
    ) {
        return this.gdprService.getConsentHistory(tenantId, contactId);
    }
}
