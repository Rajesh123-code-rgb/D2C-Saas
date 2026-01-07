'use client';

import { useState, useEffect } from 'react';
import {
    Zap,
    MessageSquare,
    Mail,
    Sparkles,
    Search,
    Loader2,
    Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { templateLibrary } from '@/lib/api';

import { TemplatePreviewModal } from '@/components/templates/TemplatePreviewModal';
import {
    MoreHorizontal,
    Eye,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TemplateGalleryProps {
    type: 'automation' | 'whatsapp' | 'email';
    onSelect?: (template: any) => void;
    selectedId?: string;
}

const typeConfig = {
    automation: {
        icon: Zap,
        title: 'Automation Templates',
        description: 'Pre-built automation workflows created by admins',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
    },
    whatsapp: {
        icon: MessageSquare,
        title: 'WhatsApp Templates',
        description: 'Ready-to-use WhatsApp message templates',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
    },
    email: {
        icon: Mail,
        title: 'Email Templates',
        description: 'Professional email templates for campaigns',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
    },
};

export function TemplateGallery({ type, onSelect, selectedId }: TemplateGalleryProps) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [previewTemplate, setPreviewTemplate] = useState<any>(null);

    const config = typeConfig[type];
    const Icon = config.icon;

    useEffect(() => {
        fetchTemplates();
    }, [type]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            let data: any[] = [];
            switch (type) {
                case 'automation':
                    data = await templateLibrary.getAutomationTemplates();
                    break;
                case 'whatsapp':
                    data = await templateLibrary.getWhatsAppTemplates();
                    break;
                case 'email':
                    data = await templateLibrary.getEmailTemplates();
                    break;
            }
            setTemplates(data || []);
        } catch (error) {
            console.error('Error fetching templates:', error);
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    const categories = ['all', ...new Set(templates.map(t => t.category))];

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = (t.name || t.displayName || '')
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (templates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className={cn('p-4 rounded-full mb-4', config.bgColor)}>
                    <Sparkles className={cn('h-8 w-8', config.color)} />
                </div>
                <h3 className="font-semibold text-lg">No Templates Available</h3>
                <p className="text-muted-foreground text-sm mt-1">
                    Admin templates will appear here once created
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', config.bgColor)}>
                    <Icon className={cn('h-5 w-5', config.color)} />
                </div>
                <div>
                    <h3 className="font-semibold">{config.title}</h3>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                    {templates.length} templates
                </Badge>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search templates..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-1">
                    {categories.slice(0, 5).map((cat) => (
                        <Button
                            key={cat}
                            variant={selectedCategory === cat ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(cat)}
                            className="capitalize"
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Templates Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                    <TemplateCard
                        key={template.id}
                        type={type}
                        template={template}
                        selected={selectedId === template.id}
                        onSelect={() => onSelect?.(template)}
                        onPreview={() => setPreviewTemplate(template)}
                    />
                ))}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No templates match your search</p>
                </div>
            )}

            {/* Preview Modal */}
            {previewTemplate && (
                <TemplatePreviewModal
                    type={type === 'automation' ? 'email' : type as 'email' | 'whatsapp'} // Automation uses email preview for now or we disable preview
                    template={previewTemplate}
                    onClose={() => setPreviewTemplate(null)}
                />
            )}
        </div>
    );
}

interface TemplateCardProps {
    type: 'automation' | 'whatsapp' | 'email';
    template: any;
    selected?: boolean;
    onSelect?: () => void;
    onPreview?: () => void;
}

function TemplateCard({ type, template, selected, onSelect, onPreview }: TemplateCardProps) {
    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            welcome: 'bg-green-100 text-green-700',
            cart: 'bg-orange-100 text-orange-700',
            nurture: 'bg-pink-100 text-pink-700',
            support: 'bg-cyan-100 text-cyan-700',
            notification: 'bg-amber-100 text-amber-700',
            MARKETING: 'bg-purple-100 text-purple-700',
            UTILITY: 'bg-blue-100 text-blue-700',
            AUTHENTICATION: 'bg-slate-100 text-slate-700',
            newsletter: 'bg-indigo-100 text-indigo-700',
            promotional: 'bg-rose-100 text-rose-700',
            transactional: 'bg-teal-100 text-teal-700',
        };
        return colors[category] || 'bg-gray-100 text-gray-700';
    };

    // Render HTML Thumbnail for Email
    const renderThumbnail = () => {
        if (type === 'email' && (template.htmlContent || template.body)) {
            return (
                <div className="w-full h-full relative overflow-hidden bg-white group-hover:bg-gray-50 transition-colors">
                    <div
                        className="absolute top-0 left-0 origin-top-left pointer-events-none flex items-start justify-center"
                        style={{
                            width: '250%',
                            height: '250%',
                            transform: 'scale(0.4)',
                        }}
                        dangerouslySetInnerHTML={{ __html: template.htmlContent || template.body }}
                    />
                    {/* Overlay to prevent interaction */}
                    <div className="absolute inset-0 bg-transparent" />
                </div>
            );
        } else if (type === 'whatsapp') {
            return (
                <div className="h-full bg-[#ECE5DD] p-4 text-[10px] overflow-hidden relative">
                    <div className="bg-white rounded p-2 shadow-sm max-w-[90%]">
                        <p className="line-clamp-6 text-gray-800 whitespace-pre-wrap">
                            {template.bodyText || template.components?.find((c: any) => c.type === 'BODY')?.text || 'No content'}
                        </p>
                    </div>
                </div>
            )
        }

        // Fallback for automation or empty email
        return (
            <div className={cn(
                'w-full h-full flex items-center justify-center',
                type === 'automation' ? 'bg-purple-50' : 'bg-gray-50'
            )}>
                {type === 'automation' ? (
                    <Zap className="h-12 w-12 text-purple-200" />
                ) : (
                    <Mail className="h-12 w-12 text-gray-200" />
                )}
            </div>
        );
    };

    return (
        <Card className="group overflow-hidden border transition-all hover:shadow-lg hover:border-primary/20">
            {/* Thumbnail Area */}
            <div className="aspect-[3/4] relative border-b bg-gray-50">
                {renderThumbnail()}

                {/* Hover Actions */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-center gap-2 pt-12 items-end">
                    <Button size="sm" variant="secondary" className="shadow-lg font-medium" onClick={onPreview}>
                        Preview
                    </Button>
                    <Button size="sm" className="shadow-lg font-medium" onClick={onSelect}>
                        Use Template
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-base line-clamp-1" title={template.displayName || template.name}>
                        {template.displayName || template.name}
                    </h3>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-6 w-6 p-0 -mr-2">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onPreview}>
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onSelect}>
                                <Copy className="mr-2 h-4 w-4" />
                                Use Template
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{template.category}</span>
                </div>

                {/* Description/Subject if available */}
                {type === 'email' && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-1 truncate">
                        {template.subject}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

export default TemplateGallery;
