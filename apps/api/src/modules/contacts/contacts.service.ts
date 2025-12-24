import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Contact } from './contact.entity';

// Timeline event types
export interface TimelineEvent {
    id: string;
    type: 'order' | 'message' | 'tag_change' | 'lifecycle_change' | 'conversation' | 'automation';
    title: string;
    description: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

// Customer profile with aggregated data
export interface CustomerProfile {
    contact: Contact;
    stats: {
        totalOrders: number;
        totalSpent: number;
        averageOrderValue: number;
        firstOrderDate: Date | null;
        lastOrderDate: Date | null;
        totalConversations: number;
    };
    recentOrders: any[];
    recentActivity: TimelineEvent[];
}

@Injectable()
export class ContactsService {
    constructor(
        @InjectRepository(Contact)
        private contactRepository: Repository<Contact>,
    ) { }

    async findAll(tenantId: string, filters?: any) {
        const where: any = { tenantId };

        if (filters?.search) {
            // Search in name, email, phone
            return this.contactRepository.find({
                where: [
                    { tenantId, name: Like(`%${filters.search}%`) },
                    { tenantId, email: Like(`%${filters.search}%`) },
                    { tenantId, phone: Like(`%${filters.search}%`) },
                ],
                order: { createdAt: 'DESC' },
            });
        }

        if (filters?.tag) {
            where.tags = [filters.tag]; // Simplified, should use array contains
        }

        if (filters?.lifecycleStage) {
            where.lifecycleStage = filters.lifecycleStage;
        }

        return this.contactRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string, tenantId: string) {
        return this.contactRepository.findOne({
            where: { id, tenantId },
            relations: ['conversations'],
        });
    }

