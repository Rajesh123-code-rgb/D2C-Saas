import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(_request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

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
                { message: 'No WhatsApp channel configured' },
                { status: 400 }
            );
        }

        // Fetch templates from Meta (this effectively syncs them)
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
            return NextResponse.json(
                { message: 'Failed to sync templates from Meta' },
                { status: 500 }
            );
        }

        const data = await templatesResponse.json();
        return NextResponse.json({
            message: 'Templates synced successfully',
            count: data.data?.length || 0,
        });
    } catch (error: any) {
        console.error('Error syncing WhatsApp templates:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to sync templates' },
            { status: 500 }
        );
    }
}
