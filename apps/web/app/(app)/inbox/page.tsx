'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useInboxSocket } from '@/hooks/useInboxSocket';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Search,
    Send,
    Paperclip,
    MoreVertical,
    Phone,
    Mail,
    Instagram,
    MessageSquare,
    User,
    Clock,
    Check,
    CheckCheck,
    Loader2,
    FileText,
    StickyNote,
    UserPlus,
    ChevronDown,
    X,
    Circle,
    WifiOff,
    AlertCircle,
    RotateCw,
    Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
}

interface Conversation {
    id: string;
    contact: Contact;
    channelType: 'whatsapp' | 'instagram' | 'email';
    channelId: string;
    lastMessagePreview: string;
    lastMessageAt: string;
    unreadCount: number;
    status: 'open' | 'pending' | 'resolved' | 'snoozed';
    assignedTo?: { id: string; firstName: string; lastName: string };
    notes?: string;
    tags?: string[];
}

interface Message {
    id: string;
    direction: 'inbound' | 'outbound';
    messageType: string;
    content: string;
    createdAt: string;
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
    media?: { url?: string; mimeType?: string; filename?: string; caption?: string };
    errorMessage?: string;
}

interface ChannelAccount {
    id: string;
    name: string;
    channelType: string;
    status: string;
}

interface ConversationCounts {
    total: number;
    byChannel: Record<string, { total: number; open: number }>;
    byStatus: { open: number; pending: number; resolved: number; snoozed: number };
}

interface Agent {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    avatarUrl?: string;
}

interface ChatbotInfo {
    id: string;
    name: string;
    channel: string;
}

interface WhatsAppTemplate {
    id: string;
    name: string;
    status: string;
    category: string;
    language: string;
    components?: Array<{
        type: string;
        text?: string;
        format?: string;
        example?: any;
    }>;
}

const CHANNEL_TABS = [
    { id: 'all', label: 'All', icon: MessageSquare },
    { id: 'whatsapp', label: 'WhatsApp', icon: Phone },
    // { id: 'instagram', label: 'Instagram', icon: Instagram }, // Coming Soon
    // { id: 'email', label: 'Email', icon: Mail }, // Moved to separate Email Inbox
];

const STATUS_FILTERS = ['all', 'open', 'pending', 'resolved', 'snoozed'];

