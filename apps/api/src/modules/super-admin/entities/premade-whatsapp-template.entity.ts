import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export interface WhatsAppButton {
    type: 'quick_reply' | 'url' | 'phone';
    text: string;
    value?: string;
}

@Entity('premade_whatsapp_templates')
@Index(['category'])
@Index(['status'])
@Index(['language'])
export class PremadeWhatsAppTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string; // Template identifier (snake_case)

    @Column()
    displayName: string;

    @Column({ default: 'MARKETING' })
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

    @Column({ default: 'en' })
    language: string;

    @Column({ default: 'none' })
    headerType: 'none' | 'text' | 'image' | 'video' | 'document';

    @Column({ type: 'text', nullable: true })
    headerContent: string;

    @Column({ type: 'text' })
    bodyText: string;

    @Column({ type: 'text', nullable: true })
    footerText: string;

    @Column({ type: 'jsonb', default: [] })
    buttons: WhatsAppButton[];

    @Column({ default: 'draft' })
    status: 'draft' | 'active' | 'archived';

    @Column({ type: 'simple-array', default: '' })
    allowedPlans: string[];

    @Column({ default: 0 })
    usageCount: number;

    @Column({ nullable: true })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
