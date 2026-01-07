'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Code, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-md" />,
});

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    readOnly?: boolean;
    height?: string;
    defaultView?: 'visual' | 'source';
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = 'Start typing...',
    readOnly = false,
    height = '300px',
    defaultView = 'visual',
}: RichTextEditorProps) {
    const [viewSource, setViewSource] = useState(defaultView === 'source');

    const modules = {
        toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            ['link', 'image'],
            ['clean'],
        ],
    };

    const formats = [
        'header',
        'bold',
        'italic',
        'underline',
        'strike',
        'list',
        'bullet',
        'color',
        'background',
        'align',
        'link',
        'image',
    ];

    return (
        <div className="rich-text-editor relative">
            <div className="absolute top-0 right-0 z-10 p-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewSource(!viewSource)}
                    className="h-8 w-8 p-0 bg-white/50 hover:bg-white"
                    title={viewSource ? "Switch to Visual Editor" : "Switch to HTML Source"}
                    type="button"
                >
                    {viewSource ? <Eye className="h-4 w-4" /> : <Code className="h-4 w-4" />}
                </Button>
            </div>

            {viewSource ? (
                <textarea
                    className="w-full p-4 font-mono text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ height, minHeight: height }}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Enter HTML source code..."
                    readOnly={readOnly}
                />
            ) : (
                <ReactQuill
                    theme="snow"
                    value={value}
                    onChange={onChange}
                    modules={modules}
                    formats={formats}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    style={{ height }}
                />
            )}

            <style jsx global>{`
                .rich-text-editor .ql-container {
                    min-height: ${height};
                    font-size: 14px;
                    font-family: inherit;
                }
                .rich-text-editor .ql-editor {
                    min-height: calc(${height} - 42px);
                }
                .rich-text-editor .ql-toolbar {
                    border-top-left-radius: 0.375rem;
                    border-top-right-radius: 0.375rem;
                    background: #f9fafb;
                    padding-right: 40px; /* Make space for the toggle button */
                }
                .rich-text-editor .ql-container {
                    border-bottom-left-radius: 0.375rem;
                    border-bottom-right-radius: 0.375rem;
                }
                .rich-text-editor .ql-editor.ql-blank::before {
                    color: #9ca3af;
                    font-style: normal;
                }
            `}</style>
        </div>
    );
}
