'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface InboxSocketOptions {
    tenantId: string;
    userId: string;
    onNewMessage?: (data: { conversationId: string; message: any }) => void;
    onConversationUpdated?: (conversation: any) => void;
    onTyping?: (data: { conversationId: string; isTyping: boolean; userId: string }) => void;
}

interface UseInboxSocketReturn {
    isConnected: boolean;
    sendTyping: (conversationId: string, isTyping: boolean) => void;
    socket: Socket | null;
}

/**
 * Custom hook for WebSocket connection to the inbox real-time updates
 * Connects to the backend InboxGateway for real-time message delivery
 */
export function useInboxSocket({
    tenantId,
    userId,
    onNewMessage,
    onConversationUpdated,
    onTyping,
}: InboxSocketOptions): UseInboxSocketReturn {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!tenantId || !userId) {
            console.log('[InboxSocket] Missing tenantId or userId, skipping connection');
            return;
        }

        // Get the WebSocket URL (backend server)
        const wsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        console.log(`[InboxSocket] Connecting to ${wsUrl}/inbox`);

        // Create socket connection
        const socket = io(`${wsUrl}/inbox`, {
            query: {
                tenantId,
                userId,
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 10,
        });

        socketRef.current = socket;

        // Connection events
        socket.on('connect', () => {
            console.log('[InboxSocket] Connected:', socket.id);
            setIsConnected(true);
        });

        socket.on('disconnect', (reason) => {
            console.log('[InboxSocket] Disconnected:', reason);
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('[InboxSocket] Connection error:', error.message);
            setIsConnected(false);
        });

        // Business events
        socket.on('new-message', (data: { conversationId: string; message: any }) => {
            console.log('[InboxSocket] New message received:', data);
            onNewMessage?.(data);
        });

        socket.on('conversation-updated', (conversation: any) => {
            console.log('[InboxSocket] Conversation updated:', conversation);
            onConversationUpdated?.(conversation);
        });

        socket.on('typing', (data: { conversationId: string; isTyping: boolean; userId: string }) => {
            console.log('[InboxSocket] Typing indicator:', data);
            onTyping?.(data);
        });

        // Cleanup on unmount
        return () => {
            console.log('[InboxSocket] Disconnecting...');
            socket.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        };
    }, [tenantId, userId, onNewMessage, onConversationUpdated, onTyping]);

    // Send typing indicator
    const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('typing', { conversationId, isTyping });
        }
    }, []);

    return {
        isConnected,
        sendTyping,
        socket: socketRef.current,
    };
}

/**
 * Context provider for sharing socket connection across components
 */
export default useInboxSocket;
