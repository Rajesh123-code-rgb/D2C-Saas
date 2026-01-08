'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Save,
    RefreshCw,
    Loader2,
    Shield,
    CheckCircle,
    Plus,
    X,
    Mail,
    FileCode,
    Globe
} from 'lucide-react';
import { CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { governanceApi, EmailTemplatePolicy } from '@/lib/admin/api';

const initialPolicy: EmailTemplatePolicy = {
    id: 'temp',
    isGlobal: true,
    maxDailyEmails: { free: 100, starter: 1000, pro: 10000, enterprise: 100000 },
    prohibitedKeywords: ['lottery', 'winner', 'wire transfer'],
    requireDomainVerification: true,
    allowedAttachmentTypes: ['application/pdf', 'image/png', 'image/jpeg'],
    maxAttachmentSize: 10485760,
    updatedAt: new Date().toISOString(),
};

export function EmailGovernance() {
    const [policy, setPolicy] = useState<EmailTemplatePolicy>(initialPolicy);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [keywordInput, setKeywordInput] = useState('');
    const [fileTypeInput, setFileTypeInput] = useState('');

    const fetchPolicy = useCallback(async () => {
        setLoading(true);
        try {
            const data = await governanceApi.getEmailPolicy();
            // Merge with initial to ensure all fields exist
            setPolicy({ ...initialPolicy, ...data });
        } catch (err) {
            console.error('Failed to fetch policy:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPolicy();
    }, [fetchPolicy]);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await governanceApi.updateEmailPolicy(policy);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to update policy:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleAddKeyword = () => {
        if (!keywordInput.trim()) return;
        if (policy.prohibitedKeywords.includes(keywordInput.trim().toLowerCase())) {
            setKeywordInput('');
            return;
        }

        setPolicy(prev => ({
            ...prev,
            prohibitedKeywords: [...prev.prohibitedKeywords, keywordInput.trim().toLowerCase()]
        }));
        setKeywordInput('');
    };

    const handleRemoveKeyword = (keyword: string) => {
        setPolicy(prev => ({
            ...prev,
            prohibitedKeywords: prev.prohibitedKeywords.filter(k => k !== keyword)
        }));
    };

    const handleAddFileType = () => {
        if (!fileTypeInput.trim()) return;
        if (policy.allowedAttachmentTypes.includes(fileTypeInput.trim().toLowerCase())) {
            setFileTypeInput('');
            return;
        }

        setPolicy(prev => ({
            ...prev,
            allowedAttachmentTypes: [...prev.allowedAttachmentTypes, fileTypeInput.trim().toLowerCase()]
        }));
        setFileTypeInput('');
    };

    const handleRemoveFileType = (type: string) => {
        setPolicy(prev => ({
            ...prev,
            allowedAttachmentTypes: prev.allowedAttachmentTypes.filter(t => t !== type)
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Email Governance</h2>
                    <p className="text-neutral-400 mt-1">
                        Configure global email policies, limits, and restrictions.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={fetchPolicy}
                        disabled={loading || saving}
                        className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="min-w-[140px] bg-neutral-700 hover:bg-neutral-600 shadow-lg shadow-black/30"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : saved ? (
                            <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Saved
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                {/* Content Safety */}
                <GlassCard>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Shield className="h-5 w-5 text-white" />
                            Content Safety
                        </CardTitle>
                        <CardDescription className="text-neutral-400">
                            Configure prohibited content and safety checks.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-neutral-200">Prohibited Keywords</Label>
                                <span className="text-xs text-white bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700">
                                    Emails containing these words will be flagged
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={keywordInput}
                                    onChange={(e) => setKeywordInput(e.target.value)}
                                    placeholder="Add keyword (e.g., lottery)"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                                    className="bg-white/5 border-white/10 text-white focus:border-white"
                                />
                                <Button onClick={handleAddKeyword} size="icon" className="bg-white/5 hover:bg-white/10 border border-white/10">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-black/20 border border-white/5 min-h-[60px]">
                                {policy.prohibitedKeywords.length === 0 && (
                                    <p className="text-sm text-neutral-500 italic">No prohibited keywords configured</p>
                                )}
                                {policy.prohibitedKeywords.map((keyword) => (
                                    <Badge key={keyword} variant="secondary" className="pl-3 pr-1 py-1 bg-neutral-800 text-neutral-400 border border-neutral-600/20 hover:bg-red-500/20">
                                        {keyword}
                                        <button
                                            onClick={() => handleRemoveKeyword(keyword)}
                                            className="ml-2 hover:bg-red-500/20 rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-6">
                            <div className="space-y-0.5">
                                <Label className="flex items-center gap-2 text-white">
                                    <Globe className="h-4 w-4 text-white" />
                                    Domain Verification
                                </Label>
                                <p className="text-sm text-neutral-400">
                                    Require senders to verify their domains before sending
                                </p>
                            </div>
                            <Switch
                                checked={policy.requireDomainVerification}
                                onCheckedChange={(checked) => setPolicy(prev => ({ ...prev, requireDomainVerification: checked }))}
                            />
                        </div>
                    </CardContent>
                </GlassCard>

                {/* Technical Limits */}
                <GlassCard>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <FileCode className="h-5 w-5 text-white" />
                            Technical Limits
                        </CardTitle>
                        <CardDescription className="text-neutral-400">
                            Set attachment and size restrictions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <Label className="text-neutral-200">Max Attachment Size (Bytes)</Label>
                                <p className="text-xs text-white font-mono">
                                    {(policy.maxAttachmentSize / (1024 * 1024)).toFixed(2)} MB
                                </p>
                            </div>
                            <Input
                                type="number"
                                value={policy.maxAttachmentSize}
                                onChange={(e) => setPolicy(prev => ({ ...prev, maxAttachmentSize: parseInt(e.target.value) }))}
                                className="bg-white/5 border-white/10 text-white focus:border-white"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-neutral-200">Allowed Attachment Types</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={fileTypeInput}
                                    onChange={(e) => setFileTypeInput(e.target.value)}
                                    placeholder="Add MIME type (e.g., application/pdf)"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddFileType()}
                                    className="bg-white/5 border-white/10 text-white focus:border-white"
                                />
                                <Button onClick={handleAddFileType} size="icon" className="bg-white/5 hover:bg-white/10 border border-white/10">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-black/20 border border-white/5 min-h-[60px]">
                                {policy.allowedAttachmentTypes.map((type) => (
                                    <Badge key={type} variant="outline" className="pl-3 pr-1 py-1 border-white/10 text-neutral-300 hover:bg-white/5">
                                        {type}
                                        <button
                                            onClick={() => handleRemoveFileType(type)}
                                            className="ml-2 hover:bg-white/10 rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </GlassCard>

                {/* Sending Limits */}
                <GlassCard>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Mail className="h-5 w-5 text-neutral-300" />
                            Daily Sending Limits
                        </CardTitle>
                        <CardDescription className="text-neutral-400">
                            Set maximum daily emails per plan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {Object.entries(policy.maxDailyEmails).map(([plan, limit]) => (
                                <div key={plan} className="space-y-2">
                                    <Label className="capitalize text-neutral-300">{plan}</Label>
                                    <Input
                                        type="number"
                                        value={limit}
                                        onChange={(e) => setPolicy(prev => ({
                                            ...prev,
                                            maxDailyEmails: {
                                                ...prev.maxDailyEmails,
                                                [plan]: parseInt(e.target.value)
                                            }
                                        }))}
                                        className="bg-white/5 border-white/10 text-white focus:border-white"
                                    />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </GlassCard>
            </div>
        </div>
    );
}
