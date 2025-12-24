import { Controller, Get, Post, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnboardingService, OnboardingStep } from './onboarding.service';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) { }

    @Get('status')
    async getStatus(@Req() req: any) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { error: 'Tenant ID required' };
        }
        const status = await this.onboardingService.getOnboardingStatus(tenantId);
        return {
            ...status,
            currentStepName: this.onboardingService.getCurrentStep(status),
            isComplete: this.onboardingService.isOnboardingComplete(status),
        };
    }

    @Patch('step')
    async updateStep(
        @Req() req: any,
        @Body() body: { step: OnboardingStep; completed?: boolean },
    ) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { error: 'Tenant ID required' };
        }
        const status = await this.onboardingService.updateOnboardingStep(
            tenantId,
            body.step,
            body.completed ?? true,
        );
        return {
            ...status,
            currentStepName: this.onboardingService.getCurrentStep(status),
            isComplete: this.onboardingService.isOnboardingComplete(status),
        };
    }

    @Post('skip-step')
    async skipStep(
        @Req() req: any,
        @Body() body: { step: OnboardingStep },
    ) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { error: 'Tenant ID required' };
        }
        const status = await this.onboardingService.skipStep(tenantId, body.step);
        return {
            ...status,
            currentStepName: this.onboardingService.getCurrentStep(status),
            isComplete: this.onboardingService.isOnboardingComplete(status),
        };
    }

    @Post('skip-all')
    async skipAll(@Req() req: any) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { error: 'Tenant ID required' };
        }
        const status = await this.onboardingService.skipAllOnboarding(tenantId);
        return {
            ...status,
            currentStepName: this.onboardingService.getCurrentStep(status),
            isComplete: this.onboardingService.isOnboardingComplete(status),
        };
    }

    @Post('complete')
    async complete(@Req() req: any) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { error: 'Tenant ID required' };
        }
        const status = await this.onboardingService.completeOnboarding(tenantId);
        return {
            ...status,
            currentStepName: this.onboardingService.getCurrentStep(status),
            isComplete: this.onboardingService.isOnboardingComplete(status),
        };
    }

    @Post('reset')
    async reset(@Req() req: any) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { error: 'Tenant ID required' };
        }
        const status = await this.onboardingService.resetOnboarding(tenantId);
        return {
            ...status,
            currentStepName: this.onboardingService.getCurrentStep(status),
            isComplete: this.onboardingService.isOnboardingComplete(status),
        };
    }
}
