import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotsController } from './chatbots.controller';
import { ChatbotsService } from './chatbots.service';
import { ChatbotRuntimeService } from './chatbot-runtime.service';
import { Chatbot } from './chatbot.entity';
import { ChatbotSession } from './chatbot-session.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Chatbot, ChatbotSession]),
    ],
    controllers: [ChatbotsController],
    providers: [ChatbotsService, ChatbotRuntimeService],
    exports: [ChatbotsService, ChatbotRuntimeService],
})
export class ChatbotsModule { }

