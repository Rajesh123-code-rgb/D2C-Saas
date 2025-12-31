import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Call the backend API
        const response = await fetch(`${API_URL}/api/v1/admin/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { message: data.message || 'Authentication failed' },
                { status: response.status }
            );
        }

        // Return the token and admin data
        return NextResponse.json({
            accessToken: data.accessToken,
            admin: {
                id: data.admin.id,
                email: data.admin.email,
                firstName: data.admin.firstName,
                lastName: data.admin.lastName,
                role: data.admin.role,
                permissions: data.admin.permissions,
            },
        });
    } catch (error: any) {
        console.error('Admin login error:', error);

        // For development, allow a mock login
        if (process.env.NODE_ENV === 'development') {
            const body = await request.clone().json().catch(() => ({}));
            if (body.email === 'admin@convoo.cloud' && body.password === 'admin123') {
                return NextResponse.json({
                    accessToken: 'mock_admin_token_' + Date.now(),
                    admin: {
                        id: '1',
                        email: 'admin@convoo.cloud',
                        firstName: 'Super',
                        lastName: 'Admin',
                        role: 'PLATFORM_ADMIN',
                        permissions: {
                            canManageTenants: true,
                            canManageUsers: true,
                            canViewAnalytics: true,
                            canManageFeatureFlags: true,
                            canManagePolicies: true,
                            canManagePricing: true,
                            canIssueCredits: true,
                            canProcessRefunds: true,
                            canSuspendTenants: true,
                            canDeleteTenants: true,
                        },
                    },
                });
            }
        }

        return NextResponse.json(
            { message: 'Authentication service unavailable' },
            { status: 503 }
        );
    }
}
