import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Body,
    Query,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Request } from 'express';
import { SuperAdminGuard, RequireSuperAdminPermission } from '../guards/super-admin.guard';
import {
    OrganizationFilterDto,
    OrganizationResponseDto,
    PaginatedOrganizationsDto,
    SuspendOrganizationDto,
    UpdateOrganizationPlanDto,
} from '../dto/organization.dto';
import { Tenant, TenantStatus, SubscriptionTier } from '../../tenants/tenant.entity';
import { User, UserStatus } from '../../users/user.entity';
import { Channel } from '../../channels/channel.entity';
import { MessageWallet } from '../entities/message-wallet.entity';
import { AdminAuditLog, AdminAuditAction, AdminResourceType } from '../entities/admin-audit-log.entity';

@ApiTags('Admin Organizations')
@Controller('admin/organizations')
@UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
@ApiBearerAuth()
export class OrganizationsController {
    constructor(
        @InjectRepository(Tenant)
        private readonly tenantRepository: Repository<Tenant>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Channel)
        private readonly channelRepository: Repository<Channel>,
        @InjectRepository(MessageWallet)
        private readonly walletRepository: Repository<MessageWallet>,
        @InjectRepository(AdminAuditLog)
        private readonly auditLogRepository: Repository<AdminAuditLog>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get all organizations with filters' })
    @ApiResponse({ status: 200, description: 'Paginated organizations list' })
    async getAll(
        @Query() filter: OrganizationFilterDto,
    ): Promise<PaginatedOrganizationsDto> {
        const { search, status, tier, page = 1, limit = 10 } = filter;

        const queryBuilder = this.tenantRepository.createQueryBuilder('tenant');

        if (search) {
            queryBuilder.andWhere(
                '(tenant.name ILIKE :search OR tenant.slug ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        if (status) {
            queryBuilder.andWhere('tenant.status = :status', { status });
        }

        if (tier) {
            queryBuilder.andWhere('tenant.subscriptionTier = :tier', { tier });
        }

        queryBuilder.orderBy('tenant.createdAt', 'DESC');
        queryBuilder.skip((page - 1) * limit).take(limit);

        const [tenants, total] = await queryBuilder.getManyAndCount();

        // Get additional data for each tenant
        const tenantIds = tenants.map(t => t.id);

        // Get user counts
        const userCounts = await this.userRepository
            .createQueryBuilder('user')
            .select('user.tenantId', 'tenantId')
            .addSelect('COUNT(*)', 'count')
            .where('user.tenantId IN (:...ids)', { ids: tenantIds.length ? tenantIds : [''] })
            .groupBy('user.tenantId')
            .getRawMany();

        // Get channel counts
        const channelCounts = await this.channelRepository
            .createQueryBuilder('channel')
            .select('channel.tenantId', 'tenantId')
            .addSelect('COUNT(*)', 'count')
            .where('channel.tenantId IN (:...ids)', { ids: tenantIds.length ? tenantIds : [''] })
            .groupBy('channel.tenantId')
            .getRawMany();

        // Get wallet balances
        const walletBalances = await this.walletRepository
            .createQueryBuilder('wallet')
            .select('wallet.tenantId', 'tenantId')
            .addSelect('wallet.creditBalance', 'creditBalance')
            .where('wallet.tenantId IN (:...ids)', { ids: tenantIds.length ? tenantIds : [''] })
            .getRawMany();

        const userCountMap = new Map(userCounts.map(u => [u.tenantId, parseInt(u.count)]));
        const channelCountMap = new Map(channelCounts.map(c => [c.tenantId, parseInt(c.count)]));
        const walletMap = new Map(walletBalances.map(w => [w.tenantId, parseFloat(w.creditBalance) || 0]));

        const data: OrganizationResponseDto[] = tenants.map(tenant => ({
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status as any,
            subscriptionTier: tenant.subscriptionTier as any,
            usersCount: userCountMap.get(tenant.id) || 0,
            channelsCount: channelCountMap.get(tenant.id) || 0,
            creditsBalance: walletMap.get(tenant.id) || 0,
            messagesThisMonth: 0, // TODO: Calculate from conversations
            createdAt: tenant.createdAt.toISOString(),
            lastActiveAt: tenant.updatedAt.toISOString(),
        }));

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get organization by ID' })
    @ApiResponse({ status: 200, description: 'Organization details' })
    async getById(@Param('id') id: string): Promise<OrganizationResponseDto> {
        const tenant = await this.tenantRepository.findOneOrFail({ where: { id } });

        const [usersCount, channelsCount, wallet] = await Promise.all([
            this.userRepository.count({ where: { tenantId: id } }),
            this.channelRepository.count({ where: { tenantId: id } }),
            this.walletRepository.findOne({ where: { tenantId: id } }),
        ]);

        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status as any,
            subscriptionTier: tenant.subscriptionTier as any,
            usersCount,
            channelsCount,
            creditsBalance: wallet?.creditBalance || 0,
            messagesThisMonth: 0,
            createdAt: tenant.createdAt.toISOString(),
            lastActiveAt: tenant.updatedAt.toISOString(),
        };
    }

    @Post(':id/suspend')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Suspend an organization' })
    @ApiResponse({ status: 200, description: 'Organization suspended' })
    async suspend(
        @Param('id') id: string,
        @Body() dto: SuspendOrganizationDto,
        @Req() req: Request,
    ) {
        const tenant = await this.tenantRepository.findOneOrFail({ where: { id } });
        const previousStatus = tenant.status;

        tenant.status = TenantStatus.SUSPENDED;
        await this.tenantRepository.save(tenant);

        // Log the action
        await this.createAuditLog(req, AdminAuditAction.SUSPEND, 'tenant', id, tenant.name, {
            previousValues: { status: previousStatus },
            newValues: { status: TenantStatus.SUSPENDED },
            description: `Suspended organization: ${tenant.name}. Reason: ${dto.reason}`,
        });

        return { success: true, message: `Organization ${tenant.name} has been suspended` };
    }

    @Post(':id/reactivate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reactivate a suspended organization' })
    @ApiResponse({ status: 200, description: 'Organization reactivated' })
    async reactivate(
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        const tenant = await this.tenantRepository.findOneOrFail({ where: { id } });
        const previousStatus = tenant.status;

        tenant.status = TenantStatus.ACTIVE;
        await this.tenantRepository.save(tenant);

        // Log the action
        await this.createAuditLog(req, AdminAuditAction.UNSUSPEND, 'tenant', id, tenant.name, {
            previousValues: { status: previousStatus },
            newValues: { status: TenantStatus.ACTIVE },
            description: `Reactivated organization: ${tenant.name}`,
        });

        return { success: true, message: `Organization ${tenant.name} has been reactivated` };
    }

