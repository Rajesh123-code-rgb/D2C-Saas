import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MessageGeneratorService, MessageGenerationInput } from './services/message-generator.service';
import { SendTimeOptimizerService } from './services/send-time-optimizer.service';
import { PredictiveScoringService } from './services/predictive-scoring.service';
import { NextBestActionService } from './services/next-best-action.service';

@ApiTags('AI - Message Generation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/messages')
export class AIMessageController {
    constructor(private readonly messageService: MessageGeneratorService) { }

    @Post('generate')
    @ApiOperation({ summary: 'Generate personalized message' })
    async generateMessage(
        @CurrentUser() user: any,
        @Body() body: { agentId: string; input: MessageGenerationInput },
    ) {
        return this.messageService.generateMessage(user.tenantId, body.agentId, body.input);
    }

    @Post('ab-variants')
    @ApiOperation({ summary: 'Generate A/B test variants' })
    async generateVariants(
        @CurrentUser() user: any,
        @Body() body: { baseMessage: string; numVariants?: number },
    ) {
        return this.messageService.generateABVariants(
            user.tenantId,
            body.baseMessage,
            body.numVariants,
        );
    }
}

@ApiTags('AI - Send Time Optimization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/send-time')
export class AISendTimeController {
    constructor(private readonly sendTimeService: SendTimeOptimizerService) { }

    @Get('optimal/:contactId')
    @ApiOperation({ summary: 'Get optimal send time for contact' })
    async getOptimalTime(
        @CurrentUser() user: any,
        @Param('contactId') contactId: string,
    ) {
        return this.sendTimeService.getOptimalSendTime(user.tenantId, contactId);
    }

    @Get('next-window/:contactId')
    @ApiOperation({ summary: 'Get next optimal send window' })
    async getNextWindow(
        @CurrentUser() user: any,
        @Param('contactId') contactId: string,
    ) {
        const nextWindow = await this.sendTimeService.getNextOptimalWindow(user.tenantId, contactId);
        return { nextOptimalTime: nextWindow };
    }

    @Post('calculate/:contactId')
    @ApiOperation({ summary: 'Calculate optimal time for contact' })
    async calculateOptimalTime(
        @CurrentUser() user: any,
        @Param('contactId') contactId: string,
    ) {
        return this.sendTimeService.calculateOptimalTime(user.tenantId, contactId);
    }
}

@ApiTags('AI - Predictive Scoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/scores')
export class AIScoresController {
    constructor(private readonly scoringService: PredictiveScoringService) { }

    @Get('lead/:contactId')
    @ApiOperation({ summary: 'Get lead score for contact' })
    async getLeadScore(
        @CurrentUser() user: any,
        @Param('contactId') contactId: string,
    ) {
        return this.scoringService.calculateLeadScore(user.tenantId, contactId);
    }

    @Get('churn/:contactId')
    @ApiOperation({ summary: 'Get churn risk for contact' })
    async getChurnRisk(
        @CurrentUser() user: any,
        @Param('contactId') contactId: string,
    ) {
        return this.scoringService.calculateChurnRisk(user.tenantId, contactId);
    }

    @Get('intent/:contactId')
    @ApiOperation({ summary: 'Get purchase intent for contact' })
    async getPurchaseIntent(
        @CurrentUser() user: any,
        @Param('contactId') contactId: string,
    ) {
        return this.scoringService.detectPurchaseIntent(user.tenantId, contactId);
    }

    @Get('all/:contactId')
    @ApiOperation({ summary: 'Get all predictive scores for contact' })
    async getAllScores(
        @CurrentUser() user: any,
        @Param('contactId') contactId: string,
    ) {
        const [leadScore, churnRisk, purchaseIntent] = await Promise.all([
            this.scoringService.calculateLeadScore(user.tenantId, contactId),
            this.scoringService.calculateChurnRisk(user.tenantId, contactId),
            this.scoringService.detectPurchaseIntent(user.tenantId, contactId),
        ]);

        return { leadScore, churnRisk, purchaseIntent };
    }
}

@ApiTags('AI - Next Best Action')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/next-best-action')
export class AINextBestActionController {
    constructor(private readonly nbaService: NextBestActionService) { }

    @Get(':contactId')
    @ApiOperation({ summary: 'Get next best actions for contact' })
    async getNextBestActions(
        @CurrentUser() user: any,
        @Param('contactId') contactId: string,
        @Query('limit') limit?: number,
    ) {
        return this.nbaService.getNextBestActions(user.tenantId, contactId, limit || 5);
    }

    @Post(':contactId/execute')
    @ApiOperation({ summary: 'Execute a recommended action' })
    async executeAction(
        @CurrentUser() user: any,
        @Param('contactId') contactId: string,
        @Body() action: any,
    ) {
        return this.nbaService.executeAction(user.tenantId, contactId, action);
    }
}
