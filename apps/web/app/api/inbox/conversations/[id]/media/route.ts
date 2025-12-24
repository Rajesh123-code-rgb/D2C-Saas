import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        // Get the form data from the request
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Forward the file to the backend API
        const backendFormData = new FormData();
        backendFormData.append('file', file);

        const response = await fetch(
            `${API_BASE_URL}/api/v1/inbox/conversations/${params.id}/media`,
            {
                method: 'POST',
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: backendFormData,
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend media upload failed:', errorText);
            return NextResponse.json(
                { error: 'Failed to upload media' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error uploading media:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
