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

        // Fetch both WhatsApp and Email templates
        const [waResponse, emailResponse] = await Promise.allSettled([
            fetch(`${API_BASE_URL}/api/v1/whatsapp/templates`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            }),
            fetch(`${API_BASE_URL}/api/v1/email-templates`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            }),
        ]);

        const whatsappTemplates = waResponse.status === 'fulfilled' && waResponse.value.ok
            ? await waResponse.value.json()
            : { data: [] };

        const emailTemplates = emailResponse.status === 'fulfilled' && emailResponse.value.ok
            ? await emailResponse.value.json()
            : [];

        return NextResponse.json({
            whatsapp: whatsappTemplates.data || [],
            email: emailTemplates,
        });
    } catch (error) {
        console.error('Error fetching templates:', error);
        return NextResponse.json(
            { whatsapp: [], email: [], error: 'Failed to fetch templates' },
            { status: 500 }
        );
    }
}
