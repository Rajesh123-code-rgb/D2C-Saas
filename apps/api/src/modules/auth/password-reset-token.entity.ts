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

export enum ResetTokenType {
    PASSWORD_RESET = 'password_reset',
    EMAIL_VERIFICATION = 'email_verification',
}

@Entity('password_reset_tokens')
@Index(['userId'])
@Index(['token'], { unique: true })
export class PasswordResetToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    token: string;

    @Column({
        type: 'enum',
        enum: ResetTokenType,
        default: ResetTokenType.PASSWORD_RESET,
    })
    type: ResetTokenType;

    @Column()
    expiresAt: Date;

    @Column({ default: false })
    isUsed: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;
}
