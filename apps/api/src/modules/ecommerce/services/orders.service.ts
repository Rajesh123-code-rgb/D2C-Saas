import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { EcommerceOrder, OrderStatus, PaymentStatus, PaymentMethod } from '../entities/order.entity';
import { ContactsService } from '../../contacts/contacts.service';
import { EventsService } from './events.service';
import { EcommerceEventType } from '../entities/event.entity';

export interface CreateOrderDto {
    storeId: string;
    platformOrderId: string;
    orderNumber: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    paymentMethod?: PaymentMethod;
    currency?: string;
    subtotal: number;
    discount?: number;
    shipping?: number;
    tax?: number;
    total: number;
    items: any[];
    shippingAddress?: any;
    billingAddress?: any;
    notes?: string;
    customerNote?: string;
    orderDate: Date;
    metadata?: Record<string, any>;
}

export interface OrderStats {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    pendingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    codOrders: number;
    prepaidOrders: number;
}

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        @InjectRepository(EcommerceOrder)
        private readonly orderRepository: Repository<EcommerceOrder>,
        private readonly contactsService: ContactsService,
        private readonly eventsService: EventsService,
    ) { }

    async createOrder(tenantId: string, dto: CreateOrderDto): Promise<EcommerceOrder> {
        // Check if order already exists
        const existing = await this.orderRepository.findOne({
            where: {
                tenantId,
                storeId: dto.storeId,
                platformOrderId: dto.platformOrderId,
            },
        });

        if (existing) {
            this.logger.log(`Order already exists: ${dto.orderNumber}`);
            return existing;
        }

        // Find or create contact
        let contactId: string | null = null;
        if (dto.customerPhone || dto.customerEmail) {
            const contact = await this.contactsService.findOrCreate(
                tenantId,
                dto.customerPhone ? { phone: dto.customerPhone } : { email: dto.customerEmail! },
                {
                    name: dto.customerName || 'Unknown Customer',
                    source: 'ecommerce',
                },
            );
            contactId = contact.id;
        }

        const order = this.orderRepository.create({
            tenantId,
            storeId: dto.storeId,
            contactId,
            platformOrderId: dto.platformOrderId,
            orderNumber: dto.orderNumber,
            status: dto.status || OrderStatus.PENDING,
            paymentStatus: dto.paymentStatus || PaymentStatus.PENDING,
            paymentMethod: dto.paymentMethod || PaymentMethod.OTHER,
            currency: dto.currency || 'INR',
            subtotal: dto.subtotal,
            discount: dto.discount || 0,
            shipping: dto.shipping || 0,
            tax: dto.tax || 0,
            total: dto.total,
            items: dto.items,
            shippingAddress: dto.shippingAddress,
            billingAddress: dto.billingAddress,
            notes: dto.notes,
            customerNote: dto.customerNote,
            orderDate: dto.orderDate,
            metadata: dto.metadata,
        });

        await this.orderRepository.save(order);
        this.logger.log(`Order created: ${order.orderNumber} (${order.total} ${order.currency})`);

        // Emit order created event
        await this.eventsService.emitEvent({
            tenantId,
            storeId: dto.storeId,
            contactId,
            eventType: EcommerceEventType.ORDER_CREATED,
            referenceId: order.id,
            referenceType: 'order',
            payload: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                total: order.total,
                paymentMethod: order.paymentMethod,
                items: order.items,
            },
        });

        // Check for first order or repeat order
        if (contactId) {
            const orderCount = await this.getContactOrderCount(tenantId, contactId);
            if (orderCount === 1) {
                await this.eventsService.emitEvent({
                    tenantId,
                    storeId: dto.storeId,
                    contactId,
                    eventType: EcommerceEventType.FIRST_ORDER,
                    referenceId: order.id,
                    referenceType: 'order',
                    payload: { orderId: order.id, orderNumber: order.orderNumber },
                });
            } else if (orderCount > 1) {
                await this.eventsService.emitEvent({
                    tenantId,
                    storeId: dto.storeId,
                    contactId,
                    eventType: EcommerceEventType.REPEAT_ORDER,
                    referenceId: order.id,
                    referenceType: 'order',
                    payload: { orderId: order.id, orderNumber: order.orderNumber, orderCount },
                });
            }
        }

        // Check for high value order (e.g., > 5000 INR)
        if (order.total >= 5000) {
            await this.eventsService.emitEvent({
                tenantId,
                storeId: dto.storeId,
                contactId,
                eventType: EcommerceEventType.HIGH_VALUE_ORDER,
                referenceId: order.id,
                referenceType: 'order',
                payload: { orderId: order.id, orderNumber: order.orderNumber, total: order.total },
            });
        }

        return order;
    }

    async updateOrderStatus(
        tenantId: string,
        orderId: string,
        status: OrderStatus,
    ): Promise<EcommerceOrder> {
        const order = await this.findById(tenantId, orderId);
        const previousStatus = order.status;
        order.status = status;

        // Set timestamps based on status
        if (status === OrderStatus.CONFIRMED && !order.confirmedAt) {
            order.confirmedAt = new Date();
        } else if (status === OrderStatus.SHIPPED && !order.shippedAt) {
            order.shippedAt = new Date();
        } else if (status === OrderStatus.DELIVERED && !order.deliveredAt) {
            order.deliveredAt = new Date();
        } else if (status === OrderStatus.CANCELLED && !order.cancelledAt) {
            order.cancelledAt = new Date();
        }

        await this.orderRepository.save(order);

        // Emit status change event
        const eventTypeMap: Record<OrderStatus, EcommerceEventType> = {
            [OrderStatus.CONFIRMED]: EcommerceEventType.ORDER_CONFIRMED,
            [OrderStatus.SHIPPED]: EcommerceEventType.ORDER_SHIPPED,
            [OrderStatus.DELIVERED]: EcommerceEventType.ORDER_DELIVERED,
            [OrderStatus.CANCELLED]: EcommerceEventType.ORDER_CANCELLED,
            [OrderStatus.REFUNDED]: EcommerceEventType.ORDER_REFUNDED,
            [OrderStatus.RETURNED]: EcommerceEventType.ORDER_RETURNED,
            [OrderStatus.PENDING]: EcommerceEventType.ORDER_CREATED,
            [OrderStatus.PROCESSING]: EcommerceEventType.ORDER_PROCESSING,
            [OrderStatus.OUT_FOR_DELIVERY]: EcommerceEventType.ORDER_OUT_FOR_DELIVERY,
        };

        if (eventTypeMap[status]) {
            await this.eventsService.emitEvent({
                tenantId,
                storeId: order.storeId,
                contactId: order.contactId,
                eventType: eventTypeMap[status],
                referenceId: order.id,
                referenceType: 'order',
                payload: {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    previousStatus,
                    newStatus: status,
                },
            });
        }

        return order;
    }

    async updateShipping(
        tenantId: string,
        orderId: string,
        trackingNumber: string,
        carrier: string,
        trackingUrl?: string,
    ): Promise<EcommerceOrder> {
        const order = await this.findById(tenantId, orderId);

        order.trackingNumber = trackingNumber;
        order.carrier = carrier;
        order.trackingUrl = trackingUrl;

        if (order.status !== OrderStatus.SHIPPED) {
            order.status = OrderStatus.SHIPPED;
            order.shippedAt = new Date();
        }

        await this.orderRepository.save(order);

        // Emit shipped event
        await this.eventsService.emitEvent({
            tenantId,
            storeId: order.storeId,
            contactId: order.contactId,
            eventType: EcommerceEventType.ORDER_SHIPPED,
            referenceId: order.id,
            referenceType: 'order',
            payload: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                trackingNumber,
                carrier,
                trackingUrl,
            },
        });

        return order;
    }

    async findById(tenantId: string, orderId: string): Promise<EcommerceOrder> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, tenantId },
            relations: ['contact', 'store'],
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    async findAll(
        tenantId: string,
        options: {
            storeId?: string;
            status?: OrderStatus;
            paymentStatus?: PaymentStatus;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        } = {},
    ): Promise<{ orders: EcommerceOrder[]; total: number }> {
        const { storeId, status, paymentStatus, startDate, endDate, page = 1, limit = 20 } = options;

        const where: any = { tenantId };

        if (storeId) where.storeId = storeId;
        if (status) where.status = status;
        if (paymentStatus) where.paymentStatus = paymentStatus;
        if (startDate && endDate) {
            where.orderDate = Between(startDate, endDate);
        }

        const [orders, total] = await this.orderRepository.findAndCount({
            where,
            relations: ['contact'],
            order: { orderDate: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { orders, total };
    }

    async getStats(tenantId: string, storeId?: string): Promise<OrderStats> {
        const where: any = { tenantId };
        if (storeId) where.storeId = storeId;

        const orders = await this.orderRepository.find({ where });

        const stats: OrderStats = {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, o) => sum + Number(o.total), 0),
            averageOrderValue: 0,
            pendingOrders: orders.filter((o) => o.status === OrderStatus.PENDING).length,
            shippedOrders: orders.filter((o) => o.status === OrderStatus.SHIPPED).length,
            deliveredOrders: orders.filter((o) => o.status === OrderStatus.DELIVERED).length,
            cancelledOrders: orders.filter((o) => o.status === OrderStatus.CANCELLED).length,
            codOrders: orders.filter((o) => o.paymentMethod === PaymentMethod.COD).length,
            prepaidOrders: orders.filter((o) => o.paymentMethod === PaymentMethod.PREPAID).length,
        };

        stats.averageOrderValue = stats.totalOrders > 0
            ? stats.totalRevenue / stats.totalOrders
            : 0;

        return stats;
    }

    async getContactOrders(tenantId: string, contactId: string): Promise<EcommerceOrder[]> {
        return this.orderRepository.find({
            where: { tenantId, contactId },
            order: { orderDate: 'DESC' },
        });
    }

    async getContactOrderCount(tenantId: string, contactId: string): Promise<number> {
        return this.orderRepository.count({
            where: { tenantId, contactId },
        });
    }

    async markConfirmationSent(orderId: string): Promise<void> {
        await this.orderRepository.update(orderId, { confirmationSent: true });
    }

    async markShippingNotificationSent(orderId: string): Promise<void> {
        await this.orderRepository.update(orderId, { shippingNotificationSent: true });
    }

    async markCodConfirmationSent(orderId: string): Promise<void> {
        await this.orderRepository.update(orderId, { codConfirmationSent: true });
    }
}
