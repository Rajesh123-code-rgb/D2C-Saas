import { Injectable, Logger } from '@nestjs/common';
import { AutomationsService, CreateAutomationDto } from './automations.service';
import { TriggerType, ActionType } from './automation-rule.entity';

/**
 * Prebuilt automation templates for e-commerce and social media use cases
 */
@Injectable()
export class AutomationTemplatesService {
    private readonly logger = new Logger(AutomationTemplatesService.name);

    constructor(private readonly automationsService: AutomationsService) { }

    /**
     * Get all available templates
     */
    getTemplates(): Array<{
        id: string;
        name: string;
        description: string;
        category: string;
        triggerType: TriggerType;
        preview: string;
    }> {
        return [
            // ==================== ORDERS ====================
            {
                id: 'order_confirmation',
                name: 'Order Confirmation',
                description: 'Send WhatsApp message when a new order is placed',
                category: 'Orders',
                triggerType: TriggerType.ORDER_CREATED,
                preview: 'Order Created → Send WhatsApp Template → Add Tag',
            },
            {
                id: 'cod_confirmation',
                name: 'COD Order Confirmation',
                description: 'Request confirmation for Cash on Delivery orders with follow-up',
                category: 'Orders',
                triggerType: TriggerType.COD_ORDER_CREATED,
                preview: 'COD Order → Send Confirmation → Wait 6h → Remind if not confirmed',
            },
            {
                id: 'shipping_update',
                name: 'Shipping Update',
                description: 'Notify customers with tracking info when their order ships',
                category: 'Orders',
                triggerType: TriggerType.ORDER_SHIPPED,
                preview: 'Order Shipped → Send Tracking Info → Add Tag',
            },
            {
                id: 'delivery_confirmation',
                name: 'Delivery Confirmation',
                description: 'Confirm delivery and request feedback after 24 hours',
                category: 'Orders',
                triggerType: TriggerType.ORDER_DELIVERED,
                preview: 'Order Delivered → Confirm → Wait 24h → Request Review',
            },
            {
                id: 'order_cancellation',
                name: 'Order Cancellation',
                description: 'Notify customer when order is cancelled and offer support',
                category: 'Orders',
                triggerType: TriggerType.ORDER_CANCELLED,
                preview: 'Order Cancelled → Send Notification → Offer Support',
            },

            // ==================== CART RECOVERY ====================
            {
                id: 'abandoned_cart_1h',
                name: 'Abandoned Cart (1 Hour)',
                description: 'Gentle reminder about forgotten cart items after 1 hour',
                category: 'Cart Recovery',
                triggerType: TriggerType.CART_ABANDONED,
                preview: 'Cart Abandoned → Wait 1h → Send Reminder',
            },
            {
                id: 'abandoned_cart_24h',
                name: 'Abandoned Cart (24 Hours)',
                description: 'Follow up with exclusive discount after 24 hours',
                category: 'Cart Recovery',
                triggerType: TriggerType.CART_ABANDONED,
                preview: 'Cart Abandoned → Wait 24h → Send 10% Discount',
            },
            {
                id: 'abandoned_cart_3d',
                name: 'Abandoned Cart (3 Days)',
                description: 'Last chance reminder with bigger discount after 3 days',
                category: 'Cart Recovery',
                triggerType: TriggerType.CART_ABANDONED,
                preview: 'Cart Abandoned → Wait 3d → Send 15% Discount + Free Shipping',
            },

            // ==================== PAYMENTS ====================
            {
                id: 'payment_failed',
                name: 'Payment Failed Retry',
                description: 'Help customers complete failed payments with retry links',
                category: 'Payments',
                triggerType: TriggerType.PAYMENT_FAILED,
                preview: 'Payment Failed → Send Retry Link → Wait 2h → Remind',
            },
            {
                id: 'payment_success',
                name: 'Payment Confirmation',
                description: 'Confirm successful payment with receipt details',
                category: 'Payments',
                triggerType: TriggerType.PAYMENT_SUCCESS,
                preview: 'Payment Success → Send Confirmation → Add Tag',
            },
            {
                id: 'refund_processed',
                name: 'Refund Notification',
                description: 'Notify customers when refund is processed',
                category: 'Payments',
                triggerType: TriggerType.REFUND_PROCESSED,
                preview: 'Refund Processed → Send Notification → Survey Link',
            },

            // ==================== CUSTOMER LIFECYCLE ====================
            {
                id: 'first_order_welcome',
                name: 'First Order Welcome',
                description: 'Welcome new customers with personalized message and benefits',
                category: 'Customer Lifecycle',
                triggerType: TriggerType.FIRST_ORDER,
                preview: 'First Order → Welcome Message → Add Tag → Update Lifecycle',
            },
            {
                id: 'repeat_customer_reward',
                name: 'Repeat Customer Reward',
                description: 'Thank repeat customers with exclusive loyalty offers',
                category: 'Customer Lifecycle',
                triggerType: TriggerType.REPEAT_ORDER,
                preview: 'Repeat Order → Thank You → Loyalty Discount → Update Tag',
            },
            {
                id: 'high_value_vip',
                name: 'High Value Order VIP',
                description: 'VIP treatment for high value orders with priority support',
                category: 'Customer Lifecycle',
                triggerType: TriggerType.HIGH_VALUE_ORDER,
                preview: 'High Value Order → Add VIP Tag → Notify Team → Assign Senior Agent',
            },
            {
                id: 'birthday_greeting',
                name: 'Birthday Greeting',
                description: 'Send personalized birthday wishes with special discount',
                category: 'Customer Lifecycle',
                triggerType: TriggerType.CONTACT_BIRTHDAY,
                preview: 'Birthday → Send Greeting → 20% Birthday Discount',
            },
            {
                id: 'win_back_30d',
                name: 'Win-Back (30 Days Inactive)',
                description: 'Re-engage customers who haven\'t purchased in 30 days',
                category: 'Customer Lifecycle',
                triggerType: TriggerType.CUSTOMER_INACTIVE,
                preview: 'Inactive 30d → We Miss You → Special Comeback Offer',
            },
            {
                id: 'win_back_90d',
                name: 'Win-Back (90 Days Inactive)',
                description: 'Last attempt to re-engage long-inactive customers',
                category: 'Customer Lifecycle',
                triggerType: TriggerType.CUSTOMER_INACTIVE,
                preview: 'Inactive 90d → Exclusive Return Offer → 25% Discount',
            },

            // ==================== INSTAGRAM ====================
            {
                id: 'insta_comment_auto_reply',
                name: 'Instagram Comment Auto-Reply',
                description: 'Automatically reply to comments on your Instagram posts',
                category: 'Instagram',
                triggerType: TriggerType.INSTAGRAM_COMMENT,
                preview: 'Comment Received → Send Auto DM → Add to Contacts',
            },
            {
                id: 'insta_dm_welcome',
                name: 'Instagram DM Welcome',
                description: 'Auto-respond to new Instagram DMs with welcome message',
                category: 'Instagram',
                triggerType: TriggerType.INSTAGRAM_DM,
                preview: 'New DM → Welcome Message → Quick Replies Menu',
            },
            {
                id: 'insta_story_mention',
                name: 'Instagram Story Mention',
                description: 'Thank users who mention you in their stories',
                category: 'Instagram',
                triggerType: TriggerType.INSTAGRAM_STORY_MENTION,
                preview: 'Story Mention → Thank You DM → Special Discount',
            },
            {
                id: 'insta_story_reply',
                name: 'Instagram Story Reply',
                description: 'Auto-respond to story replies with contextual messages',
                category: 'Instagram',
                triggerType: TriggerType.INSTAGRAM_STORY_REPLY,
                preview: 'Story Reply → Personalized Response → CTA',
            },
            {
                id: 'insta_lead_magnet',
                name: 'Instagram Lead Magnet',
                description: 'Send lead magnet when user comments specific keyword',
                category: 'Instagram',
                triggerType: TriggerType.INSTAGRAM_COMMENT,
                preview: 'Keyword Comment → DM Lead Magnet → Add to List',
            },
            {
                id: 'insta_giveaway',
                name: 'Instagram Giveaway Entry',
                description: 'Auto-confirm giveaway entries from comments',
                category: 'Instagram',
                triggerType: TriggerType.INSTAGRAM_COMMENT,
                preview: 'Giveaway Comment → Entry Confirmation DM → Add to Giveaway List',
            },

            // ==================== ENGAGEMENT ====================
            {
                id: 'new_contact_welcome',
                name: 'New Contact Welcome',
                description: 'Welcome new contacts with introductory message',
                category: 'Engagement',
                triggerType: TriggerType.CONTACT_CREATED,
                preview: 'Contact Created → Welcome Message → Set Lifecycle',
            },
            {
                id: 'keyword_trigger',
                name: 'Keyword Auto-Response',
                description: 'Respond automatically to specific keywords in messages',
                category: 'Engagement',
                triggerType: TriggerType.KEYWORD_MATCH,
                preview: 'Keyword Match → Send Response → Log Interaction',
            },
            {
                id: 'feedback_collection',
                name: 'Feedback Collection',
                description: 'Collect customer feedback after interaction ends',
                category: 'Engagement',
                triggerType: TriggerType.CONVERSATION_CLOSED,
                preview: 'Conversation Closed → Wait 1h → Send Feedback Survey',
            },
            {
                id: 'product_inquiry',
                name: 'Product Inquiry Response',
                description: 'Auto-respond to product inquiries with catalog',
                category: 'Engagement',
                triggerType: TriggerType.KEYWORD_MATCH,
                preview: 'Product Keyword → Send Catalog → Offer Assistance',
            },

            // ==================== SUPPORT ====================
            {
                id: 'support_auto_assign',
                name: 'Support Auto-Assignment',
                description: 'Auto-assign support queries to available agents',
                category: 'Support',
                triggerType: TriggerType.TAG_ADDED,
                preview: 'Support Tag Added → Assign to Agent → Notify Team',
            },
            {
                id: 'urgent_escalation',
                name: 'Urgent Issue Escalation',
                description: 'Escalate urgent issues to senior support team',
                category: 'Support',
                triggerType: TriggerType.TAG_ADDED,
                preview: 'Urgent Tag → Assign Senior Agent → Alert Management',
            },
            {
                id: 'after_hours_response',
                name: 'After Hours Response',
                description: 'Auto-respond to messages received outside business hours',
                category: 'Support',
                triggerType: TriggerType.MESSAGE_RECEIVED,
                preview: 'After Hours Message → Auto Response → Queue for Morning',
            },
            {
                id: 'sla_reminder',
                name: 'SLA Breach Reminder',
                description: 'Alert team when response SLA is about to breach',
                category: 'Support',
                triggerType: TriggerType.SLA_WARNING,
                preview: 'SLA Warning → Alert Agent → Escalate if Needed',
            },

            // ==================== REVIEWS & REFERRALS ====================
            {
                id: 'review_request',
                name: 'Review Request',
                description: 'Request product review after delivery confirmation',
                category: 'Reviews',
                triggerType: TriggerType.ORDER_DELIVERED,
                preview: 'Delivered + 3d → Request Review → Offer Discount for Review',
            },
            {
                id: 'positive_review_thanks',
                name: 'Positive Review Thank You',
                description: 'Thank customers for positive reviews with reward',
                category: 'Reviews',
                triggerType: TriggerType.POSITIVE_REVIEW,
                preview: 'Positive Review → Thank You → Referral Code',
            },
            {
                id: 'negative_review_recovery',
                name: 'Negative Review Recovery',
                description: 'Reach out to resolve issues from negative reviews',
                category: 'Reviews',
                triggerType: TriggerType.NEGATIVE_REVIEW,
                preview: 'Negative Review → Apology → Assign Support → Resolution Offer',
            },
            {
                id: 'referral_program',
                name: 'Referral Program',
                description: 'Invite loyal customers to refer friends for rewards',
                category: 'Reviews',
                triggerType: TriggerType.REPEAT_ORDER,
                preview: 'Order #3+ → Send Referral Invite → Unique Code',
            },
        ];
    }

