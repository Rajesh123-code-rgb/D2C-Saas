import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
    CarrierConnection,
    Shipment,
    ShipmentStatus,
    CarrierType,
} from '../entities/shipment.entity';
import { EcommerceOrder, OrderStatus } from '../entities/order.entity';
import { EventsService } from './events.service';
import { EcommerceEventType } from '../entities/event.entity';

export interface CreateShipmentDto {
    orderId: string;
    carrier: CarrierType;
    trackingNumber: string;
    awbNumber?: string;
    weight?: number;
    dimensions?: { length: number; width: number; height: number };
    expectedDelivery?: Date;
}

export interface TrackingUpdate {
    status: ShipmentStatus;
    location: string;
    timestamp: Date;
    description: string;
}

@Injectable()
export class ShipmentsService {
    private readonly logger = new Logger(ShipmentsService.name);

    constructor(
        @InjectRepository(CarrierConnection)
        private readonly carrierRepository: Repository<CarrierConnection>,
        @InjectRepository(Shipment)
        private readonly shipmentRepository: Repository<Shipment>,
        @InjectRepository(EcommerceOrder)
        private readonly orderRepository: Repository<EcommerceOrder>,
        @InjectQueue('ecommerce-events')
        private readonly eventsQueue: Queue,
        private readonly eventsService: EventsService,
    ) { }

    // ========== Carrier Management ==========

    async connectCarrier(
        tenantId: string,
        data: {
            carrier: CarrierType;
            name: string;
            apiKey?: string;
            apiSecret?: string;
            accountId?: string;
            settings?: any;
        },
    ): Promise<CarrierConnection> {
        const connection = this.carrierRepository.create({
            tenantId,
            carrier: data.carrier,
            name: data.name,
            apiKey: data.apiKey,
            apiSecret: data.apiSecret,
            accountId: data.accountId,
            settings: data.settings || {
                enableAutoTracking: true,
                trackingUpdateInterval: 4,
                sendShippingUpdate: true,
                sendDeliveryConfirmation: true,
                sendRTOAlert: true,
            },
        });

        await this.carrierRepository.save(connection);
        this.logger.log(`Carrier connected: ${data.name}`);

        return connection;
    }

    async getCarriers(tenantId: string): Promise<CarrierConnection[]> {
        return this.carrierRepository.find({
            where: { tenantId },
            order: { isDefault: 'DESC', name: 'ASC' },
        });
    }

    async setDefaultCarrier(tenantId: string, carrierId: string): Promise<void> {
        // Unset current default
        await this.carrierRepository.update(
            { tenantId, isDefault: true },
            { isDefault: false },
        );

        // Set new default
        await this.carrierRepository.update(
            { id: carrierId, tenantId },
            { isDefault: true },
        );
    }

    // ========== Shipment Management ==========

