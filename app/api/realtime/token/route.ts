import { NextResponse } from 'next/server';
import { currentSession, isAuthenticated, sameOrigin } from '@/lib/auth';
import { createRealtimeToken, getRealtimePublicKey } from '@/lib/realtime-token';

export const dynamic = 'force-dynamic';

const responseHeaders = {
    'Cache-Control': 'private, no-store, max-age=0',
    Pragma: 'no-cache',
    Vary: 'Cookie',
};

export async function GET(req: Request) {
    if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: responseHeaders });
    if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: responseHeaders });

    const session = await currentSession();
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = getRealtimePublicKey();
    const signingSecret = process.env.SUPABASE_JWT_SECRET;
    if (!session || !url || !publicKey || !signingSecret) {
        return NextResponse.json(
            { error: 'Realtime is not configured. Add SUPABASE_JWT_SECRET and SUPABASE_PUBLISHABLE_KEY.' },
            { status: 503, headers: responseHeaders },
        );
    }

    try {
        const { token, expiresAt } = createRealtimeToken(signingSecret, session.id);
        return NextResponse.json({ url, publicKey, token, expiresAt }, { headers: responseHeaders });
    } catch {
        return NextResponse.json({ error: 'Realtime configuration is invalid.' }, { status: 503, headers: responseHeaders });
    }
}
