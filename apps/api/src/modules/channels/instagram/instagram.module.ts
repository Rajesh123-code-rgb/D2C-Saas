import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Channel } from '../channel.entity';
import { InboxModule } from '../../inbox/inbox.module';
import { ContactsModule } from '../../contacts/contacts.module';
import { InstagramService } from './instagram.service';
import { InstagramController } from './instagram.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Channel]),
        HttpModule,
        InboxModule,
        ContactsModule,
    ],
    providers: [InstagramService],
    controllers: [InstagramController],
    exports: [InstagramService],
})
export class InstagramModule { }
