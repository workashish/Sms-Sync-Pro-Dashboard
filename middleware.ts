import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import SHA256 from 'crypto-js/sha256';
import hmacSHA256 from 'crypto-js/hmac-sha256';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow API routes to be bypassed or handle their own auth
    if (pathname.startsWith('/api/webhooks') || pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname === '/login') {
        return NextResponse.next();
    }

    // Check for authentication cookie
    const token = request.cookies.get('dashboard_auth')?.value;
    const correctPassword = process.env.DASHBOARD_PASSWORD || "";

    // Fallback using crypto-js if node crypto is not available in edge runtime (though Next 14/15 polyfills some, crypto-js is safer cross-runtime for simple checks)
    const expectedTokenJS = hmacSHA256('session', correctPassword).toString();

    // Check if the token matches the expected hash
    if (!token || token !== expectedTokenJS) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
