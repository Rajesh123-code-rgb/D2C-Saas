import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, OnboardingStatus } from '../tenants/tenant.entity';

export const ONBOARDING_STEPS = [
    'welcome',
    'connect-store',
    'connect-channel',
    'invite-team',
    'complete',
] as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[number];

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(
        @InjectRepository(Tenant)
        private tenantRepository: Repository<Tenant>,
    ) { }

    private getDefaultOnboardingStatus(): OnboardingStatus {
        return {
            completed: false,
            skipped: false,
            currentStep: 0,
            stepsCompleted: [],
            stepsSkipped: [],
            storeConnected: false,
            channelConnected: false,
            teamInvited: false,
            startedAt: new Date().toISOString(),
        };
    }

    async getOnboardingStatus(tenantId: string): Promise<OnboardingStatus> {
        const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        if (!tenant.onboardingStatus) {
            // Initialize onboarding status
            const defaultStatus = this.getDefaultOnboardingStatus();
            await this.tenantRepository.update(tenantId, { onboardingStatus: defaultStatus });
            return defaultStatus;
        }

        return tenant.onboardingStatus;
    }

    async updateOnboardingStep(
        tenantId: string,
        step: OnboardingStep,
        completed: boolean = true,
    ): Promise<OnboardingStatus> {
        const status = await this.getOnboardingStatus(tenantId);
        const stepIndex = ONBOARDING_STEPS.indexOf(step);

        if (completed) {
            if (!status.stepsCompleted.includes(step)) {
                status.stepsCompleted.push(step);
            }
            // Remove from skipped if it was skipped before
            status.stepsSkipped = status.stepsSkipped.filter(s => s !== step);
        }

        // Update current step to next
        if (stepIndex >= status.currentStep) {
            status.currentStep = stepIndex + 1;
        }

        // Update specific flags
        if (step === 'connect-store') {
            status.storeConnected = completed;
        } else if (step === 'connect-channel') {
            status.channelConnected = completed;
        } else if (step === 'invite-team') {
            status.teamInvited = completed;
        }

        // Check if all steps are done (completed or skipped)
        const allSteps = ONBOARDING_STEPS.filter(s => s !== 'complete');
        const allDone = allSteps.every(
            s => status.stepsCompleted.includes(s) || status.stepsSkipped.includes(s)
        );

        if (allDone || step === 'complete') {
            status.completed = true;
            status.completedAt = new Date().toISOString();
        }

        await this.tenantRepository.update(tenantId, { onboardingStatus: status });
        return status;
    }

    async skipStep(tenantId: string, step: OnboardingStep): Promise<OnboardingStatus> {
        const status = await this.getOnboardingStatus(tenantId);
        const stepIndex = ONBOARDING_STEPS.indexOf(step);

        if (!status.stepsSkipped.includes(step)) {
            status.stepsSkipped.push(step);
        }

        // Update current step to next
        if (stepIndex >= status.currentStep) {
            status.currentStep = stepIndex + 1;
        }

        // Check if all steps are done
        const allSteps = ONBOARDING_STEPS.filter(s => s !== 'complete');
        const allDone = allSteps.every(
            s => status.stepsCompleted.includes(s) || status.stepsSkipped.includes(s)
        );

        if (allDone) {
            status.completed = true;
            status.completedAt = new Date().toISOString();
        }

        await this.tenantRepository.update(tenantId, { onboardingStatus: status });
        return status;
    }

    async skipAllOnboarding(tenantId: string): Promise<OnboardingStatus> {
        const status = await this.getOnboardingStatus(tenantId);

        // Mark all steps as skipped (except complete)
        const stepsToSkip = ONBOARDING_STEPS.filter(s => s !== 'complete');
        status.stepsSkipped = stepsToSkip;
        status.skipped = true;
        status.completed = true;
        status.currentStep = ONBOARDING_STEPS.length;
        status.completedAt = new Date().toISOString();

        await this.tenantRepository.update(tenantId, { onboardingStatus: status });
        return status;
    }

    async completeOnboarding(tenantId: string): Promise<OnboardingStatus> {
        const status = await this.getOnboardingStatus(tenantId);

        status.completed = true;
        status.completedAt = new Date().toISOString();
        status.currentStep = ONBOARDING_STEPS.length;

        // Add 'complete' to stepsCompleted if not already
        if (!status.stepsCompleted.includes('complete')) {
            status.stepsCompleted.push('complete');
        }

        await this.tenantRepository.update(tenantId, { onboardingStatus: status });
        return status;
    }

    async resetOnboarding(tenantId: string): Promise<OnboardingStatus> {
        const defaultStatus = this.getDefaultOnboardingStatus();
        await this.tenantRepository.update(tenantId, { onboardingStatus: defaultStatus });
        return defaultStatus;
    }

    isOnboardingComplete(status: OnboardingStatus): boolean {
        return status.completed || status.skipped;
    }

    getCurrentStep(status: OnboardingStatus): OnboardingStep {
        const index = Math.min(status.currentStep, ONBOARDING_STEPS.length - 1);
        return ONBOARDING_STEPS[index];
    }
}
