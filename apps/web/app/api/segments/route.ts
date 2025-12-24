import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token');

        if (!token) {
            return NextResponse.json({ segments: [], total: 0 });
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/segments`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token.value}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                return NextResponse.json({ segments: [], total: 0 });
            }
            throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json({ segments: data, total: data.length });
    } catch (error) {
        console.error('Error fetching segments:', error);
        return NextResponse.json(
            { segments: [], total: 0, error: 'Failed to fetch segments' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token');

        console.log('POST /api/segments - Token present:', !!token);

        if (!token) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        console.log('POST /api/segments - Request body:', JSON.stringify(body, null, 2));

        const response = await fetch(`${API_BASE_URL}/api/v1/segments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token.value}`,
            },
            body: JSON.stringify(body),
        });

        console.log('POST /api/segments - Backend response status:', response.status);

        const data = await response.json();
        console.log('POST /api/segments - Backend response data:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            return NextResponse.json(
                { error: data.message || 'Failed to create segment' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating segment:', error);
        return NextResponse.json(
            { error: 'Failed to create segment' },
            { status: 500 }
        );
    }
}
