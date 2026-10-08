import { NextResponse } from 'next/server';
import { isAuthenticated, sameOrigin } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
export async function POST(req: Request) {
    if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    try {
        const { error } = await getSupabase().rpc('purge_dashboard');
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch { return NextResponse.json({ error: 'Purge failed; no tables were cleared.' }, { status: 500 }); }
}
