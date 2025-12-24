import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// GET /api/inbox/conversations/[id]/messages - Get messages for conversation
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        console.log('[Next.js API] GET /messages - Starting');

        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const { id } = await params;

        console.log('[Next.js API] Conversation ID:', id);
        console.log('[Next.js API] Token exists:', !!token);

        if (!token) {
            console.log('[Next.js API] No token found - returning 401');
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const queryString = searchParams.toString();

        const backendUrl = `${API_BASE_URL}/api/v1/inbox/conversations/${id}/messages${queryString ? `?${queryString}` : ''}`;
        console.log('[Next.js API] Calling backend:', backendUrl);

        const response = await fetch(
            backendUrl,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        console.log('[Next.js API] Backend response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Next.js API] Backend error:', errorText);

            let errorMessage = 'Failed to fetch messages';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorJson.message || errorMessage;
            } catch {
                if (errorText && errorText.length < 200) {
                    errorMessage = errorText;
                }
            }

            return NextResponse.json(
                { message: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('[Next.js API] Success - returning', data.length, 'messages');
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Next.js API] Exception in GET /messages:', error);
        return NextResponse.json(
            { message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/inbox/conversations/[id]/messages - Send a message
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const { id } = await params;
        const body = await request.json();

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const response = await fetch(
            `${API_BASE_URL}/api/v1/inbox/conversations/${id}/messages`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Failed to send message';

            // Try to parse as JSON to extract the actual error message
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorJson.message || errorMessage;

                // Format common WhatsApp errors for users
                if (errorMessage.includes('access token') || errorMessage.includes('Session has expired')) {
                    errorMessage = 'WhatsApp connection expired. Please reconnect in Channels settings.';
                } else if (errorMessage.includes('Invalid phone number')) {
                    errorMessage = 'Invalid phone number format.';
                } else if (errorMessage === 'Internal server error') {
                    errorMessage = 'Unable to send message. Please try again later.';
                }
            } catch {
                // If not JSON, use the text directly but clean it up
                if (errorText && errorText.length < 200) {
                    errorMessage = errorText;
                }
            }

            return NextResponse.json(
                { message: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error('Error sending message:', error);
        return NextResponse.json(
            { message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
