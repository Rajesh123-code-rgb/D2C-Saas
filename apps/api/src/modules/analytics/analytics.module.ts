import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Campaign, CampaignExecution } from '../campaigns/entities/campaign.entity';
import { Conversation } from '../inbox/conversation.entity';
import { Message } from '../inbox/message.entity';
import { Contact } from '../contacts/contact.entity';
import { EcommerceOrder } from '../ecommerce/entities/order.entity';
import { AutomationRule } from '../automations/automation-rule.entity';
import { AutomationLog } from '../automations/automation-log.entity';
import { Channel } from '../channels/channel.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Campaign,
            CampaignExecution,
            Conversation,
            Message,
            Contact,
            EcommerceOrder,
            AutomationRule,
            AutomationLog,
            Channel,
        ]),
    ],
    providers: [AnalyticsService],
    controllers: [AnalyticsController],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }
