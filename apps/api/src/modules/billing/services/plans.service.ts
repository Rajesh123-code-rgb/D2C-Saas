import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan, PlanTier, DEFAULT_PLANS, PlanFeatures } from '../entities/plan.entity';

@Injectable()
export class PlansService implements OnModuleInit {
    constructor(
        @InjectRepository(SubscriptionPlan)
        private readonly planRepository: Repository<SubscriptionPlan>,
    ) { }

    async onModuleInit() {
        // Seed default plans if they don't exist
        await this.seedDefaultPlans();
    }

    private async seedDefaultPlans(): Promise<void> {
        for (const planData of DEFAULT_PLANS) {
            const existing = await this.planRepository.findOne({
                where: { tier: planData.tier },
            });

            if (!existing) {
                const plan = this.planRepository.create(planData);
                await this.planRepository.save(plan);
                console.log(`Seeded plan: ${planData.displayName}`);
            }
        }
    }

    async findAll(): Promise<SubscriptionPlan[]> {
        return this.planRepository.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC' },
        });
    }

    async findByTier(tier: PlanTier): Promise<SubscriptionPlan | null> {
        return this.planRepository.findOne({
            where: { tier, isActive: true },
        });
    }

    async findById(id: string): Promise<SubscriptionPlan | null> {
        return this.planRepository.findOne({
            where: { id },
        });
    }

    async getFeatures(tier: PlanTier): Promise<PlanFeatures | null> {
        const plan = await this.findByTier(tier);
        return plan?.features || null;
    }

    async updatePlan(
        id: string,
        updates: Partial<SubscriptionPlan>,
    ): Promise<SubscriptionPlan> {
        await this.planRepository.update(id, updates);
        return this.findById(id) as Promise<SubscriptionPlan>;
    }
}
