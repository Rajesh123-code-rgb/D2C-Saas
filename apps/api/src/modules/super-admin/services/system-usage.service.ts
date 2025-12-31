
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';
// import { Message } from '../../inbox/message.entity'; // Need to check if available in SuperAdmin scope, or use query runner
import { AutomationRule } from '../../automations/automation-rule.entity';

@Injectable()
export class SystemUsageService {
    private readonly logger = new Logger(SystemUsageService.name);

    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(Tenant)
        private readonly tenantRepository: Repository<Tenant>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(AutomationRule)
        private readonly automationRepository: Repository<AutomationRule>,
    ) { }

    /**
     * Get high-level system stats
     */
    async getSystemStats() {
        try {
            // Use count() for simple entities
            const totalTenants = await this.tenantRepository.count();
            const activeTenants = await this.tenantRepository.count({ where: { status: 'active' as any } });
            const totalUsers = await this.userRepository.count();
            const totalAutomations = await this.automationRepository.count();

            // For messages and conversations, use raw query for speed and decoupling
            let totalMessages = 0;
            let totalConversations = 0;

            try {
                const messagesResult = await this.dataSource.query(`SELECT count(*) FROM messages`);
                totalMessages = parseInt(messagesResult[0]?.count) || 0;
            } catch (e) {
                this.logger.warn('Could not count messages table');
            }

            try {
                const conversationsResult = await this.dataSource.query(`SELECT count(*) FROM conversations`);
                totalConversations = parseInt(conversationsResult[0]?.count) || 0;
            } catch (e) {
                this.logger.warn('Could not count conversations table');
            }

            return {
                tenants: { total: totalTenants, active: activeTenants },
                users: { total: totalUsers },
                automations: { total: totalAutomations },
                messages: { total: totalMessages },
                conversations: { total: totalConversations },
            };
        } catch (error) {
            this.logger.error('Error getting system stats', error);
            throw error;
        }
    }

    /**
     * Get Database Stats (Postgres specific)
     */
    async getDatabaseStats() {
        // DB Size
        const [{ size_bytes }] = await this.dataSource.query(
            `SELECT pg_database_size(current_database()) as size_bytes`
        );

        // Table sizes (Top 10)
        const tableStats = await this.dataSource.query(`
            SELECT
                relname as table_name,
                n_live_tup as row_count
            FROM pg_stat_user_tables
            ORDER BY n_live_tup DESC
            LIMIT 10
        `);

        return {
            sizeBytes: parseInt(size_bytes),
            tableStats: tableStats.map((t: any) => ({
                tableName: t.table_name,
                rowCount: parseInt(t.row_count)
            })),
        };
    }

    /**
     * Get Activity Stats (Mocked or real aggregation if logs exist)
     */
    async getActivityStats() {
        // In a real system, we'd aggregate audit logs or session tables
        // For now, we'll return a mocked 30-day history for the chart
        const days = 30;
        const stats = [];
        const now = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - (days - i - 1));

            // Mock random growth
            stats.push({
                date: date.toISOString().split('T')[0],
                activeUsers: 50 + Math.floor(Math.random() * 20) + (i * 2),
                messagesSent: 1000 + Math.floor(Math.random() * 500) + (i * 100),
            });
        }

        return stats;
    }
}
