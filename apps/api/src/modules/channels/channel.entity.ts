import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export enum ChannelType {
    WHATSAPP = 'whatsapp',
    INSTAGRAM = 'instagram',
    EMAIL = 'email',
}

export enum ChannelStatus {
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected',
    ERROR = 'error',
    PENDING = 'pending',
}

@Entity('channels')
@Index(['tenantId', 'channelType'])
export class Channel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    tenantId: string;

    @Column({
        type: 'enum',
        enum: ChannelType,
    })
    channelType: ChannelType;

    @Column({ nullable: true })
    name: string;

    @Column({
        type: 'enum',
        enum: ChannelStatus,
        default: ChannelStatus.PENDING,
    })
    status: ChannelStatus;

    @Column({ type: 'text', nullable: true })
    credentials: string; // Encrypted JSON

    @Column({ type: 'jsonb', nullable: true })
    settings: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ type: 'timestamp', nullable: true })
    lastSyncAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Tenant, (tenant) => tenant.channels, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;
}
