import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export interface TemplateCategorySettings {
    utility: boolean;
    marketing: boolean;
    authentication: boolean;
}

export interface ButtonTypeSettings {
    callToAction: boolean;
    quickReply: boolean;
    maxButtons: number;
}

export interface MediaSupportSettings {
    image: boolean;
    video: boolean;
    document: boolean;
    location: boolean;
    maxFileSizeMB: number;
}

export interface PlanTemplateRestrictions {
    canCreateTemplates: boolean;
    maxTemplates: number;            // -1 = unlimited
    canUseMediaHeaders: boolean;
    canUseButtons: boolean;
    maxVariables: number;
}

@Entity('whatsapp_template_policies')
export class WhatsAppTemplatePolicy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, default: 'default' })
    name: string;

    // Allowed categories
    @Column({ type: 'jsonb' })
    allowedCategories: TemplateCategorySettings;

    // Allowed languages (ISO codes)
    @Column({ type: 'jsonb' })
    allowedLanguages: string[];

    // Button restrictions
    @Column({ type: 'jsonb' })
    buttonTypes: ButtonTypeSettings;

    // Media support
    @Column({ type: 'jsonb' })
    mediaSupport: MediaSupportSettings;

    // Variable limits
    @Column({ type: 'int', default: 10 })
    maxVariables: number;

    @Column({ type: 'int', default: 1024 })
    maxBodyLength: number;

    @Column({ type: 'int', default: 60 })
    maxHeaderLength: number;

    @Column({ type: 'int', default: 60 })
    maxFooterLength: number;

    // Plan-based restrictions
    @Column({ type: 'jsonb' })
    planRestrictions: Record<string, PlanTemplateRestrictions>;

    // Content restrictions
    @Column({ type: 'jsonb', nullable: true })
    blockedKeywords: string[];  // Words that will be flagged/blocked

    @Column({ type: 'jsonb', nullable: true })
    blockedUrlDomains: string[];  // URL shorteners, etc.

    // Validation settings
    @Column({ type: 'boolean', default: true })
    validateBeforeSubmission: boolean;

    @Column({ type: 'boolean', default: true })
    blockUrlShorteners: boolean;

    @Column({ type: 'boolean', default: true })
    checkExcessiveCaps: boolean;

    @Column({ type: 'int', default: 30 })
    maxCapsPercentage: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// Default WhatsApp template policy
export const DEFAULT_WHATSAPP_TEMPLATE_POLICY: Partial<WhatsAppTemplatePolicy> = {
    name: 'default',
    allowedCategories: {
        utility: true,
        marketing: true,
        authentication: true,
    },
    allowedLanguages: [
        'en', 'en_US', 'en_GB',
        'hi', 'hi_IN',
        'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'bn', 'pa',
        'es', 'fr', 'de', 'pt_BR', 'ar', 'zh_CN', 'ja', 'ko',
    ],
    buttonTypes: {
        callToAction: true,
        quickReply: true,
        maxButtons: 3,
    },
    mediaSupport: {
        image: true,
        video: true,
        document: true,
        location: false,
        maxFileSizeMB: 16,
    },
    maxVariables: 10,
    maxBodyLength: 1024,
    maxHeaderLength: 60,
    maxFooterLength: 60,
    planRestrictions: {
        free: {
            canCreateTemplates: true,
            maxTemplates: 3,
            canUseMediaHeaders: false,
            canUseButtons: true,
            maxVariables: 3,
        },
        starter: {
            canCreateTemplates: true,
            maxTemplates: 10,
            canUseMediaHeaders: true,
            canUseButtons: true,
            maxVariables: 5,
        },
        pro: {
            canCreateTemplates: true,
            maxTemplates: 50,
            canUseMediaHeaders: true,
            canUseButtons: true,
            maxVariables: 10,
        },
        enterprise: {
            canCreateTemplates: true,
            maxTemplates: -1,
            canUseMediaHeaders: true,
            canUseButtons: true,
            maxVariables: 10,
        },
    },
    blockedKeywords: [
        'password', 'credit card', 'ssn', 'bank account',
    ],
    blockedUrlDomains: [
        'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly',
        'is.gd', 'buff.ly', 'adf.ly', 'j.mp', 'rb.gy',
    ],
    validateBeforeSubmission: true,
    blockUrlShorteners: true,
    checkExcessiveCaps: true,
    maxCapsPercentage: 30,
};