    async createShipment(tenantId: string, dto: CreateShipmentDto): Promise<Shipment> {
        const order = await this.orderRepository.findOne({
            where: { id: dto.orderId, tenantId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const shipment = this.shipmentRepository.create({
            tenantId,
            orderId: dto.orderId,
            carrier: dto.carrier,
            trackingNumber: dto.trackingNumber,
            awbNumber: dto.awbNumber,
            weight: dto.weight,
            dimensions: dto.dimensions,
            expectedDelivery: dto.expectedDelivery,
            status: ShipmentStatus.CREATED,
            trackingHistory: [
                {
                    status: 'created',
                    location: 'Warehouse',
                    timestamp: new Date(),
                    description: 'Shipment created',
                },
            ],
        });

        await this.shipmentRepository.save(shipment);

        // Update order with tracking info
        await this.orderRepository.update(order.id, {
            trackingNumber: dto.trackingNumber,
            carrier: dto.carrier,
            status: OrderStatus.PROCESSING,
        });

        this.logger.log(`Shipment created: ${dto.trackingNumber}`);

        return shipment;
    }

    async getShipment(tenantId: string, id: string): Promise<Shipment> {
        const shipment = await this.shipmentRepository.findOne({
            where: { id, tenantId },
        });

        if (!shipment) {
            throw new NotFoundException('Shipment not found');
        }

        return shipment;
    }

    async getShipmentByTracking(trackingNumber: string): Promise<Shipment | null> {
        return this.shipmentRepository.findOne({
            where: { trackingNumber },
        });
    }

    async getOrderShipments(tenantId: string, orderId: string): Promise<Shipment[]> {
        return this.shipmentRepository.find({
            where: { tenantId, orderId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Update shipment status from carrier webhook
     */
    async updateTrackingStatus(
        trackingNumber: string,
        update: TrackingUpdate,
    ): Promise<Shipment> {
        const shipment = await this.getShipmentByTracking(trackingNumber);

        if (!shipment) {
            throw new NotFoundException(`Shipment not found: ${trackingNumber}`);
        }

        // Add to tracking history
        shipment.trackingHistory = [
            update,
            ...shipment.trackingHistory,
        ];

        // Update status
        shipment.status = update.status;
        shipment.statusMessage = update.description;
        shipment.currentLocation = update.location;

        // Update timestamps based on status
        switch (update.status) {
            case ShipmentStatus.PICKED_UP:
                shipment.pickedUpAt = update.timestamp;
                break;
            case ShipmentStatus.OUT_FOR_DELIVERY:
                shipment.deliveryAttempts += 1;
                shipment.lastAttemptAt = update.timestamp;
                break;
            case ShipmentStatus.DELIVERED:
                shipment.deliveredAt = update.timestamp;
                break;
            case ShipmentStatus.FAILED_DELIVERY:
                shipment.deliveryAttempts += 1;
                shipment.lastAttemptAt = update.timestamp;
                shipment.lastAttemptReason = update.description;
                break;
            case ShipmentStatus.RTO_INITIATED:
                shipment.isRTO = true;
                shipment.rtoInitiatedAt = update.timestamp;
                shipment.rtoReason = update.description;
                break;
        }

        await this.shipmentRepository.save(shipment);

        // Emit event for automation
        await this.emitShippingEvent(shipment, update.status);

        // Update order status
        await this.syncOrderStatus(shipment);

        this.logger.log(`Tracking updated: ${trackingNumber} -> ${update.status}`);

        return shipment;
    }

    /**
     * Sync order status with shipment
     */
    private async syncOrderStatus(shipment: Shipment): Promise<void> {
        let orderStatus: OrderStatus | null = null;

        switch (shipment.status) {
            case ShipmentStatus.PICKED_UP:
            case ShipmentStatus.IN_TRANSIT:
                orderStatus = OrderStatus.SHIPPED;
                break;
            case ShipmentStatus.OUT_FOR_DELIVERY:
                orderStatus = OrderStatus.OUT_FOR_DELIVERY;
                break;
            case ShipmentStatus.DELIVERED:
                orderStatus = OrderStatus.DELIVERED;
                break;
            case ShipmentStatus.RTO_INITIATED:
            case ShipmentStatus.RTO_DELIVERED:
                orderStatus = OrderStatus.RETURNED;
                break;
        }

        if (orderStatus) {
            await this.orderRepository.update(shipment.orderId, { status: orderStatus });
        }
    }

    /**
     * Emit shipping event for automation triggers
     */
    private async emitShippingEvent(shipment: Shipment, status: ShipmentStatus): Promise<void> {
        let eventType: EcommerceEventType;

        switch (status) {
            case ShipmentStatus.PICKED_UP:
            case ShipmentStatus.IN_TRANSIT:
                eventType = EcommerceEventType.ORDER_SHIPPED;
                break;
            case ShipmentStatus.OUT_FOR_DELIVERY:
                eventType = EcommerceEventType.ORDER_OUT_FOR_DELIVERY;
                break;
            case ShipmentStatus.DELIVERED:
                eventType = EcommerceEventType.ORDER_DELIVERED;
                break;
            default:
                return; // No event for other statuses
        }

        // Get order to find contact
        const order = await this.orderRepository.findOne({
            where: { id: shipment.orderId },
        });

        if (order) {
            await this.eventsService.emitEvent({
                tenantId: shipment.tenantId,
                storeId: order.storeId,
                contactId: order.contactId,
                eventType,
                referenceId: shipment.orderId,
                referenceType: 'order',
                payload: {
                    trackingNumber: shipment.trackingNumber,
                    carrier: shipment.carrier,
                    status: shipment.status,
                    location: shipment.currentLocation,
                    expectedDelivery: shipment.expectedDelivery,
                },
            });
        }
    }

    /**
     * Get shipment statistics
     */
    async getShipmentStats(tenantId: string): Promise<{
        total: number;
        inTransit: number;
        delivered: number;
        rto: number;
        avgDeliveryDays: number;
    }> {
        const shipments = await this.shipmentRepository.find({
            where: { tenantId },
        });

        const total = shipments.length;
        const inTransit = shipments.filter(s =>
            [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY].includes(s.status)
        ).length;
        const delivered = shipments.filter(s => s.status === ShipmentStatus.DELIVERED).length;
        const rto = shipments.filter(s => s.isRTO).length;

        // Calculate average delivery days
        const deliveredShipments = shipments.filter(s => s.deliveredAt && s.createdAt);
        const avgDeliveryDays = deliveredShipments.length > 0
            ? deliveredShipments.reduce((sum, s) => {
                const days = (new Date(s.deliveredAt!).getTime() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                return sum + days;
            }, 0) / deliveredShipments.length
            : 0;

        return {
            total,
            inTransit,
            delivered,
            rto,
            avgDeliveryDays: Math.round(avgDeliveryDays * 10) / 10,
        };
    }
}
