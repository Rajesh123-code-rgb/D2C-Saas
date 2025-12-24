import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import {
    AIAgent,
    AITask,
    AIPrediction,
    SendTimeInsight,
} from './entities/ai.entity';
import { MessageGeneratorService } from './services/message-generator.service';
import { SendTimeOptimizerService } from './services/send-time-optimizer.service';
import { PredictiveScoringService } from './services/predictive-scoring.service';
import { NextBestActionService } from './services/next-best-action.service';
import {
    AIMessageController,
    AISendTimeController,
    AIScoresController,
    AINextBestActionController,
} from './ai.controller';
import { ContactsModule } from '../contacts/contacts.module';
import { EcommerceModule } from '../ecommerce/ecommerce.module';
import { InboxModule } from '../inbox/inbox.module';
import { Contact } from '../contacts/contact.entity';
import { EcommerceOrder } from '../ecommerce/entities/order.entity';
import { AbandonedCart } from '../ecommerce/entities/cart.entity';
import { CustomerHealthScore } from '../ecommerce/entities/customer-health.entity';
import { Message } from '../inbox/message.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            AIAgent, AITask, AIPrediction, SendTimeInsight,
            Contact, EcommerceOrder, AbandonedCart, CustomerHealthScore, Message,
        ]),
        ScheduleModule.forRoot(),
        forwardRef(() => ContactsModule),
        forwardRef(() => EcommerceModule),
        forwardRef(() => InboxModule),
    ],
    providers: [
        MessageGeneratorService,
        SendTimeOptimizerService,
        PredictiveScoringService,
        NextBestActionService,
    ],
    controllers: [
        AIMessageController,
        AISendTimeController,
        AIScoresController,
        AINextBestActionController,
    ],
    exports: [
        MessageGeneratorService,
        SendTimeOptimizerService,
        PredictiveScoringService,
        NextBestActionService,
    ],
})
export class AIModule { }
