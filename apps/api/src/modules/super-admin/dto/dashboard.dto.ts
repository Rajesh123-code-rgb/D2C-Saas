import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';

export class DashboardStatsDto {
    @ApiProperty()
    organizations: {
        total: number;
        active: number;
        trial: number;
    };

    @ApiProperty()
    users: {
        total: number;
        active: number;
    };

    @ApiProperty()
    revenue: {
        today: number;
        month: number;
        growth: number;
    };

    @ApiProperty()
    messages: {
        today: number;
        month: number;
    };

    @ApiProperty()
    conversations: {
        marketing: number;
        utility: number;
        service: number;
    };
}

export class AlertDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    type: 'warning' | 'success' | 'info' | 'error';

    @ApiProperty()
    message: string;

    @ApiProperty()
    time: string;
}
