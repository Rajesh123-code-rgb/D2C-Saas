import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

import { Campaign, CampaignVariant, CampaignExecution } from './entities/campaign.entity';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsProcessor } from './campaigns.processor';
import { SegmentsModule } from '../segments/segments.module';
import { WhatsAppModule } from '../channels/whatsapp/whatsapp.module';
import { ContactsModule } from '../contacts/contacts.module';
import { Channel } from '../channels/channel.entity';
import { Contact } from '../contacts/contact.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Campaign,
            CampaignVariant,
            CampaignExecution,
            Channel,
            Contact,
        ]),
        BullModule.registerQueue({
            name: 'campaigns',
        }),
        ScheduleModule.forRoot(),
        forwardRef(() => SegmentsModule),
        forwardRef(() => WhatsAppModule),
        forwardRef(() => ContactsModule),
    ],
    providers: [CampaignsService, CampaignsProcessor],
    controllers: [CampaignsController],
    exports: [CampaignsService],
})
export class CampaignsModule { }

