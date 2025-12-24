import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateChannelDto } from './create-channel.dto';
import { ChannelStatus } from '../channel.entity';

export class UpdateChannelDto extends PartialType(CreateChannelDto) {
    @IsEnum(ChannelStatus)
    @IsOptional()
    status?: ChannelStatus;
}