    /**
     * Install a template for a tenant
     */
    async installTemplate(tenantId: string, templateId: string): Promise<any> {
        const templateConfig = this.getTemplateConfig(templateId);

        if (!templateConfig) {
            throw new Error(`Template not found: ${templateId}`);
        }

        const automation = await this.automationsService.create(tenantId, templateConfig);
        this.logger.log(`Template installed: ${templateId} for tenant ${tenantId}`);

        return automation;
    }

    /**
     * Get a specific template by ID with full configuration
     */
    getTemplateById(templateId: string): any | null {
        const templates = this.getTemplates();
        const templateInfo = templates.find(t => t.id === templateId);

        if (!templateInfo) {
            return null;
        }

        const templateConfig = this.getTemplateConfig(templateId);

        return {
            ...templateInfo,
            ...templateConfig,
        };
    }

    /**
     * Get the full configuration for a template
     */
    private getTemplateConfig(templateId: string): CreateAutomationDto | null {
        const templates: Record<string, CreateAutomationDto> = {
            // ==================== ORDERS ====================
            order_confirmation: {
                name: 'Order Confirmation',
                description: 'Automatically send order confirmation via WhatsApp',
                triggerType: TriggerType.ORDER_CREATED,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'order_confirmation',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'order_confirmed',
                    },
                ],
            },

