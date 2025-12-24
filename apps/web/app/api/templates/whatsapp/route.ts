import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(_request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ templates: [] });
        }

        // Get the first WhatsApp channel to fetch templates
        const channelsResponse = await fetch(`${API_BASE_URL}/api/v1/channels`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!channelsResponse.ok) {
            return NextResponse.json({ templates: [] });
        }

        const channels = await channelsResponse.json();
        const whatsappChannel = channels.find?.((c: any) => c.type === 'whatsapp');

        if (!whatsappChannel) {
            return NextResponse.json({ templates: [], message: 'No WhatsApp channel configured' });
        }

        // Fetch templates from Meta via backend
        const templatesResponse = await fetch(
            `${API_BASE_URL}/api/v1/whatsapp/templates/${whatsappChannel.id}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (!templatesResponse.ok) {
            const errorText = await templatesResponse.text();
            console.error('Failed to fetch WhatsApp templates:', errorText);
            return NextResponse.json({ templates: [] });
        }

        const data = await templatesResponse.json();
        return NextResponse.json({ templates: data.data || data || [] });
    } catch (error) {
        console.error('Error fetching WhatsApp templates:', error);
        return NextResponse.json(
            { templates: [], error: 'Failed to fetch templates' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Get the first WhatsApp channel
        const channelsResponse = await fetch(`${API_BASE_URL}/api/v1/channels`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!channelsResponse.ok) {
            return NextResponse.json(
                { message: 'Failed to get channels' },
                { status: 500 }
            );
        }

        const channels = await channelsResponse.json();
        const whatsappChannel = channels.find?.((c: any) => c.type === 'whatsapp');

        if (!whatsappChannel) {
            return NextResponse.json(
                { message: 'No WhatsApp channel configured. Please connect WhatsApp first.' },
                { status: 400 }
            );
        }

        // Create template via backend
        const response = await fetch(`${API_BASE_URL}/api/v1/whatsapp/templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                channelId: whatsappChannel.id,
                ...body,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Failed to create template';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorData.error?.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            return NextResponse.json(
                { message: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error('Error creating WhatsApp template:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to create template' },
            { status: 500 }
        );
    }
}
