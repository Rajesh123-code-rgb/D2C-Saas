import { IsString, IsOptional, IsEnum, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatbotChannel, ChatbotTriggerConfig, ChatbotFlowNode, ChatbotFlowConnection } from '../chatbot.entity';

export class CreateChatbotDto {
    @ApiProperty({ description: 'Chatbot name' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'Chatbot description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Channel type', enum: ['whatsapp', 'instagram', 'email'] })
    @IsString()
    channel: ChatbotChannel;

    @ApiPropertyOptional({ description: 'Specific channel ID to associate with' })
    @IsOptional()
    @IsString()
    channelId?: string;

    @ApiPropertyOptional({ description: 'Trigger configuration' })
    @IsOptional()
    @IsObject()
    triggerConfig?: ChatbotTriggerConfig;

    @ApiPropertyOptional({ description: 'Welcome message' })
    @IsOptional()
    @IsString()
    welcomeMessage?: string;

    @ApiPropertyOptional({ description: 'Fallback message when bot does not understand' })
    @IsOptional()
    @IsString()
    fallbackMessage?: string;

    @ApiPropertyOptional({ description: 'Message for outside business hours' })
    @IsOptional()
    @IsString()
    offHoursMessage?: string;
}
