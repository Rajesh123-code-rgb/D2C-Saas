'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    RefreshCw,
    X,
    ChevronDown,
    ChevronUp,
    Bold,
    Italic,
    Underline,
    Link2,
    List,
    ListOrdered,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { inboxApi, emailApi, channelsApi } from '@/lib/api';
import { toast } from 'sonner';

// Interfaces matching API response
interface EmailChannel {
    id: string;
    name: string;
    channelType: string;
    status: string;
    credentials?: any;
}

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

interface Attachment {
    file: File;
    name: string;
    size: string;
    type: string;
}

export default function EmailInboxPage() {
    const [activeFolder, setActiveFolder] = useState('inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [threads, setThreads] = useState<EmailThread[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Email Channels
    const [emailChannels, setEmailChannels] = useState<EmailChannel[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<string>('');
    const [filterChannelId, setFilterChannelId] = useState<string>('all');

    // Compose State
    const [showCompose, setShowCompose] = useState(false);
    const [composeType, setComposeType] = useState<'new' | 'reply' | 'reply-all' | 'forward'>('new');
    const [draftSubject, setDraftSubject] = useState('');
    const [draftTo, setDraftTo] = useState('');
    const [draftCc, setDraftCc] = useState('');
    const [draftBcc, setDraftBcc] = useState('');
    const [draftBody, setDraftBody] = useState('');
    const [sending, setSending] = useState(false);
    const [showCcBcc, setShowCcBcc] = useState(false);
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    // Fetch Email Channels
    useEffect(() => {
        fetchEmailChannels();
    }, []);

    const fetchEmailChannels = async () => {
        try {
            const data = await channelsApi.getChannels();
            const emailChannels = (data as any[]).filter((c: any) => c.channelType === 'email' && c.status === 'connected');
            setEmailChannels(emailChannels);
            if (emailChannels.length > 0 && !selectedChannelId) {
                setSelectedChannelId(emailChannels[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch email channels:', error);
        }
    };

    // Fetch Threads
    useEffect(() => {
        fetchThreads();
    }, [activeFolder, filterChannelId]);

    const fetchThreads = async () => {
        setLoading(true);
        try {
            let status = undefined;
            if (activeFolder === 'inbox') status = 'open';
            if (activeFolder === 'done') status = 'resolved';

            const response = await inboxApi.getConversations({
                channelType: 'email',
                status: status as any,
                limit: 50,
                channelId: filterChannelId === 'all' ? undefined : filterChannelId
            });

            const mappedThreads: EmailThread[] = (response as any[]).map((conv: any) => ({
                id: conv.id,
                subject: conv.metadata?.subject || 'No Subject',
                participants: [conv.contact?.name || conv.contact?.email || 'Unknown'],
                lastMessage: conv.lastMessageContent || '',
                lastMessageAt: conv.lastMessageAt,
                unreadCount: conv.unreadCount || 0,
                hasAttachments: conv.metadata?.hasAttachments || false,
                folder: 'inbox',
                labels: conv.tags || [],
                channelId: conv.channelId,
                contact: conv.contact
            }));

            setThreads(mappedThreads);
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
            const mappedMessages: EmailMessage[] = (response as any[]).map((msg: any) => ({
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
                attachments: msg.metadata?.attachments || []
            })).reverse();

            setMessages(mappedMessages);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleCompose = (type: 'new' | 'reply' | 'reply-all' | 'forward', contextMessage?: EmailMessage) => {
        setComposeType(type);
        setShowCompose(true);
        setAttachments([]);
        setShowCcBcc(false);

        if (type === 'new') {
            setDraftSubject('');
            setDraftTo('');
            setDraftCc('');
            setDraftBcc('');
            setDraftBody('');
        } else if (contextMessage) {
            const originalSubject = contextMessage.metadata?.subject || '';
            const senderEmail = contextMessage.sender?.email || '';

            if (type === 'forward') {
                setDraftSubject(`Fwd: ${originalSubject}`);
                setDraftTo('');
                // Quote original message
                const quotedContent = `\n\n---------- Forwarded message ----------\nFrom: ${contextMessage.sender?.name} <${senderEmail}>\nDate: ${new Date(contextMessage.createdAt).toLocaleString()}\nSubject: ${originalSubject}\n\n${contextMessage.content}`;
                setDraftBody(quotedContent);
            } else {
                setDraftSubject(`Re: ${originalSubject.replace(/^Re: /i, '')}`);
                setDraftTo(senderEmail);
                // Quote original message for reply
                const quotedContent = `\n\nOn ${new Date(contextMessage.createdAt).toLocaleString()}, ${contextMessage.sender?.name} wrote:\n> ${contextMessage.content.replace(/\n/g, '\n> ')}`;
                setDraftBody(quotedContent);
            }
            setDraftCc('');
            setDraftBcc('');
        }
    };

    const handleAttachmentClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newAttachments: Attachment[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            newAttachments.push({
                file,
                name: file.name,
                size: formatFileSize(file.size),
                type: file.type
            });
        }
        setAttachments([...attachments, ...newAttachments]);
        e.target.value = '';
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const removeAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const applyFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const handleSend = async () => {
        if (!draftTo.trim()) {
            toast.error('Please enter a recipient email address');
            return;
        }

        const channelId = selectedChannelId || emailChannels[0]?.id;
        if (!channelId) {
            toast.error('No email channel available. Please configure one in Settings > Channels.');
            return;
        }

        setSending(true);
        try {
            const emailContent = editorRef.current?.innerHTML || draftBody;

            if (composeType === 'new' || composeType === 'forward') {
                await emailApi.send({
                    channelId: channelId,
                    to: draftTo,
                    subject: draftSubject,
                    html: emailContent,
                    // Note: Attachments would need base64 encoding - simplified for now
                });
                toast.success('Email sent successfully');
            } else {
                if (!selectedThreadId) return;
                await inboxApi.sendMessage(selectedThreadId, {
                    content: emailContent,
                    messageType: 'email',
                });
                toast.success('Reply sent');
                fetchMessages(selectedThreadId);
            }

            setShowCompose(false);
            setDraftTo('');
            setDraftCc('');
            setDraftBcc('');
            setDraftSubject('');
            setDraftBody('');
            setAttachments([]);
        } catch (error) {
            console.error('Failed to send email:', error);
            toast.error('Failed to send email');
        } finally {
            setSending(false);
        }
    };

    const selectedThread = threads.find(t => t.id === selectedThreadId);

    return (
        <div className="flex h-[calc(100vh-2rem)] gap-4">
            {/* Left Sidebar - Folders */}
            <div className="w-64 flex flex-col gap-2">
                <Button
                    className="w-full justify-start gap-2 mb-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
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
                                    ? 'bg-primary/10 text-primary-foreground'
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
                                    activeFolder === item.id ? "bg-primary/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                    {item.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Email Accounts */}
                {emailChannels.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 px-2">EMAIL ACCOUNTS</h4>
                        <div className="space-y-1">
                            {emailChannels.map((channel) => (
                                <div
                                    key={channel.id}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors",
                                        selectedChannelId === channel.id
                                            ? "bg-primary/10 text-primary-foreground"
                                            : "text-muted-foreground hover:bg-muted"
                                    )}
                                    onClick={() => setSelectedChannelId(channel.id)}
                                >
                                    <Mail className="h-4 w-4" />
                                    <span className="truncate">{channel.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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

                    {/* Account Filter & Search */}
                    <div className="space-y-2">
                        <Select value={filterChannelId} onValueChange={setFilterChannelId}>
                            <SelectTrigger className="h-8 w-full border-muted bg-muted/20">
                                <SelectValue placeholder="All Accounts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Accounts</SelectItem>
                                {emailChannels.map((channel) => (
                                    <SelectItem key={channel.id} value={channel.id}>
                                        {channel.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {emailChannels.length === 0 && (
                            <div className="text-xs text-center p-2 bg-yellow-500/10 text-yellow-600 rounded-md border border-yellow-500/20">
                                No email accounts connected.
                                <a href="/channels" className="underline ml-1 font-medium">Connect now</a>
                            </div>
                        )}

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
                                        selectedThreadId === thread.id && 'bg-primary/5 hover:bg-primary/10'
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
                                    {selectedThread?.subject}
                                </h2>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" title="Reply" onClick={() => handleCompose('reply', messages[messages.length - 1])}>
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
                                                            {msg.direction === 'outbound' ? 'to ' + (selectedThread?.participants.join(', ') || 'Recipient') : 'to Me'}
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

                        {/* Quick Reply Box */}
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
                    <Card className="w-[650px] h-[700px] shadow-2xl flex flex-col pointer-events-auto border-t-4 border-t-blue-600">
                        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                            <h3 className="font-semibold text-sm">
                                {composeType === 'new' ? 'New Message' :
                                    composeType === 'reply' ? 'Reply' :
                                        composeType === 'forward' ? 'Forward' : 'Reply All'}
                            </h3>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowCompose(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                            {/* Channel Selector */}
                            {emailChannels.length > 1 && (
                                <div className="flex items-center gap-2 pb-2 border-b">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">From:</Label>
                                    <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                                        <SelectTrigger className="h-8 border-0 shadow-none">
                                            <SelectValue placeholder="Select account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {emailChannels.map((channel) => (
                                                <SelectItem key={channel.id} value={channel.id}>
                                                    {channel.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* To Field */}
                            <div className="flex items-center gap-2 border-b pb-2">
                                <Label className="text-xs text-muted-foreground w-8">To:</Label>
                                <Input
                                    placeholder="recipient@example.com"
                                    value={draftTo}
                                    onChange={(e) => setDraftTo(e.target.value)}
                                    className="border-0 shadow-none h-8 px-0 focus-visible:ring-0"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-muted-foreground h-6"
                                    onClick={() => setShowCcBcc(!showCcBcc)}
                                >
                                    {showCcBcc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    Cc/Bcc
                                </Button>
                            </div>

                            {/* CC/BCC Fields */}
                            {showCcBcc && (
                                <>
                                    <div className="flex items-center gap-2 border-b pb-2">
                                        <Label className="text-xs text-muted-foreground w-8">Cc:</Label>
                                        <Input
                                            placeholder="cc@example.com"
                                            value={draftCc}
                                            onChange={(e) => setDraftCc(e.target.value)}
                                            className="border-0 shadow-none h-8 px-0 focus-visible:ring-0"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 border-b pb-2">
                                        <Label className="text-xs text-muted-foreground w-8">Bcc:</Label>
                                        <Input
                                            placeholder="bcc@example.com"
                                            value={draftBcc}
                                            onChange={(e) => setDraftBcc(e.target.value)}
                                            className="border-0 shadow-none h-8 px-0 focus-visible:ring-0"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Subject Field */}
                            <div className="flex items-center gap-2 border-b pb-2">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">Subject:</Label>
                                <Input
                                    placeholder="Email subject"
                                    value={draftSubject}
                                    onChange={(e) => setDraftSubject(e.target.value)}
                                    className="border-0 shadow-none h-8 px-0 focus-visible:ring-0"
                                />
                            </div>

                            {/* Rich Text Toolbar */}
                            <div className="flex items-center gap-1 p-2 bg-muted/30 rounded-md">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('bold')}>
                                    <Bold className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('italic')}>
                                    <Italic className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('underline')}>
                                    <Underline className="h-4 w-4" />
                                </Button>
                                <div className="w-px h-5 bg-border mx-1" />
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('insertUnorderedList')}>
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('insertOrderedList')}>
                                    <ListOrdered className="h-4 w-4" />
                                </Button>
                                <div className="w-px h-5 bg-border mx-1" />
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                    const url = prompt('Enter link URL:');
                                    if (url) applyFormat('createLink', url);
                                }}>
                                    <Link2 className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Rich Text Editor */}
                            <div
                                ref={editorRef}
                                contentEditable
                                className="min-h-[200px] max-h-[300px] overflow-y-auto p-3 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                onInput={(e) => setDraftBody(e.currentTarget.innerHTML)}
                                dangerouslySetInnerHTML={{ __html: draftBody }}
                            />

                            {/* Attachments */}
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {attachments.map((att, index) => (
                                        <div key={index} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm">
                                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                                            <span className="truncate max-w-[150px]">{att.name}</span>
                                            <span className="text-xs text-muted-foreground">({att.size})</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5"
                                                onClick={() => removeAttachment(index)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
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
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    multiple
                                    className="hidden"
                                />
                                <Button variant="ghost" size="icon" onClick={handleAttachmentClick} title="Attach files">
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowCompose(false)} title="Discard">
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
