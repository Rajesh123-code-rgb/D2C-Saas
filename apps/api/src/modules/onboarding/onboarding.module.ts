import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { Tenant } from '../tenants/tenant.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Tenant])],
    providers: [OnboardingService],
    controllers: [OnboardingController],
    exports: [OnboardingService],
})
export class OnboardingModule { }
