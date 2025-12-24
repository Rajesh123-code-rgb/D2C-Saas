import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomWebhook, WebhookLog } from './entities/webhook.entity';
import { WebhooksService } from './services/webhooks.service';
import { WebhooksController } from './controllers/webhooks.controller';

@Module({
    imports: [TypeOrmModule.forFeature([CustomWebhook, WebhookLog])],
    providers: [WebhooksService],
    controllers: [WebhooksController],
    exports: [WebhooksService],
})
export class IntegrationsModule { }
