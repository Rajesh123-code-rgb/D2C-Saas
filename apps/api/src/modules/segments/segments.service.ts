import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import {
    Segment,
    SegmentType,
    SegmentRule,
    SegmentRuleGroup,
    SegmentRuleOperator,
} from './segment.entity';
import { Contact } from '../contacts/contact.entity';

export interface CreateSegmentDto {
    name: string;
    description?: string;
    type?: SegmentType;
    rules: SegmentRuleGroup;
}

@Injectable()
export class SegmentsService {
    private readonly logger = new Logger(SegmentsService.name);

    constructor(
        @InjectRepository(Segment)
        private readonly segmentRepository: Repository<Segment>,
        @InjectRepository(Contact)
        private readonly contactRepository: Repository<Contact>,
    ) { }

    async create(tenantId: string, dto: CreateSegmentDto): Promise<Segment> {
        const segment = this.segmentRepository.create({
            tenantId,
            name: dto.name,
            description: dto.description,
            type: dto.type || SegmentType.DYNAMIC,
            rules: dto.rules,
        });

        await this.segmentRepository.save(segment);

        // Calculate initial count - wrap in try-catch to prevent creation failure
        try {
            await this.recalculateCount(segment.id);
        } catch (error: any) {
            this.logger.warn(`Failed to calculate initial count for segment ${segment.id}: ${error?.message || error}`);
            // Don't fail the whole creation, just log it
        }

        return this.findById(tenantId, segment.id);
    }

    async findAll(tenantId: string): Promise<Segment[]> {
        return this.segmentRepository.find({
            where: { tenantId },
            order: { name: 'ASC' },
        });
    }

    async findById(tenantId: string, id: string): Promise<Segment> {
        const segment = await this.segmentRepository.findOne({
            where: { id, tenantId },
        });

        if (!segment) {
            throw new NotFoundException('Segment not found');
        }

        return segment;
    }

    async update(
        tenantId: string,
        id: string,
        updates: Partial<CreateSegmentDto>,
    ): Promise<Segment> {
        const segment = await this.findById(tenantId, id);
        Object.assign(segment, updates);
        await this.segmentRepository.save(segment);

        // Recalculate count if rules changed
        if (updates.rules) {
            await this.recalculateCount(id);
        }

        return this.findById(tenantId, id);
    }

    async delete(tenantId: string, id: string): Promise<void> {
        const segment = await this.findById(tenantId, id);
        if (segment.isSystem) {
            throw new Error('Cannot delete system segment');
        }
        await this.segmentRepository.remove(segment);
    }

    async recalculateCount(segmentId: string): Promise<number> {
        const segment = await this.segmentRepository.findOne({
            where: { id: segmentId },
        });

        if (!segment) return 0;

        this.logger.log(`Recalculating segment ${segment.name} (${segmentId})`);
        this.logger.log(`Segment rules: ${JSON.stringify(segment.rules, null, 2)}`);

        const contacts = await this.getContacts(segment.tenantId, segmentId);

        this.logger.log(`Found ${contacts.length} contacts matching segment rules`);

        segment.contactCount = contacts.length;
        segment.lastCalculatedAt = new Date();

        if (segment.type === SegmentType.STATIC) {
            segment.contactIds = contacts.map((c) => c.id);
        }

        await this.segmentRepository.save(segment);

        return segment.contactCount;
    }

    /**
     * Get all contacts matching a segment's rules
     */
    async getContacts(tenantId: string, segmentId: string): Promise<Contact[]> {
        const segment = await this.findById(tenantId, segmentId);

        if (segment.type === SegmentType.STATIC && segment.contactIds.length > 0) {
            return this.contactRepository.find({
                where: { id: In(segment.contactIds), tenantId },
            });
        }

        // Build dynamic query
        const queryBuilder = this.contactRepository
            .createQueryBuilder('contact')
            .where('contact.tenantId = :tenantId', { tenantId });

        this.applyRuleGroup(queryBuilder, segment.rules, 'contact');

        // Debug: Log the generated SQL query
        const sql = queryBuilder.getSql();
        const params = queryBuilder.getParameters();
        this.logger.log(`Generated SQL for segment "${segment.name}": ${sql}`);
        this.logger.log(`SQL Parameters: ${JSON.stringify(params)}`);

        const contacts = await queryBuilder.getMany();
        this.logger.log(`Query returned ${contacts.length} contacts`);

        return contacts;
    }

