import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const params = searchParams.toString();

        const response = await fetch(`${API_URL}/api/v1/audit-logs?${params}`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return NextResponse.json({ data: [], total: 0 }, { status: 500 });
    }
}
