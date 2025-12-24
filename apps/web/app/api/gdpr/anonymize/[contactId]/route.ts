import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(
    request: NextRequest,
    { params }: { params: { contactId: string } }
) {
    try {
        const tenantId = request.nextUrl.searchParams.get('tenantId') || 'demo';
        const userId = request.nextUrl.searchParams.get('userId') || 'admin';
        const contactId = params.contactId;

        const response = await fetch(
            `${API_URL}/api/v1/gdpr/anonymize/${contactId}?tenantId=${tenantId}&userId=${userId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Error anonymizing GDPR data:', error);
        return NextResponse.json({ error: 'Anonymization failed' }, { status: 500 });
    }
}
