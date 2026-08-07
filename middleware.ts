import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import hmacSHA256 from 'crypto-js/hmac-sha256';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/api/webhooks') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/otp') || pathname.startsWith('/_next') || pathname === '/login') {
        return NextResponse.next();
    }

    const token = request.cookies.get('dashboard_auth')?.value;
    const correctPassword = process.env.DASHBOARD_PASSWORD || "";
    const expectedTokenJS = hmacSHA256('session', correctPassword).toString();

    if (!token || token !== expectedTokenJS) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
