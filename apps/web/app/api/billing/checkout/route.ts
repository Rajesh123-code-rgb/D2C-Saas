import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { planTier, billingCycle, tenantId } = body;

        const response = await fetch(`${API_BASE_URL}/api/v1/billing/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                planTier,
                billingCycle,
                tenantId: tenantId || 'demo',
                successUrl: `${request.headers.get('origin')}/settings/billing?success=true`,
                cancelUrl: `${request.headers.get('origin')}/settings/billing?cancelled=true`,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json({ error }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating checkout session:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