            cod_confirmation: {
                name: 'COD Order Confirmation',
                description: 'Request and track COD order confirmations',
                triggerType: TriggerType.COD_ORDER_CREATED,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'cod_confirmation_request',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'cod_pending_confirmation',
                    },
                    {
                        type: ActionType.WAIT,
                        waitDuration: 6,
                        waitUnit: 'hours',
                    },
                    {
                        type: ActionType.CONDITION,
                        conditions: [
                            { field: 'codConfirmed', operator: 'equals' as any, value: false },
                        ],
                        thenActions: [
                            {
                                type: ActionType.SEND_WHATSAPP_TEMPLATE,
                                templateId: 'cod_confirmation_reminder',
                                channel: 'whatsapp',
                            },
                        ],
                        elseActions: [],
                    },
                ],
            },

            shipping_update: {
                name: 'Shipping Update',
                description: 'Notify customers when orders are shipped',
                triggerType: TriggerType.ORDER_SHIPPED,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'order_shipped',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'shipping_notified',
                    },
                ],
            },

            delivery_confirmation: {
                name: 'Delivery Confirmation',
                description: 'Confirm delivery and request feedback',
                triggerType: TriggerType.ORDER_DELIVERED,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'order_delivered',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.WAIT,
                        waitDuration: 24,
                        waitUnit: 'hours',
                    },
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'feedback_request',
                        channel: 'whatsapp',
                    },
                ],
            },

            order_cancellation: {
                name: 'Order Cancellation',
                description: 'Notify customer when order is cancelled',
                triggerType: TriggerType.ORDER_CANCELLED,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'order_cancelled',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'order_cancelled',
                    },
                    {
                        type: ActionType.SEND_WHATSAPP_MESSAGE,
                        message: 'We\'re sorry to see your order cancelled. Is there anything we can help with? Reply to this message to connect with our team.',
                    },
                ],
            },

            // ==================== CART RECOVERY ====================
            abandoned_cart_1h: {
                name: 'Abandoned Cart (1 Hour)',
                description: 'First reminder after 1 hour',
                triggerType: TriggerType.CART_ABANDONED,
                triggerConfig: {},
                delayConfig: {
                    type: 'delay',
                    delaySeconds: 3600, // 1 hour
                },
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'abandoned_cart_reminder',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'cart_reminder_1h',
                    },
                ],
            },

            abandoned_cart_24h: {
                name: 'Abandoned Cart (24 Hours)',
                description: 'Follow up with discount after 24 hours',
                triggerType: TriggerType.CART_ABANDONED,
                triggerConfig: {},
                delayConfig: {
                    type: 'delay',
                    delaySeconds: 86400, // 24 hours
                },
                conditions: [
                    { field: 'recoveryStatus', operator: 'not_equals' as any, value: 'recovered' },
                ],
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'abandoned_cart_discount_10',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'cart_reminder_24h',
                    },
                ],
            },

            abandoned_cart_3d: {
                name: 'Abandoned Cart (3 Days)',
                description: 'Last chance with bigger discount',
                triggerType: TriggerType.CART_ABANDONED,
                triggerConfig: {},
                delayConfig: {
                    type: 'delay',
                    delaySeconds: 259200, // 3 days
                },
                conditions: [
                    { field: 'recoveryStatus', operator: 'not_equals' as any, value: 'recovered' },
                ],
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'abandoned_cart_last_chance',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'cart_reminder_final',
                    },
                ],
            },

            // ==================== PAYMENTS ====================
            payment_failed: {
                name: 'Payment Failed Retry',
                description: 'Help customers complete failed payments',
                triggerType: TriggerType.PAYMENT_FAILED,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'payment_failed',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.WAIT,
                        waitDuration: 2,
                        waitUnit: 'hours',
                    },
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'payment_retry_reminder',
                        channel: 'whatsapp',
                    },
                ],
            },

            payment_success: {
                name: 'Payment Confirmation',
                description: 'Confirm successful payment',
                triggerType: TriggerType.PAYMENT_SUCCESS,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'payment_success',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'payment_completed',
                    },
                ],
            },

            refund_processed: {
                name: 'Refund Notification',
                description: 'Notify about refund processing',
                triggerType: TriggerType.REFUND_PROCESSED,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'refund_processed',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.SEND_WHATSAPP_MESSAGE,
                        message: 'Your refund has been processed. We\'d love to hear your feedback: [Survey Link]',
                    },
                ],
            },

            // ==================== CUSTOMER LIFECYCLE ====================
            first_order_welcome: {
                name: 'First Order Welcome',
                description: 'Welcome new customers',
                triggerType: TriggerType.FIRST_ORDER,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'welcome_first_order',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'new_customer',
                    },
                    {
                        type: ActionType.UPDATE_LIFECYCLE,
                        newLifecycle: 'customer',
                    },
                ],
            },

            repeat_customer_reward: {
                name: 'Repeat Customer Reward',
                description: 'Thank repeat customers',
                triggerType: TriggerType.REPEAT_ORDER,
                triggerConfig: {},
                conditions: [
                    { field: 'orderCount', operator: 'greater_than' as any, value: 2 },
                ],
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'repeat_customer_thanks',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'loyal_customer',
                    },
                    {
                        type: ActionType.UPDATE_LIFECYCLE,
                        newLifecycle: 'repeat_customer',
                    },
                ],
            },

            high_value_vip: {
                name: 'High Value Order VIP',
                description: 'VIP treatment for high value orders',
                triggerType: TriggerType.HIGH_VALUE_ORDER,
                triggerConfig: {
                    minOrderValue: 5000,
                },
                actions: [
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'vip_customer',
                    },
                    {
                        type: ActionType.NOTIFY_TEAM,
                        message: 'High value order received! VIP customer needs priority support.',
                    },
                    {
                        type: ActionType.ASSIGN_TO_AGENT,
                        assignmentStrategy: 'round_robin',
                        teamId: 'senior_agents',
                    },
                ],
            },

            birthday_greeting: {
                name: 'Birthday Greeting',
                description: 'Send birthday wishes with discount',
                triggerType: TriggerType.CONTACT_BIRTHDAY,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'birthday_greeting',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'birthday_offer_sent',
                    },
                ],
            },

            win_back_30d: {
                name: 'Win-Back (30 Days)',
                description: 'Re-engage inactive customers',
                triggerType: TriggerType.CUSTOMER_INACTIVE,
                triggerConfig: {
                    inactiveDays: 30,
                },
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'we_miss_you',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'win_back_30d',
                    },
                ],
            },

            win_back_90d: {
                name: 'Win-Back (90 Days)',
                description: 'Last attempt for long-inactive customers',
                triggerType: TriggerType.CUSTOMER_INACTIVE,
                triggerConfig: {
                    inactiveDays: 90,
                },
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'final_comeback_offer',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'win_back_90d',
                    },
                ],
            },

            // ==================== INSTAGRAM ====================
            insta_comment_auto_reply: {
                name: 'Instagram Comment Auto-Reply',
                description: 'Auto-reply to Instagram comments with DM',
                triggerType: TriggerType.INSTAGRAM_COMMENT,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_INSTAGRAM_DM,
                        message: 'Hey! 👋 Thanks for your comment! We\'ve sent you more details in this DM. Let us know if you have any questions!',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'instagram_engaged',
                    },
                    {
                        type: ActionType.UPDATE_CONTACT,
                        field: 'source',
                        value: 'instagram_comment',
                    },
                ],
            },

            insta_dm_welcome: {
                name: 'Instagram DM Welcome',
                description: 'Welcome new DM conversations',
                triggerType: TriggerType.INSTAGRAM_DM,
                triggerConfig: {
                    isFirstMessage: true,
                },
                actions: [
                    {
                        type: ActionType.SEND_INSTAGRAM_DM,
                        message: 'Hi there! 👋 Welcome to our Instagram. How can we help you today?\n\n📦 Track Order\n🛍️ Browse Products\n💬 Talk to Support\n\nJust reply with what you need!',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'instagram_dm',
                    },
                ],
            },

            insta_story_mention: {
                name: 'Instagram Story Mention',
                description: 'Thank users for story mentions',
                triggerType: TriggerType.INSTAGRAM_STORY_MENTION,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_INSTAGRAM_DM,
                        message: 'OMG! 😍 Thank you so much for sharing us in your story! We really appreciate the love! ❤️\n\nHere\'s a special 15% off code just for you: STORYFRIEND15',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'story_ambassador',
                    },
                ],
            },

            insta_story_reply: {
                name: 'Instagram Story Reply',
                description: 'Respond to story replies',
                triggerType: TriggerType.INSTAGRAM_STORY_REPLY,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_INSTAGRAM_DM,
                        message: 'Thanks for replying to our story! 🙌 We love hearing from you. Is there anything specific you\'d like to know more about?',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'story_engaged',
                    },
                ],
            },

            insta_lead_magnet: {
                name: 'Instagram Lead Magnet',
                description: 'Send lead magnet on keyword comment',
                triggerType: TriggerType.INSTAGRAM_COMMENT,
                triggerConfig: {
                    keywords: ['GUIDE', 'DOWNLOAD', 'FREE', 'LINK'],
                },
                actions: [
                    {
                        type: ActionType.SEND_INSTAGRAM_DM,
                        message: 'Here\'s your FREE guide as promised! 📚\n\n👉 [Download Link]\n\nLet us know if you have any questions!',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'lead_magnet_sent',
                    },
                    {
                        type: ActionType.UPDATE_LIFECYCLE,
                        newLifecycle: 'lead',
                    },
                ],
            },

            insta_giveaway: {
                name: 'Instagram Giveaway Entry',
                description: 'Confirm giveaway entries',
                triggerType: TriggerType.INSTAGRAM_COMMENT,
                triggerConfig: {
                    keywords: ['GIVEAWAY', 'ENTER', 'WIN'],
                },
                actions: [
                    {
                        type: ActionType.SEND_INSTAGRAM_DM,
                        message: '🎉 You\'re IN! Your giveaway entry is confirmed!\n\nGood luck! Winners will be announced on [Date].\n\nWant extra entries? Share this post to your story!',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'giveaway_participant',
                    },
                ],
            },

            // ==================== ENGAGEMENT ====================
            new_contact_welcome: {
                name: 'New Contact Welcome',
                description: 'Welcome new contacts',
                triggerType: TriggerType.CONTACT_CREATED,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'welcome_new_contact',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.UPDATE_LIFECYCLE,
                        newLifecycle: 'subscriber',
                    },
                ],
            },

            keyword_trigger: {
                name: 'Keyword Auto-Response',
                description: 'Respond to specific keywords',
                triggerType: TriggerType.KEYWORD_MATCH,
                triggerConfig: {
                    keywords: ['HELP', 'SUPPORT', 'HOURS', 'INFO'],
                },
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_MESSAGE,
                        message: 'Thanks for reaching out! Here\'s what you need to know:\n\n⏰ Hours: Mon-Fri 9AM-6PM\n📞 Support: 1800-XXX-XXXX\n📧 Email: support@example.com\n\nReply MENU for more options.',
                    },
                ],
            },

            feedback_collection: {
                name: 'Feedback Collection',
                description: 'Collect feedback after conversations',
                triggerType: TriggerType.CONVERSATION_CLOSED,
                triggerConfig: {},
                delayConfig: {
                    type: 'delay',
                    delaySeconds: 3600,
                },
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'feedback_survey',
                        channel: 'whatsapp',
                    },
                ],
            },

            product_inquiry: {
                name: 'Product Inquiry Response',
                description: 'Auto-respond to product inquiries',
                triggerType: TriggerType.KEYWORD_MATCH,
                triggerConfig: {
                    keywords: ['PRICE', 'PRODUCT', 'CATALOG', 'BUY', 'SHOP'],
                },
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'product_catalog',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'product_interest',
                    },
                ],
            },

            // ==================== SUPPORT ====================
            support_auto_assign: {
                name: 'Support Auto-Assignment',
                description: 'Auto-assign support queries',
                triggerType: TriggerType.TAG_ADDED,
                triggerConfig: {
                    tagName: 'needs_support',
                },
                actions: [
                    {
                        type: ActionType.ASSIGN_TO_AGENT,
                        assignmentStrategy: 'least_busy',
                        teamId: 'support_team',
                    },
                    {
                        type: ActionType.NOTIFY_TEAM,
                        message: 'New support ticket assigned.',
                    },
                ],
            },

            urgent_escalation: {
                name: 'Urgent Issue Escalation',
                description: 'Escalate urgent issues',
                triggerType: TriggerType.TAG_ADDED,
                triggerConfig: {
                    tagName: 'urgent',
                },
                actions: [
                    {
                        type: ActionType.ASSIGN_TO_AGENT,
                        assignmentStrategy: 'round_robin',
                        teamId: 'senior_support',
                    },
                    {
                        type: ActionType.NOTIFY_TEAM,
                        message: '🚨 URGENT: Issue escalated to senior support!',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'escalated',
                    },
                ],
            },

            after_hours_response: {
                name: 'After Hours Response',
                description: 'Auto-respond outside business hours',
                triggerType: TriggerType.MESSAGE_RECEIVED,
                triggerConfig: {
                    afterHours: true,
                },
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_MESSAGE,
                        message: 'Thanks for your message! 🌙 Our team is currently offline.\n\nBusiness Hours: Mon-Fri 9AM-6PM\n\nWe\'ll get back to you first thing in the morning!',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'after_hours_queue',
                    },
                ],
            },

            sla_reminder: {
                name: 'SLA Breach Reminder',
                description: 'Alert team about SLA breaches',
                triggerType: TriggerType.SLA_WARNING,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.NOTIFY_TEAM,
                        message: '⚠️ SLA Warning: Response time about to breach for this conversation!',
                    },
                ],
            },

            // ==================== REVIEWS & REFERRALS ====================
            review_request: {
                name: 'Review Request',
                description: 'Request review after delivery',
                triggerType: TriggerType.ORDER_DELIVERED,
                triggerConfig: {},
                delayConfig: {
                    type: 'delay',
                    delaySeconds: 259200, // 3 days
                },
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'review_request',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'review_requested',
                    },
                ],
            },

            positive_review_thanks: {
                name: 'Positive Review Thank You',
                description: 'Thank for positive reviews',
                triggerType: TriggerType.POSITIVE_REVIEW,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'review_thank_you',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'positive_reviewer',
                    },
                ],
            },

            negative_review_recovery: {
                name: 'Negative Review Recovery',
                description: 'Handle negative reviews',
                triggerType: TriggerType.NEGATIVE_REVIEW,
                triggerConfig: {},
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_MESSAGE,
                        message: 'We\'re really sorry about your experience. We\'d love to make it right. Our support team will reach out shortly.',
                    },
                    {
                        type: ActionType.ASSIGN_TO_AGENT,
                        assignmentStrategy: 'round_robin',
                        teamId: 'senior_support',
                    },
                    {
                        type: ActionType.NOTIFY_TEAM,
                        message: '⚠️ Negative review received - needs immediate attention!',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'negative_review_recovery',
                    },
                ],
            },

            referral_program: {
                name: 'Referral Program',
                description: 'Invite customers to referral program',
                triggerType: TriggerType.REPEAT_ORDER,
                triggerConfig: {
                    minOrders: 3,
                },
                actions: [
                    {
                        type: ActionType.SEND_WHATSAPP_TEMPLATE,
                        templateId: 'referral_invite',
                        channel: 'whatsapp',
                    },
                    {
                        type: ActionType.ADD_TAG,
                        tagName: 'referral_invited',
                    },
                ],
            },
        };

        return templates[templateId] || null;
    }
}