export default function InboxPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [accounts, setAccounts] = useState<ChannelAccount[]>([]);
    const [counts, setCounts] = useState<ConversationCounts | null>(null);
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [internalNote, setInternalNote] = useState('');
    const [errorToast, setErrorToast] = useState<{ show: boolean; message: string; messageId?: string }>({ show: false, message: '' });
    const [agents, setAgents] = useState<Agent[]>([]);
    const [chatbots, setChatbots] = useState<ChatbotInfo[]>([]);
    const [attachedFile, setAttachedFile] = useState<{ file: File; preview: string } | null>(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showMessagePreview, setShowMessagePreview] = useState(false);
    const [emailSubject, setEmailSubject] = useState(''); // For email conversations
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
    const [sendingTemplate, setSendingTemplate] = useState(false);

    // Filters
    const [channelFilter, setChannelFilter] = useState('all');
    const [accountFilter, setAccountFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // WebSocket callbacks for real-time updates
    const handleNewMessage = useCallback((data: { conversationId: string; message: any }) => {
        console.log('[Inbox] Real-time message received:', data);

        // If this message is for the currently selected conversation, add it to messages
        if (selectedConversation && data.conversationId === selectedConversation.id) {
            setMessages(prev => [...prev, data.message]);
        }

        // Update the conversation in the list
        setConversations(prev => {
            const updated = prev.map(conv => {
                if (conv.id === data.conversationId) {
                    return {
                        ...conv,
                        lastMessagePreview: data.message.content?.substring(0, 100) || '[Media]',
                        lastMessageAt: data.message.createdAt || new Date().toISOString(),
                        unreadCount: conv.id !== selectedConversation?.id
                            ? (conv.unreadCount || 0) + 1
                            : conv.unreadCount,
                    };
                }
                return conv;
            });
            // Sort by lastMessageAt to bring latest to top
            return updated.sort((a, b) =>
                new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
            );
        });
    }, [selectedConversation]);

    const handleConversationUpdated = useCallback((conversation: any) => {
        console.log('[Inbox] Conversation updated:', conversation);
        setConversations(prev =>
            prev.map(conv => conv.id === conversation.id ? { ...conv, ...conversation } : conv)
        );
    }, []);

    // Get real user info from JWT token
    const { user } = useAuth();

    // WebSocket connection for real-time updates with real tenantId from auth
    const { isConnected } = useInboxSocket({
        tenantId: user?.tenantId || '',
        userId: user?.userId || '',
        onNewMessage: handleNewMessage,
        onConversationUpdated: handleConversationUpdated,
    });

    // Fetch conversations with filters
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Build query params
                const params = new URLSearchParams();
                if (channelFilter !== 'all') params.set('channelType', channelFilter);
                if (accountFilter !== 'all') params.set('channelId', accountFilter);
                if (statusFilter !== 'all') params.set('status', statusFilter);

                const [convsRes, countsRes, accountsRes] = await Promise.all([
                    fetch(`/api/inbox?${params.toString()}`),
                    fetch('/api/inbox/counts'),
                    fetch('/api/inbox/accounts'),
                ]);

                if (convsRes.ok) {
                    const data = await convsRes.json();
                    setConversations(data);
                    // When filter changes, select the first conversation from new results
                    // Only keep selection if the selected conversation is in the new results
                    if (data.length > 0) {
                        const currentId = selectedConversation?.id;
                        const existsInNewData = data.some((c: Conversation) => c.id === currentId);
                        if (!existsInNewData) {
                            setSelectedConversation(data[0]);
                        }
                    } else {
                        setSelectedConversation(null);
                    }
                }

                if (countsRes.ok) {
                    setCounts(await countsRes.json());
                }

                if (accountsRes.ok) {
                    setAccounts(await accountsRes.json());
                }
            } catch (error) {
                console.error('Error fetching inbox:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [channelFilter, accountFilter, statusFilter]);

    // Fetch agents and chatbots on mount
    useEffect(() => {
        const fetchAgentsAndChatbots = async () => {
            try {
                const [agentsRes, chatbotsRes] = await Promise.all([
                    fetch('/api/inbox/agents'),
                    fetch('/api/inbox/chatbots'),
                ]);

                if (agentsRes.ok) {
                    setAgents(await agentsRes.json());
                }

                if (chatbotsRes.ok) {
                    setChatbots(await chatbotsRes.json());
                }
            } catch (error) {
                console.error('Error fetching agents/chatbots:', error);
            }
        };

        fetchAgentsAndChatbots();
    }, []);

    // Fetch messages when conversation is selected
    useEffect(() => {
        if (!selectedConversation) return;

        const fetchMessages = async () => {
            try {
                setMessagesLoading(true);
                const res = await fetch(`/api/inbox/conversations/${selectedConversation.id}/messages`);
                if (res.ok) {
                    setMessages(await res.json());
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
            } finally {
                setMessagesLoading(false);
            }
        };

        fetchMessages();

        // Mark as read
        fetch(`/api/inbox/conversations/${selectedConversation.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAsRead: true }),
        });
    }, [selectedConversation?.id]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        // Allow sending if there's text OR an attachment
        if (!selectedConversation || (!messageInput.trim() && !attachedFile)) return;

        const hasMedia = !!attachedFile;
        const caption = messageInput.trim();
        const isEmail = selectedConversation.channelType === 'email';

        // For email, require subject
        if (isEmail && !emailSubject.trim()) {
            setErrorToast({ show: true, message: 'Email subject is required' });
            return;
        }

        // Optimistic update: Add message immediately with pending status
        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            content: isEmail ? emailSubject : (caption || (hasMedia ? '📎 Media' : '')),
            direction: 'outbound' as const,
            messageType: hasMedia ? 'image' : 'text',
            status: 'pending',
            createdAt: new Date().toISOString(),
            media: attachedFile ? {
                url: attachedFile.preview || undefined,
                mimeType: attachedFile.file.type,
                filename: attachedFile.file.name,
                caption: caption || undefined
            } : undefined,
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setMessageInput('');
        if (isEmail) {
            setEmailSubject('');
        }
        const fileToUpload = attachedFile;
        setAttachedFile(null); // Clear attachment immediately
        setSending(true);

        try {
            // Handle email sending
            if (isEmail) {
                const response = await fetch('/api/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        channelId: selectedConversation.channelId,
                        to: selectedConversation.contact.email,
                        subject: emailSubject,
                        html: `<p>${caption.replace(/\n/g, '<br>')}</p>`,
                        text: caption,
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to send email');
                }

                // Remove optimistic message and fetch latest
                setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
                const res = await fetch(`/api/inbox/conversations/${selectedConversation.id}/messages`);
                if (res.ok) {
                    setMessages(await res.json());
                }
                setErrorToast({ show: false, message: '' });
                setSending(false);
                return;
            }

            // Handle WhatsApp sending (original logic)
            let mediaUrl = '';
            let mediaType = 'text';

            // If there's a file, upload it first
            if (fileToUpload) {
                const formData = new FormData();
                formData.append('file', fileToUpload.file);

                const uploadRes = await fetch(`/api/inbox/conversations/${selectedConversation.id}/media`, {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) {
                    throw new Error('Failed to upload media');
                }

                const uploadData = await uploadRes.json();
                mediaUrl = uploadData.url || uploadData.mediaUrl;

                // Determine media type from file
                if (fileToUpload.file.type.startsWith('image/')) {
                    mediaType = 'image';
                } else if (fileToUpload.file.type.startsWith('video/')) {
                    mediaType = 'video';
                } else if (fileToUpload.file.type.startsWith('audio/')) {
                    mediaType = 'audio';
                } else {
                    mediaType = 'document';
                }
            }

            // Send the message with media (if any) and caption
            const res = await fetch(`/api/inbox/conversations/${selectedConversation.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: caption,
                    mediaUrl: mediaUrl || undefined,
                    mediaType: mediaUrl ? mediaType : 'text',
                }),
            });

            if (res.ok) {
                const newMessage = await res.json();
                // Replace optimistic message with real one
                setMessages((prev) =>
                    prev.map(msg => msg.id === optimisticMessage.id ? newMessage : msg)
                );
                // Clear any error toast
                setErrorToast({ show: false, message: '' });
            } else {
                // Try to get error message from response
                let errorMsg = 'Unable to send message. Please try again.';
                try {
                    const errorData = await res.json();
                    errorMsg = errorData.error || errorData.message || errorMsg;

                    // Clean up common error scenarios
                    if (errorMsg.includes('access token') || errorMsg.includes('Session has expired')) {
                        errorMsg = 'WhatsApp connection expired. Please reconnect in Channels.';
                    } else if (errorMsg === 'Internal server error') {
                        errorMsg = 'Unable to send message. Please try again.';
                    } else if (errorMsg.startsWith('{') && errorMsg.includes('statusCode')) {
                        // Handle JSON-like strings that weren't parsed
                        try {
                            const parsed = JSON.parse(errorMsg);
                            errorMsg = parsed.message || 'Unable to send message.';
                        } catch {
                            errorMsg = 'Unable to send message. Please try again.';
                        }
                    }
                } catch {
                    // Use default error message
                }


                // Mark as failed with error message
                setMessages((prev) =>
                    prev.map(msg => msg.id === optimisticMessage.id
                        ? { ...msg, status: 'failed' as const, errorMessage: errorMsg }
                        : msg)
                );
                // Show error toast
                setErrorToast({ show: true, message: errorMsg, messageId: optimisticMessage.id });
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            const errorMsg = error.message || 'Network error. Please check your connection.';
            // Mark as failed on error
            setMessages((prev) =>
                prev.map(msg => msg.id === optimisticMessage.id
                    ? { ...msg, status: 'failed' as const, errorMessage: errorMsg }
                    : msg)
            );
            // Show error toast
            setErrorToast({ show: true, message: errorMsg, messageId: optimisticMessage.id });
        } finally {
            setSending(false);
        }
    };

    // Retry sending a failed message
    const handleRetryMessage = async (failedMessage: Message) => {
        if (!selectedConversation) return;

        // Update message to pending
        setMessages((prev) =>
            prev.map(msg => msg.id === failedMessage.id
                ? { ...msg, status: 'pending' as const, errorMessage: undefined }
                : msg)
        );

        try {
            const res = await fetch(`/api/inbox/conversations/${selectedConversation.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: failedMessage.content }),
            });

            if (res.ok) {
                const newMessage = await res.json();
                setMessages((prev) =>
                    prev.map(msg => msg.id === failedMessage.id ? newMessage : msg)
                );
                setErrorToast({ show: false, message: '' });
            } else {
                let errorMsg = 'Unable to send message. Please try again.';
                try {
                    const errorData = await res.json();
                    errorMsg = errorData.error || errorData.message || errorMsg;

                    if (errorMsg.includes('access token') || errorMsg.includes('Session has expired')) {
                        errorMsg = 'WhatsApp connection expired. Please reconnect in Channels.';
                    } else if (errorMsg === 'Internal server error') {
                        errorMsg = 'Unable to send message. Please try again.';
                    }
                } catch { }

                setMessages((prev) =>
                    prev.map(msg => msg.id === failedMessage.id
                        ? { ...msg, status: 'failed' as const, errorMessage: errorMsg }
                        : msg)
                );
                setErrorToast({ show: true, message: errorMsg });
            }
        } catch (error: any) {
            const errorMsg = error.message || 'Network error';
            setMessages((prev) =>
                prev.map(msg => msg.id === failedMessage.id
                    ? { ...msg, status: 'failed' as const, errorMessage: errorMsg }
                    : msg)
            );
            setErrorToast({ show: true, message: errorMsg });
        }
    };

    const handleStatusChange = async (status: string) => {
        if (!selectedConversation) return;

        try {
            const res = await fetch(`/api/inbox/conversations/${selectedConversation.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (res.ok) {
                const updated = await res.json();
                setSelectedConversation(updated);
                setConversations((prev) =>
                    prev.map((c) => (c.id === updated.id ? updated : c))
                );
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleAssignAgent = async (agentId: string | null) => {
        if (!selectedConversation) return;

        try {
            const res = await fetch(`/api/inbox/conversations/${selectedConversation.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignedToId: agentId }),
            });

            if (res.ok) {
                const updated = await res.json();
                setSelectedConversation(updated);
                setConversations((prev) =>
                    prev.map((c) => (c.id === updated.id ? updated : c))
                );
            }
        } catch (error) {
            console.error('Error assigning agent:', error);
        }
    };

    const handleSetChatbot = async (chatbotId: string | null) => {
        if (!selectedConversation) return;

        try {
            const res = await fetch(`/api/inbox/conversations/${selectedConversation.id}/chatbot`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatbotId }),
            });

            if (res.ok) {
                const updated = await res.json();
                setSelectedConversation(updated);
                setConversations((prev) =>
                    prev.map((c) => (c.id === updated.id ? updated : c))
                );
            }
        } catch (error) {
            console.error('Error setting chatbot:', error);
        }
    };

    const handleSaveNote = async () => {
        if (!selectedConversation || !internalNote.trim()) return;

        try {
            const res = await fetch(`/api/inbox/conversations/${selectedConversation.id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: internalNote }),
            });

            if (res.ok) {
                const savedNote = await res.json();

                // Parse existing notes as array or create new array
                let existingNotes: any[] = [];
                if (selectedConversation.notes) {
                    try {
                        const parsed = JSON.parse(selectedConversation.notes);
                        existingNotes = Array.isArray(parsed) ? parsed : [];
                    } catch {
                        // If existing notes aren't JSON, create array with them as first item
                        existingNotes = selectedConversation.notes ? [{ note: selectedConversation.notes, createdAt: new Date().toISOString() }] : [];
                    }
                }

                // Add new note to array
                const newNote = savedNote.note ? savedNote : {
                    id: Date.now().toString(),
                    note: internalNote,
                    createdAt: new Date().toISOString()
                };
                existingNotes.push(newNote);

                // Update conversation with stringified notes array
                const updatedConversation = {
                    ...selectedConversation,
                    notes: JSON.stringify(existingNotes),
                };
                setSelectedConversation(updatedConversation);
                setConversations((prev) =>
                    prev.map((c) => (c.id === updatedConversation.id ? updatedConversation : c))
                );
                setInternalNote(''); // Clear the input
            } else {
                console.error('Failed to save note');
            }
        } catch (error) {
            console.error('Error saving note:', error);
        }
    };

    const handleViewProfile = () => {
        if (!selectedConversation?.contact?.id) return;
        window.open(`/contacts/${selectedConversation.contact.id}`, '_blank');
    };

    const handleViewHistory = () => {
        if (!selectedConversation?.contact?.id) return;
        window.open(`/contacts/${selectedConversation.contact.id}?tab=timeline`, '_blank');
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAttachmentClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedConversation) return;

        // Create preview URL for images
        let preview = '';
        if (file.type.startsWith('image/')) {
            preview = URL.createObjectURL(file);
        }

        // Store the file for sending
        setAttachedFile({ file, preview });

        // Reset the file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveAttachment = () => {
        if (attachedFile?.preview) {
            URL.revokeObjectURL(attachedFile.preview);
        }
        setAttachedFile(null);
    };

    const handleTemplateClick = async () => {
        if (!selectedConversation || selectedConversation.channelType !== 'whatsapp') {
            setErrorToast({ show: true, message: 'Templates are only available for WhatsApp conversations' });
            setTimeout(() => setErrorToast({ show: false, message: '' }), 3000);
            return;
        }

        setShowTemplateModal(true);
        setTemplatesLoading(true);

        try {
            const res = await fetch('/api/templates/whatsapp');
            if (res.ok) {
                const data = await res.json();
                // Filter to only show APPROVED templates
                const approvedTemplates = (data.templates || []).filter(
                    (t: WhatsAppTemplate) => t.status === 'APPROVED'
                );
                setTemplates(approvedTemplates);
            } else {
                console.error('Failed to fetch templates');
                setTemplates([]);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
            setTemplates([]);
        } finally {
            setTemplatesLoading(false);
        }
    };

    const handleSelectTemplate = (template: WhatsAppTemplate) => {
        setSelectedTemplate(template);
    };

    const handleSendTemplate = async () => {
        if (!selectedConversation || !selectedTemplate) return;

        setSendingTemplate(true);

        // Optimistic update: Add message immediately with pending status
        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            content: `📋 Template: ${selectedTemplate.name}`,
            direction: 'outbound' as const,
            messageType: 'template',
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setShowTemplateModal(false);
        setSelectedTemplate(null);

        try {
            const res = await fetch(`/api/inbox/conversations/${selectedConversation.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageType: 'template',
                    templateName: selectedTemplate.name,
                    templateLanguage: selectedTemplate.language,
                }),
            });

            if (res.ok) {
                const sentMessage = await res.json();
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === optimisticMessage.id
                            ? { ...sentMessage, status: 'sent' }
                            : msg
                    )
                );
            } else {
                // Mark as failed
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === optimisticMessage.id
                            ? { ...msg, status: 'failed', errorMessage: 'Failed to send template' }
                            : msg
                    )
                );
                setErrorToast({ show: true, message: 'Failed to send template', messageId: optimisticMessage.id });
                setTimeout(() => setErrorToast({ show: false, message: '' }), 5000);
            }
        } catch (error) {
            console.error('Error sending template:', error);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === optimisticMessage.id
                        ? { ...msg, status: 'failed', errorMessage: 'Network error' }
                        : msg
                )
            );
            setErrorToast({ show: true, message: 'Failed to send template', messageId: optimisticMessage.id });
            setTimeout(() => setErrorToast({ show: false, message: '' }), 5000);
        } finally {
            setSendingTemplate(false);
        }
    };

    const handleCloseTemplateModal = () => {
        setShowTemplateModal(false);
        setSelectedTemplate(null);
        setTemplates([]);
    };

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'whatsapp':
                return <Phone className="h-4 w-4" />;
            case 'instagram':
                return <Instagram className="h-4 w-4" />;
            case 'email':
                return <Mail className="h-4 w-4" />;
            default:
                return <MessageSquare className="h-4 w-4" />;
        }
    };

    const getChannelColor = (channel: string) => {
        switch (channel) {
            case 'whatsapp':
                return 'bg-green-500';
            case 'instagram':
                return 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500';
            case 'email':
                return 'bg-blue-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'resolved':
                return 'bg-gray-100 text-gray-800';
            case 'snoozed':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        if (hours < 48) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getContactInitials = (contact: Contact) => {
        return `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase() || '?';
    };

    const getContactName = (contact: Contact) => {
        return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown';
    };

    // Filter accounts by selected channel
    const filteredAccounts = channelFilter === 'all'
        ? accounts
        : accounts.filter((a) => a.channelType === channelFilter);

    // Filter conversations by search
    const filteredConversations = conversations.filter((conv) => {
        if (!searchQuery) return true;
        const name = getContactName(conv.contact).toLowerCase();
        const preview = conv.lastMessagePreview?.toLowerCase() || '';
        return name.includes(searchQuery.toLowerCase()) || preview.includes(searchQuery.toLowerCase());
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            {/* Channel Tabs */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <Tabs value={channelFilter} onValueChange={(v) => { setChannelFilter(v); setAccountFilter('all'); }}>
                        <TabsList className="bg-muted/50">
                            {CHANNEL_TABS.map((tab) => {
                                const Icon = tab.icon;
                                const count = tab.id === 'all'
                                    ? counts?.total || 0
                                    : counts?.byChannel[tab.id]?.total || 0;

                                return (
                                    <TabsTrigger key={tab.id} value={tab.id} className="gap-2 data-[state=active]:bg-background">
                                        <Icon className="h-4 w-4" />
                                        {tab.label}
                                        {count > 0 && (
                                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">
                                                {count}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </Tabs>

                    {/* Real-time connection status */}
                    <div className="flex items-center gap-1.5 text-xs">
                        {isConnected ? (
                            <>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-green-600 font-medium">Live</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Connecting...</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Account Selector & Compose Button */}
                <div className="flex items-center gap-2">
                    {filteredAccounts.length > 0 && (
                        <Select value={accountFilter} onValueChange={setAccountFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All accounts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All accounts</SelectItem>
                                {filteredAccounts.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Left Column - Conversations List */}
                <Card className="w-80 flex flex-col">
                    <div className="border-b p-3 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search conversations..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            {STATUS_FILTERS.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={cn(
                                        'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                                        statusFilter === s
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted hover:bg-muted/80'
                                    )}
                                >
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                <MessageSquare className="h-12 w-12 opacity-20 mb-3" />
                                <p className="text-sm">No conversations found</p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv)}
                                    className={cn(
                                        'w-full p-3 border-b text-left hover:bg-accent transition-colors',
                                        selectedConversation?.id === conv.id && 'bg-accent'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="relative flex-shrink-0">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
                                                {getContactInitials(conv.contact)}
                                            </div>
                                            <div
                                                className={cn(
                                                    'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center',
                                                    getChannelColor(conv.channelType)
                                                )}
                                            >
                                                <span className="text-white scale-75">{getChannelIcon(conv.channelType)}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="font-medium text-sm truncate">{getContactName(conv.contact)}</span>
                                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                    {formatTime(conv.lastMessageAt)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">{conv.lastMessagePreview}</p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', getStatusColor(conv.status))}>
                                                    {conv.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        {conv.unreadCount > 0 && (
                                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex-shrink-0">
                                                {conv.unreadCount}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </Card>

                {/* Middle Column - Message Thread */}
                <Card className="flex-1 flex flex-col">
                    {selectedConversation ? (
                        <>
                            {/* Header */}
                            <div className="border-b p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                                            {getContactInitials(selectedConversation.contact)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm">{getContactName(selectedConversation.contact)}</h3>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <span className={cn('w-2 h-2 rounded-full', getChannelColor(selectedConversation.channelType))} />
                                                {selectedConversation.channelType} • {selectedConversation.status}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="sm" variant="outline" className="gap-1">
                                                    Status
                                                    <ChevronDown className="h-3 w-3" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                {['open', 'pending', 'resolved', 'snoozed'].map((s) => (
                                                    <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)}>
                                                        <Circle className={cn('h-2 w-2 mr-2', s === 'open' && 'fill-green-500 text-green-500', s === 'pending' && 'fill-yellow-500 text-yellow-500', s === 'resolved' && 'fill-gray-500 text-gray-500', s === 'snoozed' && 'fill-blue-500 text-blue-500')} />
                                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button size="icon" variant="ghost">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {messagesLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <MessageSquare className="h-12 w-12 opacity-20 mb-3" />
                                        <p className="text-sm">No messages yet</p>
                                        <p className="text-xs">Start the conversation by sending a message</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn('flex flex-col', msg.direction === 'outbound' ? 'items-end' : 'items-start')}
                                        >
                                            <div
                                                className={cn(
                                                    'max-w-[70%] rounded-2xl px-4 py-2',
                                                    msg.direction === 'outbound'
                                                        ? msg.status === 'failed'
                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700 rounded-br-md'
                                                            : 'bg-primary text-primary-foreground rounded-br-md'
                                                        : 'bg-muted rounded-bl-md'
                                                )}
                                            >
                                                {/* Media display */}
                                                {msg.media?.url && (
                                                    <div className="mb-2">
                                                        {msg.messageType === 'image' || msg.media.mimeType?.startsWith('image/') ? (
                                                            <img
                                                                src={msg.media.url}
                                                                alt={msg.media.caption || 'Image'}
                                                                className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                                onClick={() => window.open(msg.media?.url, '_blank')}
                                                            />
                                                        ) : msg.messageType === 'video' || msg.media.mimeType?.startsWith('video/') ? (
                                                            <video
                                                                src={msg.media.url}
                                                                controls
                                                                className="max-w-full rounded-lg max-h-64"
                                                            />
                                                        ) : msg.messageType === 'audio' || msg.media.mimeType?.startsWith('audio/') ? (
                                                            <audio
                                                                src={msg.media.url}
                                                                controls
                                                                className="max-w-full"
                                                            />
                                                        ) : (
                                                            <a
                                                                href={msg.media.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 p-2 bg-background/50 rounded-lg hover:bg-background/80 transition-colors"
                                                            >
                                                                <FileText className="h-8 w-8 text-primary/50" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium truncate">{msg.media.filename || 'Document'}</p>
                                                                    <p className="text-xs text-muted-foreground">Click to download</p>
                                                                </div>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                                {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                                                <div className="flex items-center gap-1 mt-1 justify-end">
                                                    <span className={cn('text-[10px]',
                                                        msg.direction === 'outbound'
                                                            ? msg.status === 'failed'
                                                                ? 'text-red-600 dark:text-red-300'
                                                                : 'text-primary-foreground/70'
                                                            : 'text-muted-foreground')}>
                                                        {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                    {msg.direction === 'outbound' && (
                                                        <span className={msg.status === 'failed' ? 'text-red-500' : 'text-primary-foreground/70'}>
                                                            {msg.status === 'read' ? (
                                                                <CheckCheck className="h-3 w-3" />
                                                            ) : msg.status === 'delivered' ? (
                                                                <CheckCheck className="h-3 w-3" />
                                                            ) : msg.status === 'sent' ? (
                                                                <Check className="h-3 w-3" />
                                                            ) : msg.status === 'failed' ? (
                                                                <AlertCircle className="h-3 w-3" />
                                                            ) : (
                                                                <Clock className="h-3 w-3" />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Error message and retry button for failed messages */}
                                            {msg.status === 'failed' && (
                                                <div className="flex items-center gap-2 mt-1 text-xs text-red-500">
                                                    <span className="max-w-[200px] truncate" title={msg.errorMessage}>
                                                        {msg.errorMessage || 'Failed to send'}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRetryMessage(msg)}
                                                        className="flex items-center gap-1 text-red-600 hover:text-red-700 underline"
                                                    >
                                                        <RotateCw className="h-3 w-3" />
                                                        Retry
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Error Toast */}
                            {errorToast.show && (
                                <div className="border-t border-b border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                        <span className="text-sm">{errorToast.message}</span>
                                    </div>
                                    <button
                                        onClick={() => setErrorToast({ show: false, message: '' })}
                                        className="text-red-500 hover:text-red-700 dark:hover:text-red-200"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {/* Message Input */}
                            <div className="border-t p-3">
                                {/* Attachment Preview */}
                                {attachedFile && (
                                    <div className="mb-2 p-2 bg-muted rounded-lg flex items-center gap-3">
                                        {attachedFile.preview ? (
                                            <img
                                                src={attachedFile.preview}
                                                alt="Preview"
                                                className="h-16 w-16 object-cover rounded-md"
                                            />
                                        ) : (
                                            <div className="h-16 w-16 bg-primary/10 rounded-md flex items-center justify-center">
                                                <FileText className="h-8 w-8 text-primary/50" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{attachedFile.file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {(attachedFile.file.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="flex-shrink-0 h-8 w-8"
                                            onClick={handleRemoveAttachment}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                                <div className="flex items-end gap-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant={(selectedConversation as any).activeChatbotId ? 'default' : 'ghost'}
                                                className="flex-shrink-0"
                                                title="Chatbot"
                                            >
                                                <span className="text-base">🤖</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleSetChatbot(null)}>
                                                <span className="text-muted-foreground">No Chatbot</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {chatbots.map((bot) => (
                                                <DropdownMenuItem
                                                    key={bot.id}
                                                    onClick={() => handleSetChatbot(bot.id)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span>🤖 {bot.name}</span>
                                                        {(selectedConversation as any).activeChatbotId === bot.id && (
                                                            <Check className="h-3 w-3 ml-auto text-green-500" />
                                                        )}
                                                    </div>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                                    />
                                    <Button size="icon" variant="ghost" className="flex-shrink-0" onClick={handleAttachmentClick} title="Attach file">
                                        <Paperclip className="h-5 w-5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="flex-shrink-0" title="Templates" onClick={handleTemplateClick}>
                                        <FileText className="h-5 w-5" />
                                    </Button>

                                    {/* Email subject field - only for email conversations */}
                                    {selectedConversation.channelType === 'email' && (
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Subject..."
                                                value={emailSubject}
                                                onChange={(e) => setEmailSubject(e.target.value)}
                                                disabled={sending}
                                            />
                                        </div>
                                    )}

                                    <div className="flex-1">
                                        <Input
                                            placeholder={selectedConversation.channelType === 'email' ? 'Email body...' : 'Type a message...'}
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                            disabled={sending}
                                        />
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setShowMessagePreview(true)}
                                        disabled={!messageInput.trim() && !attachedFile}
                                        title="Preview message"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button onClick={handleSendMessage} disabled={sending || (!messageInput.trim() && !attachedFile)}>
                                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <MessageSquare className="h-16 w-16 opacity-20 mb-4" />
                            <h3 className="font-medium mb-1">Select a conversation</h3>
                            <p className="text-sm">Choose a conversation from the list to start messaging</p>
                        </div>
                    )}
                </Card>

                {/* Right Column - Contact Details */}
                <Card className="w-72 flex flex-col">
                    {selectedConversation ? (
                        <>
                            <div className="border-b p-3">
                                <h3 className="font-semibold text-sm">Contact Details</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                                {/* Contact Info */}
                                <div className="flex flex-col items-center text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 font-bold text-xl text-primary mb-2">
                                        {getContactInitials(selectedConversation.contact)}
                                    </div>
                                    <h4 className="font-semibold">{getContactName(selectedConversation.contact)}</h4>
                                    <p className="text-xs text-muted-foreground">{selectedConversation.channelType}</p>
                                </div>

                                {/* Contact Details */}
                                <div className="space-y-2">
                                    <h5 className="font-medium text-xs text-muted-foreground uppercase">Contact Info</h5>
                                    {selectedConversation.contact.phone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <span className="truncate">{selectedConversation.contact.phone}</span>
                                        </div>
                                    )}
                                    {selectedConversation.contact.email && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <span className="truncate">{selectedConversation.contact.email}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Assignment */}
                                <div className="space-y-2">
                                    <h5 className="font-medium text-xs text-muted-foreground uppercase">Assigned To</h5>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full justify-start">
                                                <UserPlus className="h-4 w-4 mr-2" />
                                                {selectedConversation.assignedTo
                                                    ? `${selectedConversation.assignedTo.firstName} ${selectedConversation.assignedTo.lastName}`
                                                    : 'Assign Agent'}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuItem onClick={() => handleAssignAgent(null)}>
                                                <span className="text-muted-foreground">Unassigned</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {agents.map((agent) => (
                                                <DropdownMenuItem
                                                    key={agent.id}
                                                    onClick={() => handleAssignAgent(agent.id)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                                            {agent.firstName[0]}
                                                        </div>
                                                        <span>{agent.firstName} {agent.lastName}</span>
                                                        {selectedConversation.assignedTo?.id === agent.id && (
                                                            <Check className="h-3 w-3 ml-auto" />
                                                        )}
                                                    </div>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Actions */}
                                <div className="space-y-2 pt-2">
                                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleViewProfile}>
                                        <User className="h-4 w-4 mr-2" />
                                        View Full Profile
                                    </Button>
                                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleViewHistory}>
                                        <Clock className="h-4 w-4 mr-2" />
                                        View History
                                    </Button>
                                </div>

                                {/* Internal Notes - at the end */}
                                <div className="space-y-2 pt-4 border-t mt-4">
                                    <h5 className="font-medium text-xs text-muted-foreground uppercase">Internal Notes</h5>
                                    <textarea
                                        className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm resize-none"
                                        placeholder="Add private notes..."
                                        value={internalNote}
                                        onChange={(e) => setInternalNote(e.target.value)}
                                    />
                                    <Button className="w-full" size="sm" disabled={!internalNote.trim()} onClick={handleSaveNote}>
                                        <StickyNote className="h-4 w-4 mr-2" />
                                        Save Note
                                    </Button>
                                    {/* Display saved notes below - parse if JSON array */}
                                    {selectedConversation.notes && (() => {
                                        // Try to parse as JSON array
                                        try {
                                            const notesData = JSON.parse(selectedConversation.notes);
                                            if (Array.isArray(notesData)) {
                                                return notesData.map((note: any, index: number) => (
                                                    <div key={note.id || index} className="p-2 bg-muted rounded-md text-xs border-l-2 border-primary/30">
                                                        <p className="text-foreground">{note.note}</p>
                                                        <p className="text-muted-foreground text-[10px] mt-1">
                                                            {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                ));
                                            }
                                        } catch {
                                            // Not JSON, display as plain text
                                        }
                                        // Display as plain text if parsing failed
                                        return (
                                            <div className="p-2 bg-muted rounded-md text-xs border-l-2 border-primary/30">
                                                <p className="text-foreground">{selectedConversation.notes}</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p className="text-sm">Select a conversation</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Template Picker Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold">Select WhatsApp Template</h3>
                            <Button size="icon" variant="ghost" onClick={handleCloseTemplateModal}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {templatesLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-muted-foreground">Loading templates...</span>
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No approved templates found</p>
                                    <p className="text-xs mt-1">Create and get templates approved in Meta Business Suite</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {templates.map((template) => (
                                        <div
                                            key={template.id}
                                            onClick={() => handleSelectTemplate(template)}
                                            className={cn(
                                                'p-3 rounded-lg border cursor-pointer transition-all',
                                                selectedTemplate?.id === template.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-sm">{template.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                            {template.status}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {template.category}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            ({template.language})
                                                        </span>
                                                    </div>
                                                </div>
                                                {selectedTemplate?.id === template.id && (
                                                    <Check className="h-5 w-5 text-primary" />
                                                )}
                                            </div>
                                            {/* Template preview */}
                                            {template.components?.find(c => c.type === 'BODY')?.text && (
                                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                                    {template.components.find(c => c.type === 'BODY')?.text}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-2 p-4 border-t">
                            <Button variant="outline" onClick={handleCloseTemplateModal}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSendTemplate}
                                disabled={!selectedTemplate || sendingTemplate}
                            >
                                {sendingTemplate ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Template
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Preview Modal */}
            {showMessagePreview && (
                <Dialog open={showMessagePreview} onOpenChange={setShowMessagePreview}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Message Preview</DialogTitle>
                        </DialogHeader>
                        <div className="bg-[#075E54] rounded-lg overflow-hidden">
                            {/* WhatsApp Header */}
                            <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                    {selectedConversation?.contact.firstName?.[0] || 'C'}
                                </div>
                                <div>
                                    <p className="text-white text-sm font-medium">
                                        {selectedConversation?.contact.firstName} {selectedConversation?.contact.lastName}
                                    </p>
                                    <p className="text-white/70 text-xs">
                                        {selectedConversation?.contact.phone || 'Contact'}
                                    </p>
                                </div>
                            </div>
                            {/* WhatsApp Chat Area */}
                            <div className="bg-[#ECE5DD] p-4 min-h-[200px]">
                                <div className="bg-white rounded-lg p-3 max-w-[85%] ml-auto shadow-sm">
                                    {attachedFile ? (
                                        <>
                                            {/* Preview attached media */}
                                            {attachedFile.file.type.startsWith('image/') && (
                                                <img
                                                    src={attachedFile.preview}
                                                    alt="Preview"
                                                    className="rounded mb-2 max-h-48 object-contain"
                                                />
                                            )}
                                            {attachedFile.file.type.startsWith('video/') && (
                                                <video
                                                    src={attachedFile.preview}
                                                    controls
                                                    className="rounded mb-2 max-h-48"
                                                />
                                            )}
                                            {!attachedFile.file.type.startsWith('image/') && !attachedFile.file.type.startsWith('video/') && (
                                                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded mb-2">
                                                    <Paperclip className="h-4 w-4" />
                                                    <span className="text-sm truncate">{attachedFile.file.name}</span>
                                                </div>
                                            )}
                                            {messageInput.trim() && (
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                    {messageInput}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                            {messageInput}
                                        </p>
                                    )}
                                    <p className="text-right text-xs text-gray-500 mt-1">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓
                                    </p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowMessagePreview(false)}>
                                Cancel
                            </Button>
                            <Button onClick={() => { handleSendMessage(); setShowMessagePreview(false); }}>
                                <Send className="mr-2 h-4 w-4" />
                                Send Message
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
