import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
    AIAgent,
    AITask,
    AITaskStatus,
    AIAgentType,
    AIPrediction,
} from '../entities/ai.entity';
import { Contact } from '../../contacts/contact.entity';

export interface MessageGenerationInput {
    context: 'order_confirmation' | 'shipping_update' | 'abandoned_cart' | 'win_back' | 'promotional' | 'support';
    contactName: string;
    orderValue?: number;
    productNames?: string[];
    trackingUrl?: string;
    discountCode?: string;
    customData?: Record<string, any>;
}

export interface GeneratedMessage {
    message: string;
    subject?: string;
    confidence: number;
    alternatives: string[];
}

@Injectable()
export class MessageGeneratorService {
    private readonly logger = new Logger(MessageGeneratorService.name);

    constructor(
        @InjectRepository(AITask)
        private readonly taskRepository: Repository<AITask>,
        @InjectRepository(AIAgent)
        private readonly agentRepository: Repository<AIAgent>,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Generate personalized message using AI
     */
    async generateMessage(
        tenantId: string,
        agentId: string,
        input: MessageGenerationInput,
    ): Promise<GeneratedMessage> {
        const startTime = Date.now();

        // Get agent config
        const agent = await this.agentRepository.findOne({
            where: { id: agentId, tenantId },
        });

        if (!agent || !agent.isActive) {
            throw new Error('AI Agent not found or inactive');
        }

        // Create task record
        const task = await this.taskRepository.save({
            tenantId,
            agentId,
            status: AITaskStatus.PROCESSING,
            input,
            requiresApproval: agent.config?.requiresApproval || false,
        });

        try {
            // Generate message using templates with personalization
            // In production, this would call OpenAI/Claude API
            const generated = await this.generateWithTemplates(input, agent.config);

            // Update task with result
            await this.taskRepository.update(task.id, {
                status: agent.config?.requiresApproval
                    ? AITaskStatus.REQUIRES_APPROVAL
                    : AITaskStatus.COMPLETED,
                output: {
                    result: generated.message,
                    confidence: generated.confidence,
                    alternatives: generated.alternatives,
                } as any,
                processingTimeMs: Date.now() - startTime,
            });

            // Update agent stats
            await this.agentRepository.increment({ id: agentId }, 'totalRuns', 1);
            await this.agentRepository.increment({ id: agentId }, 'successfulRuns', 1);

            return generated;
        } catch (error: any) {
            await this.taskRepository.update(task.id, {
                status: AITaskStatus.FAILED,
                errorMessage: error.message,
                processingTimeMs: Date.now() - startTime,
            });

            await this.agentRepository.increment({ id: agentId }, 'totalRuns', 1);
            throw error;
        }
    }

    /**
     * Template-based message generation with personalization
     */
    private async generateWithTemplates(
        input: MessageGenerationInput,
        config: any,
    ): Promise<GeneratedMessage> {
        const templates = this.getContextTemplates(input.context, config?.tone || 'friendly');

        // Select best template and personalize
        const template = templates[0];
        const personalized = this.personalizeTemplate(template, input);

        // Generate alternatives
        const alternatives = templates.slice(1, 4).map(t =>
            this.personalizeTemplate(t, input)
        );

        return {
            message: personalized,
            confidence: 0.85,
            alternatives,
        };
    }

    private getContextTemplates(context: string, tone: string): string[] {
        const templates: Record<string, Record<string, string[]>> = {
            order_confirmation: {
                friendly: [
                    'Hi {{name}}! 🎉 Your order is confirmed! We\'re preparing {{products}} for you. Total: ₹{{orderValue}}. Track here: {{trackingUrl}}',
                    'Hey {{name}}! Great news - your order for {{products}} is confirmed! Amount: ₹{{orderValue}}. We\'ll update you when it ships! 📦',
                    '{{name}}, thank you for your order! 🙌 {{products}} | Total: ₹{{orderValue}}. Excited to deliver to you soon!',
                ],
                professional: [
                    'Dear {{name}}, Your order has been confirmed. Order Details: {{products}} | Amount: ₹{{orderValue}}. You will receive tracking information shortly.',
                    'Hello {{name}}, Thank you for your order. We have received your purchase of {{products}} totaling ₹{{orderValue}}. Tracking details will follow.',
                ],
            },
            abandoned_cart: {
                friendly: [
                    'Hey {{name}}! 👋 You left some items in your cart - {{products}}. Complete your order now and get free shipping!',
                    '{{name}}, your cart misses you! 🛒 {{products}} are waiting. Here\'s {{discountCode}} for 10% off!',
                    'Forgot something, {{name}}? Your {{products}} are still available! Complete checkout before they\'re gone 🏃',
                ],
                professional: [
                    'Dear {{name}}, You have items pending in your cart: {{products}}. Complete your purchase at your convenience.',
                    'Hello {{name}}, Your cart contains {{products}}. Use code {{discountCode}} to complete your order with a special discount.',
                ],
            },
            shipping_update: {
                friendly: [
                    'Great news, {{name}}! 🚚 Your order is on its way! Track it here: {{trackingUrl}}',
                    '{{name}}, your package just shipped! 📦 Expected delivery in 2-3 days. Track: {{trackingUrl}}',
                    'Your order is moving, {{name}}! 🏃 Track your package: {{trackingUrl}}',
                ],
                professional: [
                    'Dear {{name}}, Your order has been shipped. Track your delivery at: {{trackingUrl}}',
                    'Hello {{name}}, Shipment update: Your order is in transit. Tracking link: {{trackingUrl}}',
                ],
            },
            win_back: {
                friendly: [
                    'Hey {{name}}, we miss you! 💝 It\'s been a while since your last visit. Here\'s {{discountCode}} for 15% off your next order!',
                    '{{name}}! Long time no see! 👋 We have new arrivals we think you\'ll love. Use {{discountCode}} for a special welcome back offer!',
                    'Missing you, {{name}}! 🌟 Come back and discover what\'s new. Apply {{discountCode}} for exclusive savings!',
                ],
                professional: [
                    'Dear {{name}}, We value your past business. As a returning customer, please enjoy {{discountCode}} on your next purchase.',
                    'Hello {{name}}, It has been some time since your last order. We would like to offer you {{discountCode}} as a special incentive.',
                ],
            },
            promotional: {
                friendly: [
                    '🎊 {{name}}, exclusive deal just for you! Get up to 30% off on {{products}}. Limited time only!',
                    'Flash Sale Alert, {{name}}! ⚡ {{products}} at amazing prices. Shop now before it ends!',
                    '{{name}}, you don\'t want to miss this! 🔥 Special prices on {{products}}. Use {{discountCode}}!',
                ],
                professional: [
                    'Dear {{name}}, We are pleased to offer you a special promotion on {{products}}. Use code {{discountCode}} to redeem.',
                    'Hello {{name}}, Exclusive offer: {{products}} now available at reduced prices. Apply {{discountCode}} at checkout.',
                ],
            },
            support: {
                friendly: [
                    'Hi {{name}}! 👋 Thanks for reaching out. We\'re here to help! What can we assist you with today?',
                    'Hey {{name}}, got your message! A support agent will be with you shortly. Average response time: 5 minutes ⏱️',
                ],
                professional: [
                    'Dear {{name}}, Thank you for contacting support. Your query has been received and our team will respond shortly.',
                    'Hello {{name}}, We have received your inquiry. A support representative will assist you within 24 hours.',
                ],
            },
        };

        return templates[context]?.[tone] || templates[context]?.['friendly'] || ['Hello {{name}}, thank you for being a valued customer.'];
    }

    private personalizeTemplate(template: string, input: MessageGenerationInput): string {
        let message = template;

        message = message.replace(/\{\{name\}\}/g, input.contactName || 'there');
        message = message.replace(/\{\{products\}\}/g, input.productNames?.join(', ') || 'your items');
        message = message.replace(/\{\{orderValue\}\}/g, input.orderValue?.toLocaleString() || '');
        message = message.replace(/\{\{trackingUrl\}\}/g, input.trackingUrl || '');
        message = message.replace(/\{\{discountCode\}\}/g, input.discountCode || 'SAVE10');

        // Custom data substitution
        if (input.customData) {
            Object.entries(input.customData).forEach(([key, value]) => {
                message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
            });
        }

        return message;
    }

    /**
     * Generate A/B test variants
     */
    async generateABVariants(
        tenantId: string,
        baseMessage: string,
        numVariants: number = 3,
    ): Promise<string[]> {
        // Simple variant generation - in production, use AI
        const variants: string[] = [baseMessage];

        // Add emoji variant
        if (!baseMessage.includes('!')) {
            variants.push(baseMessage.replace(/\./g, '! 🎉'));
        }

        // Add urgency variant
        variants.push(`⏰ ${baseMessage} Act fast!`);

        // Add personalization variant
        variants.push(`Just for you: ${baseMessage}`);

        return variants.slice(0, numVariants);
    }
}
