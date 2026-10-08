import { readJson, RequestError } from '@/lib/request';
import { NextResponse } from 'next/server';
import { createHmac, randomUUID } from 'node:crypto';
import { sameOrigin, safeEqual, sessionSecret } from '@/lib/auth';
import { createSessionToken, SESSION_SECONDS } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
export async function POST(req: Request) {
    if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const correct = process.env.DASHBOARD_PASSWORD;
    const secret = sessionSecret();
    if (!correct || !secret) return NextResponse.json({ error: 'Dashboard login is not configured.' }, { status: 503 });
    try {
        const db = getSupabase();
        const trusted = process.env.VERCEL === '1' || process.env.AUTH_TRUST_PROXY === 'true';
        const ip = trusted ? (req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown') : 'unproxied';
        const scope = createHmac('sha256', secret).update(`login:${ip}`).digest('hex');
        const { data: allowed, error: rateError } = await db.rpc('consume_login_attempt', { client_scope: scope });
        if (rateError) throw rateError;
        if (!allowed) return NextResponse.json({ error: 'Too many login attempts. Try again in 15 minutes.' }, { status: 429, headers: { 'Retry-After': '900' } });
        let body: any;
        try { body = await readJson(req); } catch (e) { return NextResponse.json({ error: "Invalid request" }, { status: e instanceof RequestError ? e.status : 400 }); }
        if (!body || typeof body.password !== 'string' || body.password.length > 4096 || !safeEqual(body.password, correct))
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        const id = randomUUID();
        const expires = Date.now() + SESSION_SECONDS * 1000;
        const { error } = await db.from('dashboard_sessions').insert({ id, expires_at: new Date(expires).toISOString() });
        if (error) throw error;
        const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
        response.cookies.set('dashboard_auth', await createSessionToken(secret, id, expires), {
            httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: SESSION_SECONDS,
        });
        return response;
    } catch { return NextResponse.json({ error: 'Login service unavailable. Check database setup.' }, { status: 503 }); }
}
