'use client';

import { Suspense, useEffect, useState } from 'react';
import { XCircle, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function OAuthErrorContent() {
    const searchParams = useSearchParams();
    const [message, setMessage] = useState('');

    useEffect(() => {
        const errorMessage = searchParams.get('message') || 'An error occurred during authentication';
        setMessage(errorMessage);

        // Notify parent window of error
        if (window.opener) {
            window.opener.postMessage(
                { type: 'oauth-error', message: errorMessage },
                window.location.origin
            );
        }
    }, [searchParams]);

    const handleClose = () => {
        window.close();
    };

    return (
        <div className="max-w-md text-center p-8">
            <div className="flex justify-center mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Authentication Failed
            </h1>
            <p className="text-gray-600 mb-6">
                {message}
            </p>
            <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
                Close Window
            </button>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="max-w-md text-center p-8">
            <div className="flex justify-center mb-4">
                <Loader2 className="h-16 w-16 text-gray-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Loading...
            </h1>
        </div>
    );
}

export default function OAuthErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Suspense fallback={<LoadingFallback />}>
                <OAuthErrorContent />
            </Suspense>
        </div>
    );
}