    /**
     * Get contact IDs matching a segment (for campaign targeting)
     */
    async getContactIds(tenantId: string, segmentId: string): Promise<string[]> {
        const contacts = await this.getContacts(tenantId, segmentId);
        return contacts.map((c) => c.id);
    }

    /**
     * Check if a contact matches a segment
     */
    async contactMatchesSegment(
        tenantId: string,
        contactId: string,
        segmentId: string,
    ): Promise<boolean> {
        const segment = await this.findById(tenantId, segmentId);

        if (segment.type === SegmentType.STATIC) {
            return segment.contactIds.includes(contactId);
        }

        const queryBuilder = this.contactRepository
            .createQueryBuilder('contact')
            .where('contact.id = :contactId', { contactId })
            .andWhere('contact.tenantId = :tenantId', { tenantId });

        this.applyRuleGroup(queryBuilder, segment.rules, 'contact');

        const count = await queryBuilder.getCount();
        return count > 0;
    }

    /**
     * Apply rule group to query builder
     */
    private applyRuleGroup(
        queryBuilder: any,
        group: SegmentRuleGroup,
        alias: string,
    ): void {
        if (!group.rules || group.rules.length === 0) return;

        queryBuilder.andWhere(
            new Brackets((qb) => {
                group.rules.forEach((ruleOrGroup, index) => {
                    const method = index === 0 ? 'where' : group.combinator === 'and' ? 'andWhere' : 'orWhere';

                    if ('combinator' in ruleOrGroup) {
                        // Nested group
                        qb[method](
                            new Brackets((nestedQb) => {
                                this.applyRuleGroupToBuilder(nestedQb, ruleOrGroup as SegmentRuleGroup, alias);
                            }),
                        );
                    } else {
                        // Single rule
                        const condition = this.buildRuleCondition(ruleOrGroup as SegmentRule, alias);
                        if (condition) {
                            qb[method](condition.sql, condition.params);
                        }
                    }
                });
            }),
        );
    }

    private applyRuleGroupToBuilder(
        qb: any,
        group: SegmentRuleGroup,
        alias: string,
    ): void {
        group.rules.forEach((ruleOrGroup, index) => {
            const method = index === 0 ? 'where' : group.combinator === 'and' ? 'andWhere' : 'orWhere';

            if ('combinator' in ruleOrGroup) {
                qb[method](
                    new Brackets((nestedQb) => {
                        this.applyRuleGroupToBuilder(nestedQb, ruleOrGroup as SegmentRuleGroup, alias);
                    }),
                );
            } else {
                const condition = this.buildRuleCondition(ruleOrGroup as SegmentRule, alias);
                if (condition) {
                    qb[method](condition.sql, condition.params);
                }
            }
        });
    }

    /**
     * Build SQL condition for a single rule
     */
    private buildRuleCondition(
        rule: SegmentRule,
        alias: string,
    ): { sql: string; params: Record<string, any> } | null {
        const field = this.getFieldPath(rule.field, alias);
        // Generate a unique param key, fallback to random if no id
        const ruleId = rule.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const paramKey = `param_${ruleId.replace(/-/g, '_')}`;
        const params: Record<string, any> = {};

        // Normalize operator to handle string values from frontend
        const operator = (rule.operator as string).toLowerCase();

        this.logger.debug(`Building rule condition: field=${rule.field}, operator=${operator}, value=${rule.value}`);

        switch (operator) {
            case 'equals':
                // Use case-insensitive matching for text values
                params[paramKey] = rule.value;
                return { sql: `LOWER(${field}::text) = LOWER(:${paramKey})`, params };

            case 'not_equals':
                params[paramKey] = rule.value;
                return { sql: `LOWER(${field}::text) != LOWER(:${paramKey})`, params };

            case 'contains':
                params[paramKey] = `%${rule.value}%`;
                return { sql: `${field} ILIKE :${paramKey}`, params };

            case 'not_contains':
                params[paramKey] = `%${rule.value}%`;
                return { sql: `${field} NOT ILIKE :${paramKey}`, params };

            case 'starts_with':
                params[paramKey] = `${rule.value}%`;
                return { sql: `${field} ILIKE :${paramKey}`, params };

            case 'greater_than':
                params[paramKey] = rule.value;
                return { sql: `${field} > :${paramKey}`, params };

            case 'less_than':
                params[paramKey] = rule.value;
                return { sql: `${field} < :${paramKey}`, params };

            case 'in':
                params[paramKey] = Array.isArray(rule.value) ? rule.value : [rule.value];
                return { sql: `${field} IN (:...${paramKey})`, params };

            case 'not_in':
                params[paramKey] = Array.isArray(rule.value) ? rule.value : [rule.value];
                return { sql: `${field} NOT IN (:...${paramKey})`, params };

            case 'is_empty':
                return { sql: `(${field} IS NULL OR ${field} = '')`, params: {} };

            case 'is_not_empty':
                return { sql: `(${field} IS NOT NULL AND ${field} != '')`, params: {} };

            case 'within_last':
                const days = this.convertToInterval(rule.value, rule.valueUnit || 'days');
                return { sql: `${field} >= NOW() - INTERVAL '${days} days'`, params: {} };

            case 'not_within_last':
                const daysNot = this.convertToInterval(rule.value, rule.valueUnit || 'days');
                return { sql: `${field} < NOW() - INTERVAL '${daysNot} days'`, params: {} };

            default:
                this.logger.warn(`Unknown operator: ${operator}`);
                return null;
        }
    }

