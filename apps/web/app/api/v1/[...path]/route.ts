import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
    return proxyRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
    return proxyRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
    return proxyRequest(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
    return proxyRequest(request, 'DELETE');
}

export async function PATCH(request: NextRequest) {
    return proxyRequest(request, 'PATCH');
}

async function proxyRequest(request: NextRequest, method: string) {
    try {
        // Get the path after /api/v1/
        const pathname = request.nextUrl.pathname;
        const searchParams = request.nextUrl.searchParams;

        // Build backend URL
        const backendUrl = `${API_URL}${pathname}${searchParams.toString() ? `?${searchParams}` : ''}`;

        console.log(`[API Proxy] ${method} ${backendUrl}`);

        // Get ALL cookies from the request
        const cookieHeader = request.headers.get('cookie');

        // Prepare headers - copy most headers from original request
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Forward cookies
        if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
            console.log(`[API Proxy] Forwarding cookies: ${cookieHeader.substring(0, 100)}...`);
        }

        // Copy authorization header if present
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        // Prepare request options
        const options: RequestInit = {
            method,
            headers,
        };

        // Add body for POST, PUT, PATCH
        if (method !== 'GET' && method !== 'DELETE') {
            try {
                const body = await request.text();
                if (body) {
                    options.body = body;
                }
            } catch (e) {
                // No body
            }
        }

        // Make request to backend
        const response = await fetch(backendUrl, options);

        console.log(`[API Proxy] Backend responded with status: ${response.status}`);

        // Get response data
        const data = await response.text();

        // Create Next.js response
        const nextResponse = new NextResponse(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Forward ALL Set-Cookie headers from backend response
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
            nextResponse.headers.set('Set-Cookie', setCookieHeader);
            console.log(`[API Proxy] Forwarding Set-Cookie from backend`);
        }

        return nextResponse;
    } catch (error: any) {
        console.error('[API Proxy] Error:', error);
        return NextResponse.json(
            { message: error.message || 'Proxy error' },
            { status: 500 }
        );
    }
}
