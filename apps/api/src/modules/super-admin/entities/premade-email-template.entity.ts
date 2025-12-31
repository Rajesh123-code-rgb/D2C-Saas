import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

@Entity('premade_email_templates')
@Index(['category'])
@Index(['status'])
export class PremadeEmailTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string; // Template identifier (snake_case)

    @Column()
    displayName: string;

    @Column({ default: 'newsletter' })
    category: 'newsletter' | 'promotional' | 'transactional' | 'notification';

    @Column()
    subject: string;

    @Column({ type: 'text', nullable: true })
    preheader: string;

    @Column({ type: 'text' })
    htmlContent: string;

    @Column({ type: 'text', nullable: true })
    textContent: string;

    @Column({ default: 'draft' })
    status: 'draft' | 'active' | 'archived';

    @Column({ type: 'simple-array', default: '' })
    allowedPlans: string[];

    @Column({ default: 0 })
    usageCount: number;

    @Column({ type: 'text', nullable: true })
    thumbnail: string; // Base64 or URL for preview

    @Column({ nullable: true })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
