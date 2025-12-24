import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(_request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        const response = await fetch(`${API_BASE_URL}/api/v1/campaigns`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                return NextResponse.json({ campaigns: [], total: 0 });
            }
            throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        return NextResponse.json(
            { campaigns: [], total: 0, error: 'Failed to fetch campaigns' },
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

        const response = await fetch(`${API_BASE_URL}/api/v1/campaigns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Failed to create campaign';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch {
                // If not JSON, use text or default message
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
        console.error('Error creating campaign:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to create campaign' },
            { status: 500 }
        );
    }
}
