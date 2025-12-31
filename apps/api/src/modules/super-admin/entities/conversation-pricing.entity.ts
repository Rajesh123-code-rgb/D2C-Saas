import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum ConversationCategory {
    MARKETING = 'marketing',
    UTILITY = 'utility',
    AUTHENTICATION = 'authentication',
    SERVICE = 'service',
}

@Entity('conversation_pricing')
@Index(['countryCode', 'category'], { unique: true })
@Index(['isActive'])
export class ConversationPricing {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Scope
    @Column({ type: 'varchar', length: 2 })
    countryCode: string;  // 'IN', 'US', 'GB', '*' for default

    @Column({ type: 'varchar', length: 100, nullable: true })
    countryName: string;

    @Column({
        type: 'enum',
        enum: ConversationCategory,
    })
    category: ConversationCategory;

    // Costs (what we pay Meta) - in USD
    @Column({ type: 'decimal', precision: 10, scale: 6 })
    metaCostUsd: number;

    // Platform pricing (what tenant pays) - in platform currency
    @Column({ type: 'decimal', precision: 10, scale: 4 })
    platformCredits: number;  // Credits per conversation

    @Column({ type: 'decimal', precision: 10, scale: 4 })
    platformCurrencyAmount: number;  // In platform currency

    @Column({ type: 'varchar', length: 3, default: 'INR' })
    platformCurrency: string;

    // Markup
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 30 })
    markupPercentage: number;

    // Free tier
    @Column({ type: 'boolean', default: false })
    isFree: boolean;  // Service conversations = true (after Nov 2024)

    // Effective dates (for pricing changes)
    @Column({ type: 'date', nullable: true })
    effectiveFrom: Date;

    @Column({ type: 'date', nullable: true })
    effectiveTo: Date;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// Default conversation pricing (sample for India)
export const DEFAULT_CONVERSATION_PRICING: Partial<ConversationPricing>[] = [
    // India pricing
    {
        countryCode: 'IN',
        countryName: 'India',
        category: ConversationCategory.MARKETING,
        metaCostUsd: 0.0099,
        platformCredits: 1,
        platformCurrencyAmount: 1.00,
        platformCurrency: 'INR',
        markupPercentage: 20,
        isFree: false,
        isActive: true,
    },
    {
        countryCode: 'IN',
        countryName: 'India',
        category: ConversationCategory.UTILITY,
        metaCostUsd: 0.0042,
        platformCredits: 0.5,
        platformCurrencyAmount: 0.50,
        platformCurrency: 'INR',
        markupPercentage: 20,
        isFree: false,
        isActive: true,
    },
    {
        countryCode: 'IN',
        countryName: 'India',
        category: ConversationCategory.AUTHENTICATION,
        metaCostUsd: 0.0042,
        platformCredits: 0.5,
        platformCurrencyAmount: 0.50,
        platformCurrency: 'INR',
        markupPercentage: 20,
        isFree: false,
        isActive: true,
    },
    {
        countryCode: 'IN',
        countryName: 'India',
        category: ConversationCategory.SERVICE,
        metaCostUsd: 0,
        platformCredits: 0,
        platformCurrencyAmount: 0,
        platformCurrency: 'INR',
        markupPercentage: 0,
        isFree: true,  // Free since Nov 2024
        isActive: true,
    },
    // Default pricing (fallback)
    {
        countryCode: '*',
        countryName: 'Default (All Countries)',
        category: ConversationCategory.MARKETING,
        metaCostUsd: 0.0250,
        platformCredits: 2.5,
        platformCurrencyAmount: 2.50,
        platformCurrency: 'INR',
        markupPercentage: 25,
        isFree: false,
        isActive: true,
    },
    {
        countryCode: '*',
        countryName: 'Default (All Countries)',
        category: ConversationCategory.UTILITY,
        metaCostUsd: 0.0150,
        platformCredits: 1.5,
        platformCurrencyAmount: 1.50,
        platformCurrency: 'INR',
        markupPercentage: 25,
        isFree: false,
        isActive: true,
    },
    {
        countryCode: '*',
        countryName: 'Default (All Countries)',
        category: ConversationCategory.AUTHENTICATION,
        metaCostUsd: 0.0135,
        platformCredits: 1.25,
        platformCurrencyAmount: 1.25,
        platformCurrency: 'INR',
        markupPercentage: 25,
        isFree: false,
        isActive: true,
    },
    {
        countryCode: '*',
        countryName: 'Default (All Countries)',
        category: ConversationCategory.SERVICE,
        metaCostUsd: 0,
        platformCredits: 0,
        platformCurrencyAmount: 0,
        platformCurrency: 'INR',
        markupPercentage: 0,
        isFree: true,
        isActive: true,
    },
];
