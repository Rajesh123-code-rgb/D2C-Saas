import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chatbot, ChatbotFlowNode, ChatbotFlowConnection, ChatbotNodeType, ChatbotStatus, ChatbotTriggerType } from './chatbot.entity';
import { ChatbotSession, ChatbotSessionStatus } from './chatbot-session.entity';

interface MessageContext {
    tenantId: string;
    contactId: string;
    conversationId: string;
    channel: 'whatsapp' | 'instagram' | 'email';
    messageContent: string;
    messageType: 'text' | 'image' | 'audio' | 'video' | 'document';
    senderName?: string;
    metadata?: Record<string, any>;
}

interface ExecutionResult {
    success: boolean;
    response?: {
        type: 'message' | 'buttons' | 'list' | 'media';
        content: string;
        buttons?: Array<{ id: string; text: string }>;
        mediaUrl?: string;
    };
    nextNodeId?: string;
    handoff?: boolean;
    sessionEnded?: boolean;
    variableUpdates?: Record<string, any>;
}

@Injectable()
export class ChatbotRuntimeService {
    private readonly logger = new Logger(ChatbotRuntimeService.name);

    constructor(
        @InjectRepository(Chatbot)
        private chatbotRepository: Repository<Chatbot>,
        @InjectRepository(ChatbotSession)
        private sessionRepository: Repository<ChatbotSession>,
    ) { }

    /**
     * Find a matching chatbot for an incoming message
     */
    async findMatchingChatbot(context: MessageContext): Promise<Chatbot | null> {
        const chatbots = await this.chatbotRepository.find({
            where: {
                tenantId: context.tenantId,
                channel: context.channel,
                status: ChatbotStatus.ACTIVE,
            },
        });

        for (const chatbot of chatbots) {
            if (this.matchesTrigger(chatbot, context)) {
                return chatbot;
            }
        }

        return null;
    }

    /**
     * Check if a message matches a chatbot's trigger configuration
     * Note: Only handles chat/DM triggers. Automation triggers are in Automations module.
     */
    private matchesTrigger(chatbot: Chatbot, context: MessageContext): boolean {
        const triggerConfig = chatbot.triggerConfig;
        if (!triggerConfig) return true; // Default: match any message

        switch (triggerConfig.type) {
            case 'any_message':
                return true;

            case 'keyword':
                const keywords = triggerConfig.keywords || [];
                const lowerMessage = context.messageContent.toLowerCase();
                return keywords.some((kw: string) => lowerMessage.includes(kw.toLowerCase()));

            case 'new_conversation':
                // Check if this is the first message in the conversation
                return context.metadata?.isFirstMessage === true;

            case 'template_reply':
                // WhatsApp template reply
                return context.metadata?.isTemplateReply === true;

            default:
                return true;
        }
    }

    /**
     * Get or create a session for a contact
     */
    async getOrCreateSession(
        chatbot: Chatbot,
        context: MessageContext,
    ): Promise<ChatbotSession> {
        // Look for existing active session
        let session = await this.sessionRepository.findOne({
            where: {
                chatbotId: chatbot.id,
                contactId: context.contactId,
                status: ChatbotSessionStatus.ACTIVE,
            },
        });

        if (session) {
            return session;
        }

        // Find the start node
        const startNode = chatbot.nodes.find(n => n.type === ChatbotNodeType.START);
        if (!startNode) {
            throw new Error('Chatbot has no start node');
        }

        // Create new session
        session = this.sessionRepository.create({
            tenantId: context.tenantId,
            chatbotId: chatbot.id,
            contactId: context.contactId,
            conversationId: context.conversationId,
            status: ChatbotSessionStatus.ACTIVE,
            currentNodeId: startNode.id,
            triggerType: this.determineTriggerType(context),
            variables: {},
            messageHistory: [],
        });

        return this.sessionRepository.save(session);
    }

    /**
     * Determine the trigger type from context
     * Note: Only handles chat/DM triggers. Automation triggers are in Automations module.
     */
    private determineTriggerType(context: MessageContext): ChatbotTriggerType {
        if (context.metadata?.isFirstMessage) {
            return ChatbotTriggerType.NEW_CONVERSATION;
        }
        if (context.metadata?.isTemplateReply) {
            return ChatbotTriggerType.TEMPLATE_REPLY;
        }
        return ChatbotTriggerType.ANY_MESSAGE;
    }

