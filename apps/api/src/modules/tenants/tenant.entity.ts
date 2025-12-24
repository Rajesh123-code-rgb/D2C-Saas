import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Contact } from '../contacts/contact.entity';
import { Conversation } from '../inbox/conversation.entity';
import { Channel } from '../channels/channel.entity';

export enum SubscriptionTier {
    FREE = 'free',
    STARTER = 'starter',
    PROFESSIONAL = 'professional',
    ENTERPRISE = 'enterprise',
}

export enum TenantStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    TRIAL = 'trial',
    CANCELLED = 'cancelled',
}

export interface OnboardingStatus {
    completed: boolean;
    skipped: boolean;
    currentStep: number;
    stepsCompleted: string[];
    stepsSkipped: string[];
    storeConnected: boolean;
    channelConnected: boolean;
    teamInvited: boolean;
    startedAt: string;
    completedAt?: string;
}

@Entity('tenants')
export class Tenant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({ unique: true })
    slug: string;

    @Column({
        type: 'enum',
        enum: SubscriptionTier,
        default: SubscriptionTier.FREE,
    })
    subscriptionTier: SubscriptionTier;

    @Column({
        type: 'enum',
        enum: TenantStatus,
        default: TenantStatus.TRIAL,
    })
    status: TenantStatus;

    @Column({ type: 'jsonb', nullable: true })
    settings: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    billingInfo: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    onboardingStatus: OnboardingStatus;

    @Column({ nullable: true })
    stripeCustomerId: string;

    @Column({ nullable: true })
    stripeSubscriptionId: string;

    @Column({ type: 'timestamp', nullable: true })
    trialEndsAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    subscriptionEndsAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @OneToMany(() => User, (user) => user.tenant)
    users: User[];

    @OneToMany(() => Contact, (contact) => contact.tenant)
    contacts: Contact[];

    @OneToMany(() => Conversation, (conversation) => conversation.tenant)
    conversations: Conversation[];

    @OneToMany(() => Channel, (channel) => channel.tenant)
    channels: Channel[];
}
