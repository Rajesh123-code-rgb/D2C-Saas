import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { DashboardStatsDto, AlertDto } from '../dto/dashboard.dto';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';
import { MessageWallet } from '../entities/message-wallet.entity';
import { MessageTransaction } from '../entities/message-transaction.entity';
import { WhatsAppConversation } from '../entities/whatsapp-conversation.entity';
import { AdminAuditLog, AdminAuditAction } from '../entities/admin-audit-log.entity';

@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
@ApiBearerAuth()
export class DashboardController {
    constructor(
        @InjectRepository(Tenant)
        private readonly tenantRepository: Repository<Tenant>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(MessageTransaction)
        private readonly transactionRepository: Repository<MessageTransaction>,
        @InjectRepository(WhatsAppConversation)
        private readonly conversationRepository: Repository<WhatsAppConversation>,
        @InjectRepository(AdminAuditLog)
        private readonly auditLogRepository: Repository<AdminAuditLog>,
    ) { }

    @Get('stats')
    @ApiOperation({ summary: 'Get dashboard statistics' })
    @ApiResponse({ status: 200, description: 'Dashboard stats' })
    async getStats(): Promise<DashboardStatsDto> {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Organization stats
        const [totalOrgs, activeOrgs, trialOrgs] = await Promise.all([
            this.tenantRepository.count(),
            this.tenantRepository.count({ where: { status: 'active' as any } }),
            this.tenantRepository.count({ where: { status: 'trial' as any } }),
        ]);

        // User stats (active today = logged in today)
        const [totalUsers, activeUsersToday] = await Promise.all([
            this.userRepository.count(),
            this.userRepository.count({
                where: {
                    lastLoginAt: MoreThan(startOfDay),
                },
            }),
        ]);

        // Revenue stats from credit transactions
        const [todayRevenue, monthRevenue, lastMonthRevenue] = await Promise.all([
            this.transactionRepository
                .createQueryBuilder('tx')
                .select('COALESCE(SUM(tx.currencyAmount), 0)', 'total')
                .where('tx.createdAt >= :start', { start: startOfDay })
                .andWhere('tx.type = :type', { type: 'credit' })
                .getRawOne(),
            this.transactionRepository
                .createQueryBuilder('tx')
                .select('COALESCE(SUM(tx.currencyAmount), 0)', 'total')
                .where('tx.createdAt >= :start', { start: startOfMonth })
                .andWhere('tx.type = :type', { type: 'credit' })
                .getRawOne(),
            this.transactionRepository
                .createQueryBuilder('tx')
                .select('COALESCE(SUM(tx.currencyAmount), 0)', 'total')
                .where('tx.createdAt >= :start AND tx.createdAt <= :end', {
                    start: startOfLastMonth,
                    end: endOfLastMonth,
                })
                .andWhere('tx.type = :type', { type: 'credit' })
                .getRawOne(),
        ]);

        const growthPercent = lastMonthRevenue?.total > 0
            ? ((monthRevenue?.total - lastMonthRevenue?.total) / lastMonthRevenue?.total * 100).toFixed(1)
            : 0;

        // Message stats (from conversations)
        const [todayMessages, monthMessages] = await Promise.all([
            this.conversationRepository.count({
                where: {
                    createdAt: MoreThan(startOfDay),
                },
            }),
            this.conversationRepository.count({
                where: {
                    createdAt: MoreThan(startOfMonth),
                },
            }),
        ]);

        // Conversation categories
        const [marketingConvs, utilityConvs, serviceConvs] = await Promise.all([
            this.conversationRepository.count({ where: { category: 'marketing' as any } }),
            this.conversationRepository.count({ where: { category: 'utility' as any } }),
            this.conversationRepository.count({ where: { category: 'service' as any } }),
        ]);

        return {
            organizations: {
                total: totalOrgs,
                active: activeOrgs,
                trial: trialOrgs,
            },
            users: {
                total: totalUsers,
                active: activeUsersToday,
            },
            revenue: {
                today: parseFloat(todayRevenue?.total) || 0,
                month: parseFloat(monthRevenue?.total) || 0,
                growth: parseFloat(growthPercent as string) || 0,
            },
            messages: {
                today: todayMessages,
                month: monthMessages,
            },
            conversations: {
                marketing: marketingConvs,
                utility: utilityConvs,
                service: serviceConvs,
            },
        };
    }

    @Get('alerts')
    @ApiOperation({ summary: 'Get recent system alerts' })
    @ApiResponse({ status: 200, description: 'Recent alerts' })
    async getAlerts(): Promise<AlertDto[]> {
        // Get recent audit logs to generate alerts
        const recentLogs = await this.auditLogRepository.find({
            order: { createdAt: 'DESC' },
            take: 20,
        });

        const alerts: AlertDto[] = [];

        for (const log of recentLogs) {
            // Generate alert based on action type
            let alertType: 'warning' | 'success' | 'info' | 'error' = 'info';
            let message = log.description;

            if (log.action === AdminAuditAction.SUSPEND) {
                alertType = 'warning';
            } else if (log.action === AdminAuditAction.CREDIT_ISSUE || log.action === AdminAuditAction.REFUND) {
                alertType = 'success';
            } else if (log.action === AdminAuditAction.LOGIN) {
                alertType = 'info';
            } else if (!log.success) {
                alertType = 'error';
            }

            const timeDiff = this.getTimeDiff(log.createdAt);

            alerts.push({
                id: log.id,
                type: alertType,
                message,
                time: timeDiff,
            });
        }

        return alerts.slice(0, 10);
    }

    @Get('transactions')
    @ApiOperation({ summary: 'Get recent transactions for dashboard' })
    @ApiResponse({ status: 200, description: 'Recent transactions' })
    async getRecentTransactions(
        @Query('limit') limit: number = 5,
    ) {
        const transactions = await this.transactionRepository.find({
            order: { createdAt: 'DESC' },
            take: Math.min(limit, 20),
            relations: ['wallet'],
        });

        return {
            data: transactions.map(tx => ({
                id: tx.id,
                tenantId: tx.wallet?.tenantId,
                tenantName: tx.wallet?.tenantId, // Would need tenant name from wallet
                type: tx.type,
                creditsAmount: tx.creditsAmount,
                currencyAmount: tx.currencyAmount,
                description: tx.description,
                status: tx.status,
                createdAt: tx.createdAt.toISOString(),
            })),
            total: transactions.length,
            page: 1,
            limit,
            totalPages: 1,
        };
    }

    private getTimeDiff(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }
}
