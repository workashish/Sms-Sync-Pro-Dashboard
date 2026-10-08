import { NextResponse } from 'next/server';
import { currentSession, sameOrigin } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
export async function POST(req: Request) {
    if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const session = await currentSession();
    if (session) {
        try {
            const { error } = await getSupabase().from('dashboard_sessions').update({ revoked_at: new Date().toISOString() }).eq('id', session.id);
            if (error) throw error;
        } catch { return NextResponse.json({ error: 'Unable to revoke session. Retry logout.' }, { status: 503 }); }
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set('dashboard_auth', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
    return response;
}
