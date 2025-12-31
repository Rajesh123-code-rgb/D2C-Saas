import { IsString, IsNumber, IsOptional, IsBoolean, IsUUID, IsEnum, Min, Max } from 'class-validator';
import { ConversationCategory } from '../entities/conversation-pricing.entity';

// Wallet DTOs
export class CreateWalletDto {
    @IsUUID()
    tenantId: string;

    @IsString()
    @IsOptional()
    currency?: string;
}

export class UpdateWalletSettingsDto {
    @IsNumber()
    @IsOptional()
    @Min(0)
    lowBalanceThreshold?: number;

    @IsBoolean()
    @IsOptional()
    autoRechargeEnabled?: boolean;

    @IsNumber()
    @IsOptional()
    @Min(0)
    autoRechargeThreshold?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    autoRechargeAmount?: number;

    @IsString()
    @IsOptional()
    autoRechargePaymentMethodId?: string;

    @IsUUID()
    @IsOptional()
    autoRechargePackageId?: string;
}

export class WalletResponseDto {
    id: string;
    tenantId: string;
    creditBalance: number;
    currencyBalance: number;
    currency: string;
    planCreditsMonthly: number;
    planCreditsUsed: number;
    planCreditsResetDate: Date;
    lowBalanceThreshold: number;
    autoRechargeEnabled: boolean;
    autoRechargeThreshold: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

// Top-Up DTOs
export class PurchaseCreditsDto {
    @IsUUID()
    tenantId: string;

    @IsUUID()
    @IsOptional()
    packageId?: string;

    @IsNumber()
    @IsOptional()
    @Min(100)
    customCredits?: number;

    @IsString()
    paymentMethodId: string;

    @IsString()
    @IsOptional()
    paymentGateway?: 'stripe' | 'razorpay';
}

export class AddCreditsDto {
    @IsUUID()
    tenantId: string;

    @IsNumber()
    @Min(1)
    credits: number;

    @IsString()
    reason: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export class DeductCreditsDto {
    @IsUUID()
    tenantId: string;

    @IsNumber()
    @Min(0)
    credits: number;

    @IsEnum(ConversationCategory)
    conversationType: ConversationCategory;

    @IsUUID()
    @IsOptional()
    messageId?: string;

    @IsUUID()
    @IsOptional()
    conversationId?: string;

    @IsUUID()
    @IsOptional()
    contactId?: string;

    @IsString()
    @IsOptional()
    contactCountry?: string;
}

export class RefundCreditsDto {
    @IsUUID()
    transactionId: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    amount?: number;

    @IsString()
    reason: string;
}

// Transaction DTOs
export class TransactionFilterDto {
    @IsUUID()
    @IsOptional()
    tenantId?: string;

    @IsString()
    @IsOptional()
    type?: string;

    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsOptional()
    startDate?: string;

    @IsString()
    @IsOptional()
    endDate?: string;

    @IsNumber()
    @IsOptional()
    @Min(1)
    page?: number;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(100)
    limit?: number;
}

export class TransactionResponseDto {
    id: string;
    tenantId: string;
    type: string;
    creditsAmount: number;
    currencyAmount: number;
    balanceBefore: number;
    balanceAfter: number;
    status: string;
    description: string;
    conversationType?: string;
    createdAt: Date;
}

export class TransactionListResponseDto {
    transactions: TransactionResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Pricing DTOs
export class CreatePricingDto {
    @IsString()
    countryCode: string;

    @IsString()
    @IsOptional()
    countryName?: string;

    @IsEnum(ConversationCategory)
    category: ConversationCategory;

    @IsNumber()
    @Min(0)
    metaCostUsd: number;

    @IsNumber()
    @Min(0)
    platformCredits: number;

    @IsNumber()
    @Min(0)
    platformCurrencyAmount: number;

    @IsString()
    @IsOptional()
    platformCurrency?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    markupPercentage?: number;

    @IsBoolean()
    @IsOptional()
    isFree?: boolean;
}

export class UpdatePricingDto {
    @IsNumber()
    @IsOptional()
    @Min(0)
    metaCostUsd?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    platformCredits?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    platformCurrencyAmount?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    markupPercentage?: number;

    @IsBoolean()
    @IsOptional()
    isFree?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class PricingResponseDto {
    id: string;
    countryCode: string;
    countryName: string;
    category: ConversationCategory;
    metaCostUsd: number;
    platformCredits: number;
    platformCurrencyAmount: number;
    platformCurrency: string;
    markupPercentage: number;
    isFree: boolean;
    isActive: boolean;
}

// Top-Up Package DTOs
export class CreateTopUpPackageDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    badge?: string;

    @IsNumber()
    @Min(1)
    credits: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    bonusCredits?: number;

    @IsNumber()
    @Min(0)
    price: number;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsNumber()
    @IsOptional()
    originalPrice?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    savingsPercentage?: number;

    @IsBoolean()
    @IsOptional()
    isPopular?: boolean;

    @IsBoolean()
    @IsOptional()
    isBestValue?: boolean;

    @IsNumber()
    @IsOptional()
    sortOrder?: number;
}

export class UpdateTopUpPackageDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    @Min(1)
    credits?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    bonusCredits?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    price?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    isPopular?: boolean;

    @IsNumber()
    @IsOptional()
    sortOrder?: number;
}

export class TopUpPackageResponseDto {
    id: string;
    name: string;
    description: string;
    badge: string;
    credits: number;
    bonusCredits: number;
    totalCredits: number;
    price: number;
    currency: string;
    pricePerCredit: number;
    originalPrice: number;
    savingsPercentage: number;
    isActive: boolean;
    isPopular: boolean;
    isBestValue: boolean;
}

// Usage Stats DTOs
export class UsageStatsDto {
    tenantId: string;
    period: string;
    totalCreditsUsed: number;
    totalConversations: number;
    conversationsByCategory: {
        marketing: number;
        utility: number;
        authentication: number;
        service: number;
    };
    totalSpent: number;
    currency: string;
}

export class RevenueStatsDto {
    period: string;
    totalRevenue: number;
    totalMetaCost: number;
    grossMargin: number;
    marginPercentage: number;
    totalConversations: number;
    topTenants: {
        tenantId: string;
        tenantName: string;
        conversations: number;
        revenue: number;
    }[];
}
