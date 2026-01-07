import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();

        const response = await fetch(`${API_BASE_URL}/api/v1/email-templates/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Failed to update email template';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            return NextResponse.json(
                { message: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error updating email template:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to update email template' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/email-templates/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { message: 'Failed to delete email template' },
                { status: response.status }
            );
        }

        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        console.error('Error deleting email template:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to delete email template' },
            { status: 500 }
        );
    }
}
