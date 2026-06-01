import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow API routes to be bypassed or handle their own auth
    if (pathname.startsWith('/api/') || pathname.startsWith('/_next') || pathname === '/login') {
        return NextResponse.next();
    }

    // Check for authentication cookie
    const token = request.cookies.get('dashboard_auth')?.value;

    // We can't verify the exact password in middleware cleanly if it's hashed, 
    // but if we just set a secure signed generic token upon login, we check here.
    // For simplicity, we just check if it equals 'authenticated'.
    // A better approach is checking it against an environment variable but cookie is set by server on successful login.
    if (!token || token !== 'authenticated') {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
