import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');

        const response = await fetch(`${API_BASE_URL}/api/v1/ecommerce/carts`, {
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader && { Authorization: authHeader }),
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                return NextResponse.json({ carts: [], total: 0 });
            }
            throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching carts:', error);
        return NextResponse.json(
            { carts: [], total: 0, error: 'Failed to fetch carts' },
            { status: 500 }
        );
    }
}
