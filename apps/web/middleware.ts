import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/landing.html', '/admin'];

// Routes that should redirect to dashboard if authenticated
const authRoutes = ['/login', '/signup'];

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // Allow public assets and API routes
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/static') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Admin routes have their own authentication - skip user auth middleware
    if (pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    // Check if the route is public
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (token && isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If user is not authenticated and trying to access protected pages, redirect to login
    if (!token && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api routes
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
    ],
};
