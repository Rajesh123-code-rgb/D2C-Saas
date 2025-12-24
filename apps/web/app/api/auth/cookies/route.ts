import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, user, tenant } = body;

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const response = NextResponse.json({ success: true });

        // Set HTTP-only cookie for token (most secure)
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        // Also store in regular cookies for client-side access if needed
        if (user) {
            response.cookies.set('user', JSON.stringify(user), {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });
        }

        if (tenant) {
            response.cookies.set('tenant', JSON.stringify(tenant), {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });
        }

        return response;
    } catch (error) {
        console.error('Error setting auth cookies:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE() {
    const response = NextResponse.json({ success: true });

    // Clear all auth cookies
    response.cookies.delete('token');
    response.cookies.delete('user');
    response.cookies.delete('tenant');

    return response;
}
