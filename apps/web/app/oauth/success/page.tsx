'use client';

import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

export default function OAuthSuccessPage() {
    useEffect(() => {
        // Notify parent window of success
        if (window.opener) {
            window.opener.postMessage({ type: 'oauth-success' }, window.location.origin);

            // Close popup after short delay
            setTimeout(() => {
                window.close();
            }, 1500);
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="flex justify-center mb-4">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Email Connected Successfully!
                </h1>
                <p className="text-gray-600">
                    This window will close automatically...
                </p>
            </div>
        </div>
    );
}
