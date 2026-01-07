import { X, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TemplatePreviewModalProps {
    type: 'whatsapp' | 'email';
    template: any;
    onClose: () => void;
}

export function TemplatePreviewModal({
    type,
    template,
    onClose,
}: TemplatePreviewModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-lg max-h-[90vh] flex flex-col">
                <CardHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <CardTitle>Template Preview</CardTitle>
                        <Button size="icon" variant="ghost" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="overflow-y-auto flex-1 p-4">
                    {type === 'whatsapp' ? (
                        /* WhatsApp Preview */
                        <div className="bg-[#075E54] rounded-lg overflow-hidden">
                            <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                    B
                                </div>
                                <div>
                                    <p className="text-white text-sm font-medium">Your Business</p>
                                    <p className="text-white/70 text-xs">Business Account</p>
                                </div>
                            </div>
                            <div className="bg-[#ECE5DD] p-4 min-h-[200px]">
                                <div className="bg-white rounded-lg p-3 max-w-[90%] shadow-sm">
                                    {/* Header */}
                                    {template.components?.find((c: any) => c.type === 'HEADER') && (
                                        <p className="font-semibold text-sm mb-1">
                                            {template.components.find((c: any) => c.type === 'HEADER').text}
                                        </p>
                                    )}
                                    {/* Body */}
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                        {template.components?.find((c: any) => c.type === 'BODY')?.text || template.bodyText || 'Template content'}
                                    </p>
                                    {/* Footer */}
                                    {template.components?.find((c: any) => c.type === 'FOOTER') && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            {template.components.find((c: any) => c.type === 'FOOTER').text}
                                        </p>
                                    )}
                                    <p className="text-right text-xs text-gray-500 mt-1">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                                    </p>
                                </div>
                                {/* Buttons */}
                                {template.components?.find((c: any) => c.type === 'BUTTONS') && (
                                    <div className="mt-2 space-y-1">
                                        {template.components.find((c: any) => c.type === 'BUTTONS').buttons?.map((btn: any, i: number) => (
                                            <button key={i} className="w-full bg-white rounded-lg py-2 text-sm text-blue-500 shadow-sm">
                                                {btn.text}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Email Preview */
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 border-b">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Mail className="h-4 w-4" />
                                    <span>Email Preview</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-primary font-bold">Y</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">Your Business</p>
                                        <p className="text-xs text-muted-foreground">to: customer@example.com</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date().toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-lg mb-3">{template.subject}</h3>
                                {/* Use htmlContent for library templates, body for user templates */}
                                <div
                                    className="text-sm text-gray-600 bg-gray-50 p-4 rounded min-h-[300px]"
                                    dangerouslySetInnerHTML={{ __html: template.htmlContent || template.body || '' }}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
