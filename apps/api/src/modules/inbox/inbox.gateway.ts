import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003').split(','),
        credentials: true,
    },
    namespace: '/inbox',
})
export class InboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private connectedUsers = new Map<string, Set<string>>(); // tenantId -> Set<socketId>

    handleConnection(client: Socket) {
        const tenantId = client.handshake.query.tenantId as string;

        if (tenantId) {
            if (!this.connectedUsers.has(tenantId)) {
                this.connectedUsers.set(tenantId, new Set());
            }
            this.connectedUsers.get(tenantId)?.add(client.id);

            // Join room for this tenant
            client.join(`tenant:${tenantId}`);

            console.log(`Client connected to inbox: ${client.id} for tenant ${tenantId}`);
        }
    }

    handleDisconnect(client: Socket) {
        const tenantId = client.handshake.query.tenantId as string;

        if (tenantId && this.connectedUsers.has(tenantId)) {
            this.connectedUsers.get(tenantId)?.delete(client.id);

            if (this.connectedUsers.get(tenantId)?.size === 0) {
                this.connectedUsers.delete(tenantId);
            }
        }

        console.log(`Client disconnected from inbox: ${client.id}`);
    }

    @SubscribeMessage('typing')
    handleTyping(client: Socket, data: { conversationId: string; isTyping: boolean }) {
        const tenantId = client.handshake.query.tenantId as string;

        // Broadcast typing indicator to all clients in the same tenant
        client.to(`tenant:${tenantId}`).emit('typing', {
            conversationId: data.conversationId,
            isTyping: data.isTyping,
            userId: client.handshake.query.userId,
        });
    }

    // Emit new message to all connected clients for a tenant
    emitNewMessage(tenantId: string, conversationId: string, message: any) {
        this.server.to(`tenant:${tenantId}`).emit('new-message', {
            conversationId,
            message,
        });
    }

    // Emit conversation update
    emitConversationUpdate(tenantId: string, conversation: any) {
        this.server.to(`tenant:${tenantId}`).emit('conversation-updated', conversation);
    }
}
