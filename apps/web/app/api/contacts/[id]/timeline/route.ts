import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api\/v1$/, '') + '/api/v1';

export async function GET(
    request: NextRequest,
    context: { params: { id: string } }
) {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const id = context.params.id;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const response = await fetch(`${API_BASE_URL}/contacts/${id}/timeline?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching contact timeline:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

