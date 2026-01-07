import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel } from '../channel.entity';
import { InboxModule } from '../../inbox/inbox.module';
import { ContactsModule } from '../../contacts/contacts.module';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTrackingController } from './email-tracking.controller';
import { EmailOAuthController } from './oauth.controller';
import { Message } from '../../inbox/message.entity';
import { EmailTemplate } from './entities/email-template.entity';

import { SuperAdminModule } from '../../super-admin/super-admin.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Channel, Message, EmailTemplate]),
        InboxModule,
        ContactsModule,
        SuperAdminModule,
    ],
    providers: [EmailService],
    controllers: [
        EmailController,
        EmailTemplatesController, // New controller
        EmailTrackingController,
        EmailOAuthController
    ],
    exports: [EmailService],
})
export class EmailModule { }
