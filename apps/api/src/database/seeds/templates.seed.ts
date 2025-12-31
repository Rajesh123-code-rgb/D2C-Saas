import { DataSource } from 'typeorm';
import { AutomationTemplate } from '../../modules/super-admin/entities/automation-template.entity';

export const DEFAULT_AUTOMATION_TEMPLATES: any[] = [
    {
        name: 'order_confirmation',
        description: 'Send WhatsApp message when a new order is placed',
        category: 'Orders',
        triggerType: 'order_created',
        isActive: true,
        allowedPlans: ['starter', 'pro', 'enterprise'],
        nodes: [
            {
                id: 'trigger',
                type: 'trigger',
                name: 'Order Created',
                config: { type: 'order_created' }
            },
            {
                id: 'action_1',
                type: 'action',
                name: 'Send WhatsApp',
                config: {
                    type: 'send_whatsapp_template',
                    templateId: 'order_confirmation'
                }
            }
        ]
    },
    {
        name: 'cod_confirmation',
        description: 'Request confirmation for Cash on Delivery orders',
        category: 'Orders',
        triggerType: 'cod_order_created',
        isActive: true,
        allowedPlans: ['starter', 'pro', 'enterprise'],
        nodes: [
            { id: 'trigger', type: 'trigger', name: 'COD Order', config: { type: 'cod_order_created' } },
            { id: 'action_1', type: 'action', name: 'Send Confirmation', config: { type: 'send_whatsapp_template' } },
            { id: 'wait_1', type: 'delay', name: 'Wait 6h', config: { duration: 6, unit: 'hours' } },
            { id: 'action_2', type: 'action', name: 'Send Reminder', config: { type: 'send_whatsapp_message' } }
        ]
    },
    {
        name: 'abandoned_cart_1h',
        description: 'Gentle reminder about forgotten cart items',
        category: 'Cart Recovery',
        triggerType: 'cart_abandoned',
        isActive: true,
        allowedPlans: ['starter', 'pro', 'enterprise'],
        nodes: [
            { id: 'trigger', type: 'trigger', name: 'Cart Abandoned', config: { type: 'cart_abandoned' } },
            { id: 'wait_1', type: 'delay', name: 'Wait 1h', config: { duration: 1, unit: 'hours' } },
            { id: 'action_1', type: 'action', name: 'Send Reminder', config: { type: 'send_whatsapp_template' } }
        ]
    },
    {
        name: 'payment_failed',
        description: 'Help customers complete failed payments',
        category: 'Payments',
        triggerType: 'payment_failed',
        isActive: true,
        allowedPlans: ['starter', 'pro', 'enterprise'],
        nodes: [
            { id: 'trigger', type: 'trigger', name: 'Payment Failed', config: { type: 'payment_failed' } },
            { id: 'action_1', type: 'action', name: 'Send Retry Link', config: { type: 'send_whatsapp_template' } }
        ]
    },
    {
        name: 'first_order_welcome',
        description: 'Welcome new customers with personalized message',
        category: 'Customer Lifecycle',
        triggerType: 'first_order',
        isActive: true,
        allowedPlans: ['starter', 'pro', 'enterprise'],
        nodes: [
            { id: 'trigger', type: 'trigger', name: 'First Order', config: { type: 'first_order' } },
            { id: 'action_1', type: 'action', name: 'Send Welcome', config: { type: 'send_whatsapp_template' } },
            { id: 'action_2', type: 'action', name: 'Add Tag', config: { type: 'add_tag', tag: 'New Customer' } }
        ]
    },
    {
        name: 'review_request',
        description: 'Request product review after delivery',
        category: 'Reviews',
        triggerType: 'order_delivered',
        isActive: true,
        allowedPlans: ['pro', 'enterprise'],
        nodes: [
            { id: 'trigger', type: 'trigger', name: 'Order Delivered', config: { type: 'order_delivered' } },
            { id: 'wait_1', type: 'delay', name: 'Wait 3 Days', config: { duration: 3, unit: 'days' } },
            { id: 'action_1', type: 'action', name: 'Request Review', config: { type: 'send_whatsapp_template' } }
        ]
    }
];

export async function seedTemplates(dataSource: DataSource): Promise<void> {
    console.log('🌱 Starting Automation Templates seeding...');

    const templateRepo = dataSource.getRepository(AutomationTemplate);

    for (const data of DEFAULT_AUTOMATION_TEMPLATES) {
        const existing = await templateRepo.findOne({
            where: { name: data.name }
        });

        if (!existing) {
            const template = templateRepo.create(data);
            await templateRepo.save(template);
            console.log(`  ✅ Created template: ${data.name}`);
        } else {
            console.log(`  ⏭️  Template already exists: ${data.name}`);
        }
    }
}
