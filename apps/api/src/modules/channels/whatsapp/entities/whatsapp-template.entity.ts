
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from '../../../tenants/tenant.entity';
import { Channel } from '../../channel.entity';

@Entity('whatsapp_templates')
export class WhatsAppTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    tenantId: string;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column()
    @Index()
    channelId: string;

    @ManyToOne(() => Channel)
    @JoinColumn({ name: 'channelId' })
    channel: Channel;

    @Column()
    name: string;

    @Column()
    language: string;

    @Column({ nullable: true })
    category: string; // MARKETING, UTILITY, AUTHENTICATION

    @Column({ default: 'PENDING' })
    @Index()
    status: string; // APPROVED, REJECTED, PENDING, PAUSED, DISABLED

    @Column({ nullable: true })
    metaTemplateId: string;

    @Column({ type: 'jsonb', nullable: true })
    components: any;

    @Column({ nullable: true })
    qualityScore: string; // UNKNOWN, HIGH, MEDIUM, LOW

    @Column({ nullable: true })
    rejectionReason: string;

    @Column({ nullable: true, type: 'timestamp' })
    syncedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
