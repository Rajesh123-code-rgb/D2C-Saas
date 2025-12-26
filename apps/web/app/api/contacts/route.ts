import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(_request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        const response = await fetch(`${API_BASE_URL}/api/v1/contacts`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
            },
        });

        if (!response.ok) {
            // If unauthorized, return empty array for now
            if (response.status === 401) {
                return NextResponse.json({ contacts: [], total: 0 });
            }
            throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        return NextResponse.json(
            { contacts: [], total: 0, error: 'Failed to fetch contacts' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        console.log('Creating contact, token present:', !!token);

        if (!token) {
            return NextResponse.json(
                { error: 'Authentication required. Please log in again.' },
                { status: 401 }
            );
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('Backend error:', response.status, responseData);
            return NextResponse.json(
                { error: responseData.message || `Server error: ${response.status}` },
                { status: response.status }
            );
        }

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Error creating contact:', error);
        return NextResponse.json(
            { error: 'Failed to create contact. Please try again.' },
            { status: 500 }
        );
    }
}


