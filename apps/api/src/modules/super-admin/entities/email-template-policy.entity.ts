
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('email_template_policies')
export class EmailTemplatePolicy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: true })
    isGlobal: boolean;

    @Column({ type: 'jsonb', default: {} })
    maxDailyEmails: {
        free: number;
        starter: number;
        pro: number;
        enterprise: number;
    };

    @Column('text', { array: true, default: [] })
    prohibitedKeywords: string[];

    @Column({ default: false })
    requireDomainVerification: boolean;

    @Column('text', { array: true, default: ['application/pdf', 'image/png', 'image/jpeg'] })
    allowedAttachmentTypes: string[];

    @Column({ default: 10485760 }) // 10MB default
    maxAttachmentSize: number;

    @UpdateDateColumn()
    updatedAt: Date;
}
