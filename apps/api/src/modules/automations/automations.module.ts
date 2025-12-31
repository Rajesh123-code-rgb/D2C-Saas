import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

// Entities
import { AutomationRule } from './automation-rule.entity';
import { AutomationLog } from './automation-log.entity';
import { Contact } from '../contacts/contact.entity';

// Services
import { AutomationsService } from './automations.service';
import { AutomationTemplatesService } from './templates.service';

// Processor
import { AutomationsProcessor } from './automations.processor';

// Controller
import { AutomationsController } from './automations.controller';

// Dependencies
import { ContactsModule } from '../contacts/contacts.module';
import { WhatsAppModule } from '../channels/whatsapp/whatsapp.module';
import { SuperAdminModule } from '../super-admin/super-admin.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AutomationRule, AutomationLog, Contact]),
        BullModule.registerQueue({
            name: 'automations',
        }),
        forwardRef(() => ContactsModule),
        forwardRef(() => WhatsAppModule),
        SuperAdminModule,
    ],
    providers: [
        AutomationsService,
        AutomationTemplatesService,
        AutomationsProcessor,
    ],
    controllers: [AutomationsController],
    exports: [AutomationsService, AutomationTemplatesService],
})
export class AutomationsModule { }
