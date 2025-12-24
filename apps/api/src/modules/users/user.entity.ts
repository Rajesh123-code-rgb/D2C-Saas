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
import { Exclude } from 'class-transformer';
import { Tenant } from '../tenants/tenant.entity';
import { Conversation } from '../inbox/conversation.entity';

export enum UserRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    AGENT = 'agent',
    VIEWER = 'viewer',
}

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    INVITED = 'invited',
}

@Entity('users')
@Index(['tenantId', 'email'], { unique: true })
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    tenantId: string;

    @Column()
    email: string;

    @Column()
    @Exclude()
    passwordHash: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.AGENT,
    })
    role: UserRole;

    @Column({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.ACTIVE,
    })
    status: UserStatus;

    @Column({ nullable: true })
    avatarUrl: string;

    @Column({ type: 'jsonb', nullable: true })
    settings: Record<string, any>;

    @Column({ type: 'timestamp', nullable: true })
    lastLoginAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Tenant, (tenant) => tenant.users, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @OneToMany(() => Conversation, (conversation) => conversation.assignedTo)
    assignedConversations: Conversation[];

    // Virtual field
    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }
}