    @Put(':id/plan')
    @ApiOperation({ summary: 'Update organization subscription plan' })
    @ApiResponse({ status: 200, description: 'Plan updated' })
    async updatePlan(
        @Param('id') id: string,
        @Body() dto: UpdateOrganizationPlanDto,
        @Req() req: Request,
    ) {
        const tenant = await this.tenantRepository.findOneOrFail({ where: { id } });
        const previousTier = tenant.subscriptionTier;

        // Map tier names
        const tierMap: Record<string, SubscriptionTier> = {
            'free': SubscriptionTier.FREE,
            'starter': SubscriptionTier.STARTER,
            'pro': SubscriptionTier.PROFESSIONAL,
            'enterprise': SubscriptionTier.ENTERPRISE,
        };

        tenant.subscriptionTier = tierMap[dto.tier] || SubscriptionTier.FREE;
        await this.tenantRepository.save(tenant);

        // Log the action
        await this.createAuditLog(req, AdminAuditAction.UPDATE, 'tenant', id, tenant.name, {
            previousValues: { subscriptionTier: previousTier },
            newValues: { subscriptionTier: tenant.subscriptionTier },
            description: `Updated plan for ${tenant.name} from ${previousTier} to ${tenant.subscriptionTier}`,
        });

        return {
            success: true,
            message: `Plan updated to ${dto.tier}`,
            subscriptionTier: tenant.subscriptionTier,
        };
    }

    private async createAuditLog(
        req: Request,
        action: AdminAuditAction,
        resourceType: string,
        resourceId: string,
        resourceName: string,
        options: {
            previousValues?: any;
            newValues?: any;
            description: string;
            targetTenantId?: string;
            targetTenantName?: string;
        },
    ) {
        const admin: any = req.user!;
        const auditLog = this.auditLogRepository.create({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: `${admin.firstName} ${admin.lastName}`,
            action,
            resourceType: resourceType as any,
            resourceId,
            resourceName,
            targetTenantId: options.targetTenantId || resourceId,
            targetTenantName: options.targetTenantName || resourceName,
            previousValues: options.previousValues,
            newValues: options.newValues,
            description: options.description,
            ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || '',
            userAgent: req.headers['user-agent'] || '',
            success: true,
        });

        await this.auditLogRepository.save(auditLog);
    }
    @Post(':id/impersonate')
    @RequireSuperAdminPermission('canImpersonate')
    @ApiOperation({ summary: 'Impersonate a tenant admin' })
    @ApiResponse({ status: 200, description: 'Impersonation token generated' })
    async impersonate(
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        try {
            const admin: any = req.user; // SuperAdminUser

            console.log(`[Impersonate] Admin ${admin?.id} attempting to impersonate tenant ${id}`);

            // 1. Get tenant
            const tenant = await this.tenantRepository.findOne({ where: { id } });
            if (!tenant) {
                console.warn(`[Impersonate] Tenant ${id} not found`);
                throw new Error('Tenant not found');
            }

            // 2. Get tenant owner or first admin
            const user = await this.userRepository.findOne({
                where: { tenantId: id, status: UserStatus.ACTIVE }, // strict check
                order: { role: 'ASC', createdAt: 'ASC' }, // Owner first (usually)
            });

            if (!user) {
                console.warn(`[Impersonate] No active admin user found for tenant ${id}`);
                throw new Error('No active admin user found for this tenant');
            }

            // 3. Generate impersonation token
            const payload = {
                sub: user.id,
                email: user.email,
                tenantId: user.tenantId,
                role: user.role,
                isImpersonated: true,
                impersonatedBy: admin.id,
            };

            const secret = this.configService.get<string>('JWT_SECRET');
            if (!secret) {
                console.error('[Impersonate] JWT_SECRET is missing');
                throw new Error('System configuration error: JWT_SECRET missing');
            }

            const token = this.jwtService.sign(payload, { secret, expiresIn: '1h' });

            // 4. Audit log
            await this.auditLogRepository.save({
                adminId: admin.id,
                adminEmail: admin.email,
                adminName: `${admin.firstName} ${admin.lastName}`,
                action: AdminAuditAction.IMPERSONATE,
                resourceType: 'tenant',
                resourceId: tenant.id,
                resourceName: tenant.name,
                targetTenantId: tenant.id,
                targetTenantName: tenant.name,
                description: `Impersonated tenant user: ${user.email}`,
                ipAddress: req.ip || '',
                success: true,
                createdAt: new Date(),
            });

            console.log(`[Impersonate] Success for tenant ${tenant.name}`);

            return {
                accessToken: token,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                },
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    slug: tenant.slug,
                },
            };
        } catch (error: any) {
            console.error('[Impersonate] Error:', error);
            throw new Error(error.message || 'Internal server error during impersonation');
        }
    }
}
