import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export interface WorkflowNode {
    id: string;
    type: 'trigger' | 'action' | 'condition' | 'delay';
    name: string;
    config: Record<string, any>;
}

@Entity('automation_templates')
@Index(['category'])
@Index(['isActive'])
export class AutomationTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ default: 'welcome' })
    category: string; // welcome, cart, nurture, support, notification, feedback

    @Column({ default: 'contact_created' })
    triggerType: string; // contact_created, message_received, tag_added, form_submitted, order_placed, cart_abandoned, scheduled

    @Column({ type: 'jsonb', default: [] })
    nodes: WorkflowNode[];

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'simple-array', default: '' })
    allowedPlans: string[]; // free, starter, pro, enterprise

    @Column({ default: 0 })
    usageCount: number;

    @Column({ nullable: true })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