    private getFieldPath(field: string, alias: string): string {
        // Field alias mapping for backwards compatibility and convenience
        const fieldAliases: Record<string, string> = {
            'lifecycle': 'lifecycleStage',
            'stage': 'lifecycleStage',
            'created': 'createdAt',
            'updated': 'updatedAt',
            'lastContacted': 'lastContactedAt',
        };

        // Apply alias if exists
        const resolvedField = fieldAliases[field] || field;

        // Handle JSONB paths
        if (resolvedField.includes('.')) {
            const parts = resolvedField.split('.');
            const column = parts[0];
            const jsonPath = parts.slice(1).join('.');
            return `${alias}.${column}->>'${jsonPath}'`;
        }
        return `${alias}.${resolvedField}`;
    }

    private convertToInterval(value: number, unit: string): number {
        switch (unit) {
            case 'hours':
                return value / 24;
            case 'minutes':
                return value / 1440;
            default:
                return value;
        }
    }

    /**
     * Create system segments for a tenant
     */
    async createSystemSegments(tenantId: string): Promise<void> {
        const systemSegments = [
            {
                name: 'All Contacts',
                description: 'All contacts in the system',
                rules: { id: 'all', combinator: 'and' as const, rules: [] },
            },
            {
                name: 'New Customers',
                description: 'Customers with their first order',
                rules: {
                    id: 'new_customers',
                    combinator: 'and' as const,
                    rules: [
                        { id: 'r1', field: 'ecommerceData.totalOrders', operator: SegmentRuleOperator.EQUALS, value: 1 },
                    ],
                },
            },
            {
                name: 'Repeat Customers',
                description: 'Customers with 2+ orders',
                rules: {
                    id: 'repeat_customers',
                    combinator: 'and' as const,
                    rules: [
                        { id: 'r1', field: 'ecommerceData.totalOrders', operator: SegmentRuleOperator.GREATER_THAN, value: 1 },
                    ],
                },
            },
            {
                name: 'VIP Customers',
                description: 'High value customers (>₹10,000 total spent)',
                rules: {
                    id: 'vip_customers',
                    combinator: 'and' as const,
                    rules: [
                        { id: 'r1', field: 'ecommerceData.totalSpent', operator: SegmentRuleOperator.GREATER_THAN, value: 10000 },
                    ],
                },
            },
            {
                name: 'Inactive (30 Days)',
                description: 'No orders in last 30 days',
                rules: {
                    id: 'inactive_30',
                    combinator: 'and' as const,
                    rules: [
                        { id: 'r1', field: 'ecommerceData.lastOrderDate', operator: SegmentRuleOperator.NOT_WITHIN_LAST, value: 30, valueUnit: 'days' },
                    ],
                },
            },
        ];

        for (const seg of systemSegments) {
            const existing = await this.segmentRepository.findOne({
                where: { tenantId, name: seg.name, isSystem: true },
            });

            if (!existing) {
                await this.segmentRepository.save({
                    tenantId,
                    name: seg.name,
                    description: seg.description,
                    rules: seg.rules,
                    type: SegmentType.DYNAMIC,
                    isSystem: true,
                });
            }
        }
    }
}
