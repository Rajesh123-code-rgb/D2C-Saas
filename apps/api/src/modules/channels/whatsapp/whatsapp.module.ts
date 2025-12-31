import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Channel } from '../channel.entity';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';
import { InboxModule } from '../../inbox/inbox.module';
import { ContactsModule } from '../../contacts/contacts.module';
import { Message } from '../../inbox/message.entity';

import { SuperAdminModule } from '../../super-admin/super-admin.module';

import { WhatsAppTemplate } from './entities/whatsapp-template.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Channel, Message, WhatsAppTemplate]),
        HttpModule,
        InboxModule,
        ContactsModule,
        SuperAdminModule,
    ],
    controllers: [WhatsAppController],
    providers: [WhatsAppService, WhatsAppWebhookService],
    exports: [WhatsAppService],
})
export class WhatsAppModule { }
