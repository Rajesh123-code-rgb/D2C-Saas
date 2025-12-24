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

@Module({
    imports: [
        TypeOrmModule.forFeature([Channel, Message]),
        HttpModule,
        InboxModule,
        ContactsModule,
    ],
    controllers: [WhatsAppController],
    providers: [WhatsAppService, WhatsAppWebhookService],
    exports: [WhatsAppService],
})
export class WhatsAppModule { }
