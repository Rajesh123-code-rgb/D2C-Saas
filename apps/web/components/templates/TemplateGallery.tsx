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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                    <TemplateCard
                        key={template.id}
                        type={type}
                        template={template}
                        selected={selectedId === template.id}
                        onSelect={() => onSelect?.(template)}
                    />
                ))}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No templates match your search</p>
                </div>
            )}
        </div>
    );
}

interface TemplateCardProps {
    type: 'automation' | 'whatsapp' | 'email';
    template: any;
    selected?: boolean;
    onSelect?: () => void;
}

function TemplateCard({ type, template, selected, onSelect }: TemplateCardProps) {
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

    return (
        <Card
            className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selected && 'ring-2 ring-primary'
            )}
            onClick={onSelect}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            'p-2 rounded-lg',
                            type === 'automation' && 'bg-purple-100',
                            type === 'whatsapp' && 'bg-green-100',
                            type === 'email' && 'bg-blue-100'
                        )}>
                            {type === 'automation' && <Zap className="h-4 w-4 text-purple-600" />}
                            {type === 'whatsapp' && <MessageSquare className="h-4 w-4 text-green-600" />}
                            {type === 'email' && <Mail className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div>
                            <CardTitle className="text-base">
                                {template.displayName || template.name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {template.usageCount || 0} uses
                            </CardDescription>
                        </div>
                    </div>
                    <Badge className={getCategoryColor(template.category)}>
                        {template.category}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Type-specific preview */}
                {type === 'automation' && (
                    <div className="text-sm text-muted-foreground line-clamp-2">
                        {template.description || `${template.nodes?.length || 0} step workflow`}
                    </div>
                )}

                {type === 'whatsapp' && (
                    <div className="p-3 rounded-lg bg-muted/50 text-sm line-clamp-2">
                        {template.bodyText || 'No preview'}
                    </div>
                )}

                {type === 'email' && (
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Subject:</p>
                        <p className="text-sm font-medium truncate">{template.subject}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={onSelect}>
                        <Copy className="h-3 w-3 mr-1" />
                        Use Template
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default TemplateGallery;
