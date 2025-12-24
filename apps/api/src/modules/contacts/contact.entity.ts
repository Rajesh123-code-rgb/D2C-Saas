import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Conversation } from '../inbox/conversation.entity';

export enum ContactSource {
    WHATSAPP = 'whatsapp',
    INSTAGRAM = 'instagram',
    EMAIL = 'email',
    MANUAL = 'manual',
    IMPORT = 'import',
    ECOMMERCE = 'ecommerce',
}

export enum LifecycleStage {
    LEAD = 'lead',
    PROSPECT = 'prospect',
    CUSTOMER = 'customer',
    REPEAT_CUSTOMER = 'repeat_customer',
    CHURNED = 'churned',
}

@Entity('contacts')
@Index(['tenantId', 'phone'], { unique: true, where: 'phone IS NOT NULL' })
@Index(['tenantId', 'email'], { unique: true, where: 'email IS NOT NULL' })
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    tenantId: string;

    @Column({ nullable: true })
    name: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    avatarUrl: string;

    @Column({
        type: 'enum',
        enum: ContactSource,
        default: ContactSource.MANUAL,
    })
    source: ContactSource;

    @Column({
        type: 'enum',
        enum: LifecycleStage,
        default: LifecycleStage.LEAD,
    })
    lifecycleStage: LifecycleStage;

    @Column('simple-array', { nullable: true })
    tags: string[];

    @Column({ type: 'jsonb', nullable: true })
    customFields: Record<string, any>;

    @Column({ type: 'int', default: 0 })
    engagementScore: number;

    @Column({ type: 'boolean', default: false })
    optedInWhatsApp: boolean;

    @Column({ type: 'boolean', default: false })
    optedInEmail: boolean;

    @Column({ type: 'boolean', default: false })
    optedInSMS: boolean;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ type: 'timestamp', nullable: true })
    lastContactedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Tenant, (tenant) => tenant.contacts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @OneToMany(() => Conversation, (conversation) => conversation.contact)
    conversations: Conversation[];
}
