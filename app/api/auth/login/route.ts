import { NextResponse } from 'next/server';
import hmacSHA256 from 'crypto-js/hmac-sha256';

export async function POST(req: Request) {
    try {
        const { password } = await req.json();
        const correctPassword = process.env.DASHBOARD_PASSWORD;

        if (!correctPassword) {
            return NextResponse.json({ error: 'Dashboard password is not configured on the server. Please set DASHBOARD_PASSWORD.' }, { status: 500 });
        } else if (password !== correctPassword) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        const response = NextResponse.json({ success: true });
        const token = hmacSHA256('session', correctPassword).toString();

        response.cookies.set('dashboard_auth', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30 
        });

        return response;
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