    /**
     * Process a message through the chatbot flow
     */
    async processMessage(
        session: ChatbotSession,
        chatbot: Chatbot,
        context: MessageContext,
    ): Promise<ExecutionResult> {
        const currentNode = chatbot.nodes.find(n => n.id === session.currentNodeId);
        if (!currentNode) {
            this.logger.error(`Node ${session.currentNodeId} not found in chatbot ${chatbot.id}`);
            return { success: false };
        }

        // Add message to history
        session.messageHistory = [
            ...(session.messageHistory || []),
            {
                role: 'user',
                content: context.messageContent,
                timestamp: new Date().toISOString(),
            },
        ];

        // Execute the current node based on type
        const result = await this.executeNode(currentNode, session, chatbot, context);

        // Update session
        if (result.nextNodeId) {
            session.currentNodeId = result.nextNodeId;
        }
        if (result.variableUpdates) {
            session.variables = { ...session.variables, ...result.variableUpdates };
        }
        if (result.response) {
            session.messageHistory = [
                ...session.messageHistory,
                {
                    role: 'bot',
                    content: result.response.content,
                    timestamp: new Date().toISOString(),
                },
            ];
        }

        // Handle session end or handoff
        if (result.sessionEnded) {
            session.status = ChatbotSessionStatus.COMPLETED;
            session.completedAt = new Date();
        } else if (result.handoff) {
            session.status = ChatbotSessionStatus.HANDED_OFF;
            session.handedOffAt = new Date();
        }

        // Save session
        await this.sessionRepository.save(session);

        // Update chatbot stats
        if (result.response) {
            chatbot.messagesCount = (chatbot.messagesCount || 0) + 1;
            await this.chatbotRepository.save(chatbot);
        }

        return result;
    }

    /**
     * Execute a single node in the flow
     */
    private async executeNode(
        node: ChatbotFlowNode,
        session: ChatbotSession,
        chatbot: Chatbot,
        context: MessageContext,
    ): Promise<ExecutionResult> {
        switch (node.type) {
            case ChatbotNodeType.START:
                return this.executeStartNode(node, chatbot, session);

            case ChatbotNodeType.MESSAGE:
                return this.executeMessageNode(node, session, chatbot);

            case ChatbotNodeType.QUESTION:
                return this.executeQuestionNode(node, session, chatbot, context);

            case ChatbotNodeType.CONDITION:
                return this.executeConditionNode(node, session, chatbot, context);

            case ChatbotNodeType.DELAY:
                return this.executeDelayNode(node, chatbot);

            case ChatbotNodeType.ACTION:
                return this.executeActionNode(node, session, chatbot);

            case ChatbotNodeType.ASSIGN_AGENT:
                return this.executeAssignAgentNode(node, session);

            case ChatbotNodeType.END:
                return { success: true, sessionEnded: true };

            default:
                return this.getNextNode(node, chatbot);
        }
    }

    /**
     * Execute start node - move to next node
     */
    private async executeStartNode(
        node: ChatbotFlowNode,
        chatbot: Chatbot,
        session: ChatbotSession,
    ): Promise<ExecutionResult> {
        // Update conversation count on first entry
        chatbot.conversationsCount = (chatbot.conversationsCount || 0) + 1;
        await this.chatbotRepository.save(chatbot);

        return this.getNextNode(node, chatbot);
    }

    /**
     * Execute message node - send a message
     */
    private executeMessageNode(
        node: ChatbotFlowNode,
        session: ChatbotSession,
        chatbot: Chatbot,
    ): ExecutionResult {
        const message = this.interpolateVariables(node.data.message || '', session.variables);
        const buttons = node.data.buttons || [];

        const result: ExecutionResult = {
            success: true,
            response: {
                type: buttons.length > 0 ? 'buttons' : 'message',
                content: message,
                buttons: buttons.map((b: any) => ({ id: b.id, text: b.text })),
            },
        };

        // Get next node
        const nextResult = this.getNextNode(node, chatbot);
        result.nextNodeId = nextResult.nextNodeId;

        return result;
    }

