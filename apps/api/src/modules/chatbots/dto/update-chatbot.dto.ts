import { IsString, IsOptional, IsEnum, IsObject, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    ChatbotStatus,
    ChatbotTriggerConfig,
    ChatbotFlowNode,
    ChatbotFlowConnection
} from '../chatbot.entity';

export class UpdateChatbotDto {
    @ApiPropertyOptional({ description: 'Chatbot name' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Chatbot description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Chatbot status', enum: ChatbotStatus })
    @IsOptional()
    @IsEnum(ChatbotStatus)
    status?: ChatbotStatus;

    @ApiPropertyOptional({ description: 'Specific channel ID to associate with' })
    @IsOptional()
    @IsString()
    channelId?: string;

    @ApiPropertyOptional({ description: 'Trigger configuration' })
    @IsOptional()
    @IsObject()
    triggerConfig?: ChatbotTriggerConfig;

    @ApiPropertyOptional({ description: 'Flow nodes' })
    @IsOptional()
    @IsArray()
    nodes?: ChatbotFlowNode[];

    @ApiPropertyOptional({ description: 'Flow connections' })
    @IsOptional()
    @IsArray()
    connections?: ChatbotFlowConnection[];

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

    @ApiPropertyOptional({ description: 'Business hours configuration' })
    @IsOptional()
    @IsObject()
    businessHours?: {
        enabled: boolean;
        timezone: string;
        schedule: Array<{
            day: number;
            start: string;
            end: string;
        }>;
    };

    @ApiPropertyOptional({ description: 'Variables used in the flow' })
    @IsOptional()
    @IsArray()
    variables?: Array<{
        name: string;
        type: 'text' | 'number' | 'email' | 'phone' | 'date';
        defaultValue?: string;
    }>;
}
