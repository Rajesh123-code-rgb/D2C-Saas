import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { Channel } from '../channels/channel.entity';
import { User } from '../users/user.entity';
import { Chatbot } from '../chatbots/chatbot.entity';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { InboxGateway } from './inbox.gateway';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Conversation, Message, Channel, User, Chatbot]),
        ContactsModule,
    ],
    controllers: [InboxController],
    providers: [InboxService, InboxGateway],
    exports: [InboxService, TypeOrmModule],
})
export class InboxModule { }

