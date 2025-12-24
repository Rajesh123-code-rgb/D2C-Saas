import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('refresh_tokens')
@Index(['userId'])
@Index(['token'], { unique: true })
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    token: string;

    @Column({ nullable: true })
    deviceInfo: string;

    @Column({ nullable: true })
    ipAddress: string;

    @Column()
    expiresAt: Date;

    @Column({ default: false })
    isRevoked: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;
}
