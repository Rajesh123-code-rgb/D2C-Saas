import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalSeoSettings } from '../entities/global-seo-settings.entity';

@ApiTags('Public Settings')
@Controller('public')
export class PublicSettingsController {
    constructor(
        @InjectRepository(GlobalSeoSettings)
        private readonly seoSettingsRepository: Repository<GlobalSeoSettings>,
    ) { }

    @Get('seo')
    @ApiOperation({ summary: 'Get public SEO settings' })
    @ApiResponse({ status: 200, description: 'SEO settings' })
    async getSeoSettings(): Promise<GlobalSeoSettings> {
        const settings = await this.seoSettingsRepository.findOne({ where: {} });
        return settings || ({} as GlobalSeoSettings);
    }
}
