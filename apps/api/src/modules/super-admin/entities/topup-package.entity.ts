import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

@Entity('topup_packages')
@Index(['isActive'])
@Index(['sortOrder'])
export class TopUpPackage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Package details
    @Column({ type: 'varchar', length: 100 })
    name: string;  // "Starter Pack", "Business Pack", "Enterprise Pack"

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    badge: string;  // "POPULAR", "BEST VALUE", "NEW"

    // Credits
    @Column({ type: 'int' })
    credits: number;  // Base credits in this package

    @Column({ type: 'int', default: 0 })
    bonusCredits: number;  // Extra credits (e.g., "Buy 1000, get 100 free")

    // Pricing
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;  // Package price

    @Column({ type: 'varchar', length: 3, default: 'INR' })
    currency: string;

    // For display
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    originalPrice: number;  // For strikethrough pricing

    @Column({ type: 'int', default: 0 })
    savingsPercentage: number;  // "Save 20%"

    // Availability
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'boolean', default: false })
    isPopular: boolean;  // Highlight badge

    @Column({ type: 'boolean', default: false })
    isBestValue: boolean;  // Best value badge

    @Column({ type: 'boolean', default: false })
    isHidden: boolean;  // Hidden from regular selection but can be used

    // Restrictions
    @Column({ type: 'int', default: 1 })
    minPurchaseCount: number;  // Minimum times to purchase

    @Column({ type: 'int', nullable: true })
    maxPurchaseCount: number;  // Maximum times to purchase (null = unlimited)

    @Column({ type: 'jsonb', nullable: true })
    availableForPlans: string[];  // Which subscription plans can buy this

    // Validity
    @Column({ type: 'int', default: 0 })
    creditsValidityDays: number;  // Credits expire after X days (0 = never)

    // Auto-recharge specific
    @Column({ type: 'boolean', default: true })
    allowForAutoRecharge: boolean;

    // Promotional
    @Column({ type: 'timestamp', nullable: true })
    promoStartDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    promoEndDate: Date;

    @Column({ type: 'varchar', length: 50, nullable: true })
    promoCode: string;

    // Display order
    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Computed properties
    get totalCredits(): number {
        return this.credits + this.bonusCredits;
    }

    get pricePerCredit(): number {
        if (this.totalCredits === 0) return 0;
        return this.price / this.totalCredits;
    }

    get isOnPromo(): boolean {
        const now = new Date();
        if (!this.promoStartDate || !this.promoEndDate) return false;
        return now >= this.promoStartDate && now <= this.promoEndDate;
    }
}

// Default top-up packages
export const DEFAULT_TOPUP_PACKAGES: Partial<TopUpPackage>[] = [
    {
        name: 'Starter',
        description: 'Perfect for getting started',
        credits: 500,
        bonusCredits: 0,
        price: 500,
        currency: 'INR',
        sortOrder: 1,
        isActive: true,
        allowForAutoRecharge: true,
    },
    {
        name: 'Growth',
        description: 'For growing businesses',
        badge: 'POPULAR',
        credits: 2000,
        bonusCredits: 200,
        price: 1800,
        currency: 'INR',
        originalPrice: 2200,
        savingsPercentage: 18,
        sortOrder: 2,
        isActive: true,
        isPopular: true,
        allowForAutoRecharge: true,
    },
    {
        name: 'Business',
        description: 'Best value for high-volume messaging',
        badge: 'BEST VALUE',
        credits: 5000,
        bonusCredits: 750,
        price: 4000,
        currency: 'INR',
        originalPrice: 5750,
        savingsPercentage: 30,
        sortOrder: 3,
        isActive: true,
        isBestValue: true,
        allowForAutoRecharge: true,
    },
    {
        name: 'Enterprise',
        description: 'Maximum savings for enterprise',
        credits: 20000,
        bonusCredits: 5000,
        price: 12500,
        currency: 'INR',
        originalPrice: 25000,
        savingsPercentage: 50,
        sortOrder: 4,
        isActive: true,
        availableForPlans: ['pro', 'enterprise'],
        allowForAutoRecharge: true,
    },
];
