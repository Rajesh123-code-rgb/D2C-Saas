'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Mail,
    Search,
    Plus,
    Inbox,
    Send,
    File,
    Trash2,
    Star,
    MoreVertical,
    Reply,
    ReplyAll,
    Forward,
    Paperclip,
    Loader2,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { inboxApi, emailApi } from '@/lib/api';
import { toast } from 'sonner';

// Interfaces matching API response
interface EmailThread {
    id: string;
    subject: string;
    participants: string[];
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    hasAttachments: boolean;
    folder: 'inbox' | 'sent' | 'drafts' | 'trash';
    labels: string[];
    channelId: string;
    contact?: {
        id: string;
        name: string;
        email: string;
    };
}

interface EmailMessage {
    id: string;
    content: string;
    direction: 'inbound' | 'outbound';
    messageType: string;
    metadata?: any;
    status: string;
    createdAt: string;
    sender?: {
        name: string;
        email?: string;
    };
    attachments?: { name: string; size: string; type: string }[];
}

export default function EmailInboxPage() {
    const [activeFolder, setActiveFolder] = useState('inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [threads, setThreads] = useState<EmailThread[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Compose State
    const [showCompose, setShowCompose] = useState(false);
    const [composeType, setComposeType] = useState<'new' | 'reply' | 'reply-all' | 'forward'>('new');
    const [draftSubject, setDraftSubject] = useState('');
    const [draftTo, setDraftTo] = useState('');
    const [draftBody, setDraftBody] = useState('');
    const [sending, setSending] = useState(false);

    // Fetch Threads
    useEffect(() => {
        fetchThreads();
    }, [activeFolder]);

    const fetchThreads = async () => {
        setLoading(true);
        try {
            // Map folder to status/filters
            let status = undefined;
            if (activeFolder === 'inbox') status = 'open';
            if (activeFolder === 'done') status = 'resolved';

            // Fetch conversations from Inbox API filtered by channelType=email
            const response = await inboxApi.getConversations({
                channelType: 'email',
                status: status as any,
                limit: 50
            });

            // Map API response to EmailThread interface
            const mappedThreads: EmailThread[] = response.map((conv: any) => ({
                id: conv.id,
                subject: conv.metadata?.subject || 'No Subject',
                participants: [conv.contact?.name || conv.contact?.email || 'Unknown'],
                lastMessage: conv.lastMessageContent || '',
                lastMessageAt: conv.lastMessageAt,
                unreadCount: conv.unreadCount || 0,
                hasAttachments: false, // Todo: check metadata
                folder: 'inbox', // Todo: map based on logic
                labels: conv.tags || [],
                channelId: conv.channelId,
                contact: conv.contact
            }));

            setThreads(mappedThreads);

            // Auto select if none selected
            if (mappedThreads.length > 0 && !selectedThreadId) {
                setSelectedThreadId(mappedThreads[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch threads:', error);
            toast.error('Failed to load email threads');
        } finally {
            setLoading(false);
        }
    };

    // Fetch Messages
    useEffect(() => {
        if (!selectedThreadId) return;
        fetchMessages(selectedThreadId);
    }, [selectedThreadId]);

    const fetchMessages = async (threadId: string) => {
        setLoadingMessages(true);
        try {
            const response = await inboxApi.getMessages(threadId);

            // Map API response
            const mappedMessages: EmailMessage[] = response.map((msg: any) => ({
                id: msg.id,
                content: msg.content,
                direction: msg.direction,
                messageType: msg.messageType,
                metadata: msg.metadata,
                status: msg.status,
                createdAt: msg.createdAt,
                sender: {
                    name: msg.direction === 'outbound' ? 'Me' : (threads.find(t => t.id === threadId)?.contact?.name || 'Unknown'),
                    email: msg.metadata?.from || ''
                },
                attachments: [] // Todo: map attachments if valid
            })).reverse(); // Oldest first

            setMessages(mappedMessages);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            // toast.error('Failed to load messages');
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleCompose = (type: 'new' | 'reply' | 'reply-all' | 'forward', contextMessage?: EmailMessage) => {
        setComposeType(type);
        setShowCompose(true);

        if (type === 'new') {
            setDraftSubject('');
            setDraftTo('');
            setDraftBody('');
        } else if (contextMessage) {
            setDraftSubject(type === 'forward' ? `Fwd: ${contextMessage.metadata?.subject || contextMessage.subject || ''}` : `Re: ${contextMessage.metadata?.subject || contextMessage.subject || ''}`);
            setDraftTo(type === 'reply' ? (contextMessage.sender?.email || '') : '');
            // Pre-fill body with quote if needed
            setDraftBody('');
        }
    };

    const handleSend = async () => {
        setSending(true);
        try {
            if (composeType === 'new') {
                const channelId = threads[0]?.channelId;
                if (!channelId) {
                    toast.error('No email channel available to send from.');
                    return;
                }

                await emailApi.send({
                    channelId: channelId,
                    to: draftTo,
                    subject: draftSubject,
                    html: draftBody
                });
                toast.success('Email sent successfully');
            } else {
                if (!selectedThreadId) return;
                await inboxApi.sendMessage(selectedThreadId, {
                    content: draftBody,
                    messageType: 'email',
                });
                toast.success('Reply sent');
                fetchMessages(selectedThreadId);
            }
            setShowCompose(false);
        } catch (error) {
            console.error('Failed to send email:', error);
            toast.error('Failed to send email');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-2rem)] gap-4">
            {/* Left Sidebar - Folders */}
            <div className="w-64 flex flex-col gap-2">
                <Button
                    className="w-full justify-start gap-2 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md hover:shadow-lg transition-all"
                    size="lg"
                    onClick={() => handleCompose('new')}
                >
                    <Plus className="h-5 w-5" />
                    Compose
                </Button>

                <nav className="space-y-1">
                    {[
                        { id: 'inbox', icon: Inbox, label: 'Inbox', count: threads.filter(t => t.unreadCount > 0).length },
                        { id: 'sent', icon: Send, label: 'Sent', count: 0 },
                        { id: 'drafts', icon: File, label: 'Drafts', count: 0 },
                        { id: 'starred', icon: Star, label: 'Starred', count: 0 },
                        { id: 'trash', icon: Trash2, label: 'Trash', count: 0 },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveFolder(item.id)}
                            className={cn(
                                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                activeFolder === item.id
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </div>
                            {item.count > 0 && (
                                <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    activeFolder === item.id ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"
                                )}>
                                    {item.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Middle Column - Thread List */}
            <div className="w-80 border-r flex flex-col bg-card rounded-lg border shadow-sm">
                <div className="p-4 border-b space-y-3">
                    <h2 className="font-semibold text-lg flex items-center justify-between">
                        {activeFolder.charAt(0).toUpperCase() + activeFolder.slice(1)}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchThreads}>
                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search emails..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="divide-y">
                            {threads.map((thread) => (
                                <button
                                    key={thread.id}
                                    onClick={() => setSelectedThreadId(thread.id)}
                                    className={cn(
                                        'w-full text-left p-4 hover:bg-muted/50 transition-colors',
                                        selectedThreadId === thread.id && 'bg-blue-50/50 hover:bg-blue-50'
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={cn(
                                            "font-medium truncate max-w-[140px]",
                                            thread.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                            {thread.participants.join(', ')}
                                        </span>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                            {new Date(thread.lastMessageAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className={cn(
                                        "text-sm mb-1 truncate",
                                        thread.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                                    )}>
                                        {thread.subject}
                                    </h4>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {thread.lastMessage}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {thread.hasAttachments && (
                                            <Badge variant="outline" className="h-5 px-1 bg-muted">
                                                <Paperclip className="h-3 w-3" />
                                            </Badge>
                                        )}
                                        {thread.labels.map(label => (
                                            <Badge key={label} variant="secondary" className="h-5 text-[10px] px-1.5">
                                                {label}
                                            </Badge>
                                        ))}
                                    </div>
                                </button>
                            ))}
                            {threads.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No emails found
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column - Thread View */}
            <div className="flex-1 flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden">
                {selectedThreadId ? (
                    <>
                        {/* Thread Header */}
                        <div className="p-4 border-b flex items-center justify-between bg-card z-10">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-semibold truncate max-w-2xl">
                                    {threads.find(t => t.id === selectedThreadId)?.subject}
                                </h2>
                                <div className="flex gap-1">
                                    {threads.find(t => t.id === selectedThreadId)?.labels.map(label => (
                                        <Badge key={label} variant="outline" className="text-xs">
                                            {label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" title="Reply">
                                    <Reply className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <Card key={msg.id} className={cn(
                                        "border-none shadow-sm",
                                        idx === messages.length - 1 ? "ring-2 ring-blue-100 dark:ring-blue-900/20" : "bg-muted/20"
                                    )}>
                                        <div className="p-4">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                                                        msg.direction === 'outbound'
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-orange-100 text-orange-700"
                                                    )}>
                                                        {msg.sender?.name.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-sm">{msg.sender?.name || 'Unknown'}</span>
                                                            <span className="text-xs text-muted-foreground">&lt;{msg.sender?.email || ''}&gt;</span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {msg.direction === 'outbound' ? 'to ' + (threads.find(t => t.id === selectedThreadId)?.participants.join(', ') || 'Recipient') : 'to Me'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(msg.createdAt).toLocaleString()}
                                                </span>
                                            </div>

                                            <div
                                                className="prose prose-sm max-w-none text-foreground"
                                                dangerouslySetInnerHTML={{ __html: msg.content }}
                                            />

                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                                                    {msg.attachments.map((att, i) => (
                                                        <div key={i} className="flex items-center gap-2 p-2 rounded-md border bg-background hover:bg-muted transition-colors cursor-pointer">
                                                            <File className="h-4 w-4 text-blue-600" />
                                                            <div className="text-xs">
                                                                <p className="font-medium">{att.name}</p>
                                                                <p className="text-muted-foreground">{att.size}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))
                            )}
                            {messages.length === 0 && !loadingMessages && (
                                <div className="text-center p-8 text-muted-foreground text-sm">
                                    No messages in this thread
                                </div>
                            )}
                        </div>

                        {/* Recent Reply Box (Quick Action) */}
                        <div className="p-4 bg-muted/10 border-t">
                            {!showCompose && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="h-12 justify-start text-muted-foreground px-4 flex-1"
                                        onClick={() => handleCompose('reply', messages[messages.length - 1])}
                                    >
                                        <Reply className="mr-2 h-4 w-4" />
                                        Reply to {messages[messages.length - 1]?.sender?.name || 'sender'}...
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-12 w-12 px-0"
                                        onClick={() => handleCompose('reply-all', messages[messages.length - 1])}
                                        title="Reply All"
                                    >
                                        <ReplyAll className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-12 w-12 px-0"
                                        onClick={() => handleCompose('forward', messages[messages.length - 1])}
                                        title="Forward"
                                    >
                                        <Forward className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <Mail className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Select an email to read</p>
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
                    <Card className="w-[600px] h-[600px] shadow-2xl flex flex-col pointer-events-auto border-t-4 border-t-blue-600">
                        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                            <h3 className="font-semibold text-sm">
                                {composeType === 'new' ? 'New Message' :
                                    composeType === 'reply' ? 'Reply' :
                                        composeType === 'forward' ? 'Forward' : 'Reply All'}
                            </h3>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowCompose(false)}>
                                &times;
                            </Button>
                        </div>
                        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                            <div className="space-y-2">
                                <Input
                                    placeholder="To"
                                    value={draftTo}
                                    onChange={(e) => setDraftTo(e.target.value)}
                                    className="border-0 border-b rounded-none px-0 focus-visible:ring-0"
                                />
                                <div className="flex items-center justify-between border-b pb-1">
                                    <Input
                                        placeholder="Subject"
                                        value={draftSubject}
                                        onChange={(e) => setDraftSubject(e.target.value)}
                                        className="border-0 rounded-none px-0 focus-visible:ring-0 flex-1"
                                    />
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                        <button className="hover:text-foreground">Cc</button>
                                        <button className="hover:text-foreground">Bcc</button>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[300px]">
                                <textarea
                                    className="w-full h-full resize-none outline-none text-sm"
                                    placeholder="Write your message..."
                                    value={draftBody}
                                    onChange={(e) => setDraftBody(e.target.value)}
                                ></textarea>
                            </div>
                        </div>
                        <div className="p-3 border-t flex items-center justify-between bg-muted/10">
                            <div className="flex gap-2">
                                <Button
                                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                    onClick={handleSend}
                                    disabled={sending}
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    Send
                                </Button>
                                <Button variant="ghost" size="icon">
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowCompose(false)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
