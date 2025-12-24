import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function GET(request: NextRequest) {
    try {
        const tenantId = request.nextUrl.searchParams.get('tenantId') || 'demo';

        const response = await fetch(`${API_URL}/billing/invoices?tenantId=${tenantId}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            // Return empty array if no invoices
            return NextResponse.json([]);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        return NextResponse.json([]);
    }
}
