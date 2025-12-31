import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from '../services/feature-flags.service';

export const FEATURE_KEY = 'required_feature';

/**
 * Decorator to require a specific feature to be enabled for the tenant
 * Usage: @RequireFeature('automation.enabled')
 */
export const RequireFeature = (featureKey: string) => SetMetadata(FEATURE_KEY, featureKey);

/**
 * Guard that checks if a feature is enabled for the current tenant
 * The request must have tenant and the tenant must have a subscription plan
 */
@Injectable()
export class FeatureGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private featureFlagsService: FeatureFlagsService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFeature = this.reflector.get<string>(FEATURE_KEY, context.getHandler());

        if (!requiredFeature) {
            // No feature required, allow access
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const tenantId = request.tenantId || request.user?.tenantId;
        const tenantPlan = request.tenantPlan || request.user?.tenant?.subscriptionTier || 'free';

        if (!tenantId) {
            throw new ForbiddenException('Tenant context required');
        }

        const featureCheck = await this.featureFlagsService.isFeatureEnabled(
            requiredFeature,
            tenantId,
            tenantPlan,
        );

        if (!featureCheck.isEnabled) {
            throw new ForbiddenException(
                `This feature (${requiredFeature}) is not available on your current plan. Please upgrade to access this feature.`,
            );
        }

        return true;
    }
}

/**
 * Guard that checks multiple features at once
 * Usage: @RequireFeatures(['feature1', 'feature2'])
 */
export const FEATURES_KEY = 'required_features';

export const RequireFeatures = (featureKeys: string[]) => SetMetadata(FEATURES_KEY, featureKeys);

@Injectable()
export class FeaturesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private featureFlagsService: FeatureFlagsService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFeatures = this.reflector.get<string[]>(FEATURES_KEY, context.getHandler());

        if (!requiredFeatures || requiredFeatures.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const tenantId = request.tenantId || request.user?.tenantId;
        const tenantPlan = request.tenantPlan || request.user?.tenant?.subscriptionTier || 'free';

        if (!tenantId) {
            throw new ForbiddenException('Tenant context required');
        }

        const features = await this.featureFlagsService.checkMultipleFeatures(
            tenantId,
            tenantPlan,
            requiredFeatures,
        );

        const disabledFeatures = requiredFeatures.filter(key => !features[key]);

        if (disabledFeatures.length > 0) {
            throw new ForbiddenException(
                `The following features are not available on your current plan: ${disabledFeatures.join(', ')}. Please upgrade to access these features.`,
            );
        }

        return true;
    }
}
