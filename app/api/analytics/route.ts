import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
    if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const zone = new URL(req.url).searchParams.get('timezone') || 'Asia/Kolkata';
    try {
        new Intl.DateTimeFormat('en', { timeZone: zone }).format();
        const { data, error } = await getSupabase().rpc('dashboard_analytics', { zone });
        if (error) throw error;
        return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch { return NextResponse.json({ error: 'Unable to load analytics' }, { status: 400 }); }
}
