import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(_request: NextRequest) {
    try {
        // Note: Backend has double prefix due to global prefix + controller prefix
        const response = await fetch(`${API_URL}/api/v1/api/v1/billing/plans`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching billing plans:', error);
        return NextResponse.json([], { status: 500 });
    }
}
