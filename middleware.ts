import { NextResponse, NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/session';
export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    if (['/api/webhooks/incoming', '/api/auth/login', '/api/auth/logout', '/login'].includes(path) || path.startsWith('/_next/')) return NextResponse.next();
    const session = process.env.DASHBOARD_PASSWORD && await verifySessionToken(request.cookies.get('dashboard_auth')?.value,
        `${process.env.DASHBOARD_SESSION_SECRET || ""}\u0000${process.env.DASHBOARD_PASSWORD}`);
    if (!session) {
        if (path.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
