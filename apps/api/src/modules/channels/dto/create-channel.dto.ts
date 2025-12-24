import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';
import { ChannelType } from '../channel.entity';

export class CreateChannelDto {
    @IsEnum(ChannelType)
    @IsNotEmpty()
    channelType: ChannelType;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsObject()
    @IsNotEmpty()
    credentials: Record<string, any>;

    @IsObject()
    @IsOptional()
    settings?: Record<string, any>;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