    /**
     * Execute question node - send question and wait for response
     */
    private executeQuestionNode(
        node: ChatbotFlowNode,
        session: ChatbotSession,
        chatbot: Chatbot,
        context: MessageContext,
    ): ExecutionResult {
        // Check if we're waiting for an answer (user's response came in)
        if (session.currentNodeId === node.id && context.messageContent) {
            // Save the response to the variable
            const variableName = node.data.variableName || 'response';
            const variableUpdates = { [variableName]: context.messageContent };

            const nextResult = this.getNextNode(node, chatbot);
            return {
                success: true,
                nextNodeId: nextResult.nextNodeId,
                variableUpdates,
            };
        }

        // First time hitting this node - send the question
        const message = this.interpolateVariables(node.data.message || '', session.variables);
        return {
            success: true,
            response: {
                type: 'message',
                content: message,
            },
            // Stay on this node to wait for response
        };
    }

    /**
     * Execute condition node - evaluate and branch
     */
    private executeConditionNode(
        node: ChatbotFlowNode,
        session: ChatbotSession,
        chatbot: Chatbot,
        context: MessageContext,
    ): ExecutionResult {
        const conditions = node.data.conditions || [];
        const connections = chatbot.connections.filter(c => c.sourceNodeId === node.id);

        for (const condition of conditions) {
            const variableValue = session.variables[condition.variable] || '';
            let matches = false;

            switch (condition.operator) {
                case 'equals':
                    matches = variableValue === condition.value;
                    break;
                case 'contains':
                    matches = variableValue.toString().includes(condition.value);
                    break;
                case 'starts_with':
                    matches = variableValue.toString().startsWith(condition.value);
                    break;
                case 'ends_with':
                    matches = variableValue.toString().endsWith(condition.value);
                    break;
                case 'greater_than':
                    matches = parseFloat(variableValue) > parseFloat(condition.value);
                    break;
                case 'less_than':
                    matches = parseFloat(variableValue) < parseFloat(condition.value);
                    break;
            }

            if (matches) {
                // Find connection with matching handle
                const conn = connections.find(c => c.sourceHandle === condition.id);
                if (conn) {
                    return { success: true, nextNodeId: conn.targetNodeId };
                }
            }
        }

        // Default path (else)
        const defaultConn = connections.find(c => c.sourceHandle === 'else' || !c.sourceHandle);
        return {
            success: true,
            nextNodeId: defaultConn?.targetNodeId,
        };
    }

    /**
     * Execute delay node
     */
    private executeDelayNode(node: ChatbotFlowNode, chatbot: Chatbot): ExecutionResult {
        // In a real implementation, this would schedule the next execution
        // For now, we just proceed to the next node
        return this.getNextNode(node, chatbot);
    }

    /**
     * Execute action node - add tags, update fields, etc.
     */
    private executeActionNode(
        node: ChatbotFlowNode,
        session: ChatbotSession,
        chatbot: Chatbot,
    ): ExecutionResult {
        const actionType = node.data.actionType;

        // Actions would be executed here (add tag, update contact, etc.)
        // This would integrate with the contacts service
        this.logger.log(`Executing action: ${actionType} for session ${session.id}`);

        return this.getNextNode(node, chatbot);
    }

    /**
     * Execute assign agent node - hand off to human
     */
    private executeAssignAgentNode(
        node: ChatbotFlowNode,
        session: ChatbotSession,
    ): ExecutionResult {
        return {
            success: true,
            handoff: true,
            response: {
                type: 'message',
                content: node.data.handoffMessage || 'Connecting you with an agent...',
            },
        };
    }

    /**
     * Get the next node in the flow
     */
    private getNextNode(node: ChatbotFlowNode, chatbot: Chatbot): ExecutionResult {
        const connection = chatbot.connections.find(c => c.sourceNodeId === node.id);
        return {
            success: true,
            nextNodeId: connection?.targetNodeId,
        };
    }

    /**
     * Interpolate variables in a template string
     */
    private interpolateVariables(template: string, variables: Record<string, any>): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            return variables[varName] !== undefined ? String(variables[varName]) : match;
        });
    }

    /**
     * Main entry point for processing incoming messages
     */
    async handleIncomingMessage(context: MessageContext): Promise<ExecutionResult | null> {
        try {
            // Find matching chatbot
            const chatbot = await this.findMatchingChatbot(context);
            if (!chatbot) {
                return null; // No chatbot matched
            }

            // Get or create session
            const session = await this.getOrCreateSession(chatbot, context);

            // Process the message
            const result = await this.processMessage(session, chatbot, context);

            return result;
        } catch (error) {
            this.logger.error('Error handling incoming message:', error);
            return { success: false };
        }
    }
}