    /**
     * Get unified customer profile with aggregated data
     */
    async getProfile(tenantId: string, contactId: string): Promise<CustomerProfile> {
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, tenantId },
            relations: ['conversations'],
        });

        if (!contact) {
            throw new Error('Contact not found');
        }

        // Get orders from ecommerce_orders table
        const ordersQuery = await this.contactRepository.manager.query(
            `SELECT * FROM ecommerce_orders WHERE contact_id = $1 AND tenant_id = $2 ORDER BY order_date DESC LIMIT 10`,
            [contactId, tenantId]
        );

        const orders = ordersQuery || [];

        // Calculate stats
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0);
        const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
        const firstOrderDate = orders.length > 0 ? orders[orders.length - 1]?.order_date : null;
        const lastOrderDate = orders.length > 0 ? orders[0]?.order_date : null;

        // Get conversation count
        const conversationCount = contact.conversations?.length || 0;

        // Get recent activity
        const recentActivity = await this.getTimeline(tenantId, contactId, 5);

        return {
            contact,
            stats: {
                totalOrders,
                totalSpent,
                averageOrderValue,
                firstOrderDate,
                lastOrderDate,
                totalConversations: conversationCount,
            },
            recentOrders: orders.slice(0, 5),
            recentActivity,
        };
    }

    /**
     * Get activity timeline for a contact
     */
    async getTimeline(tenantId: string, contactId: string, limit: number = 20): Promise<TimelineEvent[]> {
        const events: TimelineEvent[] = [];

        // Get orders
        const orders = await this.contactRepository.manager.query(
            `SELECT id, order_number, status, total, order_date, created_at 
             FROM ecommerce_orders 
             WHERE contact_id = $1 AND tenant_id = $2 
             ORDER BY created_at DESC 
             LIMIT $3`,
            [contactId, tenantId, limit]
        );

        for (const order of orders || []) {
            events.push({
                id: `order-${order.id}`,
                type: 'order',
                title: `Order #${order.order_number}`,
                description: `Order placed - ₹${parseFloat(order.total || 0).toFixed(2)} (${order.status})`,
                timestamp: new Date(order.created_at),
                metadata: { orderId: order.id, status: order.status, total: order.total },
            });
        }

        // Get conversations
        const conversations = await this.contactRepository.manager.query(
            `SELECT id, status, "channelType", "createdAt" 
             FROM conversations 
             WHERE "contactId" = $1 AND "tenantId" = $2 
             ORDER BY "createdAt" DESC 
             LIMIT $3`,
            [contactId, tenantId, limit]
        );

        for (const conv of conversations || []) {
            events.push({
                id: `conv-${conv.id}`,
                type: 'conversation',
                title: `${conv.channelType || 'Unknown'} Conversation`,
                description: conv.status === 'resolved' ? 'Conversation closed' : 'Conversation started',
                timestamp: new Date(conv.createdAt),
                metadata: { conversationId: conv.id, channel: conv.channelType, status: conv.status },
            });
        }

        // Get messages (last 10)
        const messages = await this.contactRepository.manager.query(
            `SELECT m.id, m.content, m.direction, m."createdAt", m."conversationId"
             FROM messages m
             INNER JOIN conversations c ON m."conversationId" = c.id
             WHERE c."contactId" = $1 AND c."tenantId" = $2
             ORDER BY m."createdAt" DESC
             LIMIT $3`,
            [contactId, tenantId, Math.min(limit, 10)]
        );

        for (const msg of messages || []) {
            const direction = msg.direction === 'inbound' ? 'received' : 'sent';
            const content = msg.content?.substring(0, 50) || '';
            events.push({
                id: `msg-${msg.id}`,
                type: 'message',
                title: `Message ${direction}`,
                description: content + (content.length >= 50 ? '...' : ''),
                timestamp: new Date(msg.createdAt),
                metadata: { messageId: msg.id, direction: msg.direction },
            });
        }

        // Sort by timestamp descending
        events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return events.slice(0, limit);
    }

    /**
     * Get all tags used by contacts in a tenant
     */
    async getAllTags(tenantId: string): Promise<string[]> {
        const contacts = await this.contactRepository.find({
            where: { tenantId },
            select: ['tags'],
        });

        const tagSet = new Set<string>();
        for (const contact of contacts) {
            if (contact.tags) {
                for (const tag of contact.tags) {
                    tagSet.add(tag);
                }
            }
        }

        return Array.from(tagSet).sort();
    }

    /**
     * Update tags for a contact
     */
    async updateTags(tenantId: string, contactId: string, tags: string[]) {
        await this.contactRepository.update(
            { id: contactId, tenantId },
            { tags }
        );
        return this.findOne(contactId, tenantId);
    }

    async create(tenantId: string, data: {
        name?: string;
        email?: string;
        phone?: string;
        source?: string;
        lifecycle?: string;
        tags?: string[];
    }) {
        const contact = this.contactRepository.create({
            tenantId,
            name: data.name || data.email || data.phone || 'Unknown',
            email: data.email,
            phone: data.phone,
            source: (data.source || 'manual') as any,
            lifecycleStage: (data.lifecycle || 'lead') as any,
            tags: data.tags || [],
        } as any);

        return this.contactRepository.save(contact);
    }

    async findOrCreateByPhone(phone: string, tenantId: string, data?: Partial<Contact>) {
        let contact = await this.contactRepository.findOne({
            where: { phone, tenantId },
        });

        if (!contact) {
            contact = this.contactRepository.create({
                ...data,
                phone,
                tenantId,
            });
            await this.contactRepository.save(contact);
        }

        return contact;
    }

    /**
     * Find or create contact by phone or email
     */
    async findOrCreate(
        tenantId: string,
        identifier: { phone?: string; email?: string },
        data?: { name?: string; source?: string },
    ): Promise<Contact> {
        // Try to find by phone first, then email
        let contact: Contact | null = null;

        if (identifier.phone) {
            contact = await this.contactRepository.findOne({
                where: { tenantId, phone: identifier.phone },
            });
        }

        if (!contact && identifier.email) {
            contact = await this.contactRepository.findOne({
                where: { tenantId, email: identifier.email },
            });
        }

        if (contact) {
            return contact;
        }

        // Create new contact
        const newContact = this.contactRepository.create({
            tenantId,
            phone: identifier.phone,
            email: identifier.email,
            name: data?.name || identifier.phone || identifier.email,
            source: (data?.source || 'unknown') as any,
        } as any) as unknown as Contact;

        await this.contactRepository.save(newContact);
        return newContact;
    }

    async update(id: string, tenantId: string, updateData: Partial<Contact>) {
        await this.contactRepository.update({ id, tenantId }, updateData);
        return this.findOne(id, tenantId);
    }

    async delete(id: string, tenantId: string) {
        const result = await this.contactRepository.delete({ id, tenantId });
        return { deleted: result.affected > 0 };
    }
}


