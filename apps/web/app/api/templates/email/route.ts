import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(_request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ templates: [] });
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/email-templates`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            // Return empty array if endpoint doesn't exist yet
            if (response.status === 404) {
                return NextResponse.json({ templates: [] });
            }
            throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json({ templates: data });
    } catch (error) {
        console.error('Error fetching email templates:', error);
        return NextResponse.json(
            { templates: [], error: 'Failed to fetch email templates' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();

        const response = await fetch(`${API_BASE_URL}/api/v1/email-templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            // If endpoint doesn't exist, store locally (temporary solution)
            if (response.status === 404) {
                // For now, just return success - backend needs to implement this
                return NextResponse.json(
                    { message: 'Email template storage not yet implemented in backend' },
                    { status: 501 }
                );
            }

            const errorText = await response.text();
            let errorMessage = 'Failed to create email template';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            return NextResponse.json(
                { message: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error('Error creating email template:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to create email template' },
            { status: 500 }
        );
    }
}
