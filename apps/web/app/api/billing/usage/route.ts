import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
    try {
        const tenantId = request.nextUrl.searchParams.get('tenantId') || 'demo';

        // Note: Backend has double prefix due to global prefix + controller prefix
        const response = await fetch(`${API_URL}/api/v1/api/v1/billing/usage/${tenantId}`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching usage:', error);
        return NextResponse.json({
            contacts: 0,
            messages: 0,
            automations: 0,
            campaigns: 0,
        }, { status: 500 });
    }
}
