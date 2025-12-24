import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        const response = await fetch(
            `${API_BASE_URL}/api/v1/inbox/conversations/${params.id}/chatbot`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating conversation chatbot:', error);
        return NextResponse.json(
            { error: 'Failed to update chatbot' },
            { status: 500 }
        );
    }
}
