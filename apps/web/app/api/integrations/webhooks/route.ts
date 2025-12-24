import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(_request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json([]);
        }

        const response = await fetch(`${API_URL}/api/v1/integrations/webhooks`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            console.error('Failed to fetch webhooks:', response.status);
            return NextResponse.json([]);
        }

        const data = await response.json();
        return NextResponse.json(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error('Error fetching webhooks:', error);
        return NextResponse.json([]);
    }
}

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        const response = await fetch(`${API_URL}/api/v1/integrations/webhooks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Error creating webhook:', error);
        return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
    }
}
