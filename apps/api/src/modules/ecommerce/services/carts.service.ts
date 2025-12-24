import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { AbandonedCart, CartRecoveryStatus } from '../entities/cart.entity';
import { ContactsService } from '../../contacts/contacts.service';
import { EventsService } from './events.service';
import { EcommerceEventType } from '../entities/event.entity';

export interface CreateCartDto {
    storeId: string;
    platformCartId?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    items: any[];
    subtotal: number;
    total: number;
    currency?: string;
    checkoutUrl?: string;
    metadata?: Record<string, any>;
}

export interface CartStats {
    totalAbandoned: number;
    pendingRecovery: number;
    recovered: number;
    lost: number;
    totalValue: number;
    recoveredValue: number;
    recoveryRate: number;
}

@Injectable()
export class CartsService {
    private readonly logger = new Logger(CartsService.name);

    constructor(
        @InjectRepository(AbandonedCart)
        private readonly cartRepository: Repository<AbandonedCart>,
        private readonly contactsService: ContactsService,
        private readonly eventsService: EventsService,
    ) { }

    async createOrUpdateCart(tenantId: string, dto: CreateCartDto): Promise<AbandonedCart> {
        // Find existing cart
        let cart = await this.cartRepository.findOne({
            where: {
                tenantId,
                storeId: dto.storeId,
                platformCartId: dto.platformCartId,
            },
        });

        // Find or create contact
        let contactId: string | null = null;
        if (dto.customerPhone || dto.customerEmail) {
            const contact = await this.contactsService.findOrCreate(
                tenantId,
                dto.customerPhone ? { phone: dto.customerPhone } : { email: dto.customerEmail! },
                {
                    name: dto.customerName || 'Unknown',
                    source: 'ecommerce',
                },
            );
            contactId = contact.id;
        }

        if (cart) {
            // Update existing cart
            cart.items = dto.items;
            cart.subtotal = dto.subtotal;
            cart.total = dto.total;
            cart.contactId = contactId || cart.contactId;
            cart.checkoutUrl = dto.checkoutUrl || cart.checkoutUrl;
        } else {
            // Create new cart
            cart = this.cartRepository.create({
                tenantId,
                storeId: dto.storeId,
                contactId,
                platformCartId: dto.platformCartId,
                checkoutUrl: dto.checkoutUrl,
                items: dto.items,
                subtotal: dto.subtotal,
                total: dto.total,
                currency: dto.currency || 'INR',
                recoveryStatus: CartRecoveryStatus.PENDING,
                abandonedAt: new Date(),
                metadata: dto.metadata,
            });
        }

        await this.cartRepository.save(cart);
        return cart;
    }

    async markAbandoned(cartId: string): Promise<AbandonedCart> {
        const cart = await this.cartRepository.findOne({ where: { id: cartId } });
        if (!cart) throw new Error('Cart not found');

        cart.recoveryStatus = CartRecoveryStatus.PENDING;
        cart.abandonedAt = new Date();

        // Set first reminder for 1 hour later
        cart.nextReminderAt = new Date(Date.now() + 60 * 60 * 1000);

        await this.cartRepository.save(cart);

        // Emit cart abandoned event
        await this.eventsService.emitEvent({
            tenantId: cart.tenantId,
            storeId: cart.storeId,
            contactId: cart.contactId,
            eventType: EcommerceEventType.CART_ABANDONED,
            referenceId: cart.id,
            referenceType: 'cart',
            payload: {
                cartId: cart.id,
                total: cart.total,
                items: cart.items,
                checkoutUrl: cart.checkoutUrl,
            },
        });

        return cart;
    }

    async markRecovered(cartId: string, orderId: string): Promise<AbandonedCart> {
        const cart = await this.cartRepository.findOne({ where: { id: cartId } });
        if (!cart) throw new Error('Cart not found');

        cart.recoveryStatus = CartRecoveryStatus.RECOVERED;
        cart.recoveredAt = new Date();
        cart.recoveredOrderId = orderId;

        await this.cartRepository.save(cart);

        // Emit cart recovered event
        await this.eventsService.emitEvent({
            tenantId: cart.tenantId,
            storeId: cart.storeId,
            contactId: cart.contactId,
            eventType: EcommerceEventType.CART_RECOVERED,
            referenceId: cart.id,
            referenceType: 'cart',
            payload: {
                cartId: cart.id,
                orderId,
                total: cart.total,
                remindersSent: cart.reminderCount,
            },
        });

        return cart;
    }

    async recordReminderSent(cartId: string): Promise<AbandonedCart> {
        const cart = await this.cartRepository.findOne({ where: { id: cartId } });
        if (!cart) throw new Error('Cart not found');

        cart.reminderCount += 1;
        cart.lastRemindedAt = new Date();
        cart.recoveryStatus = CartRecoveryStatus.REMINDER_SENT;

        if (cart.reminderCount >= cart.maxReminders) {
            cart.recoveryStatus = CartRecoveryStatus.LOST;
            cart.nextReminderAt = null;
        } else {
            // Schedule next reminder (24 hours later)
            cart.nextReminderAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }

        await this.cartRepository.save(cart);
        return cart;
    }

    async getCartsNeedingReminder(): Promise<AbandonedCart[]> {
        return this.cartRepository.find({
            where: {
                recoveryStatus: CartRecoveryStatus.PENDING,
                nextReminderAt: LessThan(new Date()),
            },
            relations: ['contact', 'store'],
        });
    }

    async findById(tenantId: string, cartId: string): Promise<AbandonedCart | null> {
        return this.cartRepository.findOne({
            where: { id: cartId, tenantId },
            relations: ['contact'],
        });
    }

    async findAll(
        tenantId: string,
        options: {
            storeId?: string;
            status?: CartRecoveryStatus;
            page?: number;
            limit?: number;
        } = {},
    ): Promise<{ carts: AbandonedCart[]; total: number }> {
        const { storeId, status, page = 1, limit = 20 } = options;

        const where: any = { tenantId };
        if (storeId) where.storeId = storeId;
        if (status) where.recoveryStatus = status;

        const [carts, total] = await this.cartRepository.findAndCount({
            where,
            relations: ['contact'],
            order: { abandonedAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { carts, total };
    }

    async getStats(tenantId: string, storeId?: string): Promise<CartStats> {
        const where: any = { tenantId };
        if (storeId) where.storeId = storeId;

        const carts = await this.cartRepository.find({ where });

        const recovered = carts.filter((c) => c.recoveryStatus === CartRecoveryStatus.RECOVERED);
        const lost = carts.filter((c) => c.recoveryStatus === CartRecoveryStatus.LOST);
        const pending = carts.filter((c) =>
            c.recoveryStatus === CartRecoveryStatus.PENDING ||
            c.recoveryStatus === CartRecoveryStatus.REMINDER_SENT
        );

        const totalValue = carts.reduce((sum, c) => sum + Number(c.total), 0);
        const recoveredValue = recovered.reduce((sum, c) => sum + Number(c.total), 0);

        return {
            totalAbandoned: carts.length,
            pendingRecovery: pending.length,
            recovered: recovered.length,
            lost: lost.length,
            totalValue,
            recoveredValue,
            recoveryRate: carts.length > 0 ? (recovered.length / carts.length) * 100 : 0,
        };
    }

    async findByPlatformCartId(
        tenantId: string,
        storeId: string,
        platformCartId: string,
    ): Promise<AbandonedCart | null> {
        return this.cartRepository.findOne({
            where: { tenantId, storeId, platformCartId },
        });
    }
}
