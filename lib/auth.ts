import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getSupabase } from './supabase';
import { verifySessionToken } from './session';
export function sessionSecret(): string | undefined { return process.env.DASHBOARD_PASSWORD ? `${process.env.DASHBOARD_SESSION_SECRET || ""}\u0000${process.env.DASHBOARD_PASSWORD}` : undefined; }
export function safeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a); const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}
export async function currentSession() {
    if (!process.env.DASHBOARD_PASSWORD) return null;
    return verifySessionToken((await cookies()).get('dashboard_auth')?.value, sessionSecret());
}
export async function isAuthenticated(): Promise<boolean> {
    const session = await currentSession();
    if (!session) return false;
    try {
        const { data, error } = await getSupabase().from('dashboard_sessions').select('id')
            .eq('id', session.id).gt('expires_at', new Date().toISOString()).is('revoked_at', null).maybeSingle();
        if (error || !data) return false;
        const { error: maintenanceError } = await getSupabase().rpc("prune_dashboard_data");
        return !maintenanceError;
    } catch { return false; }
}
export function sameOrigin(req: Request): boolean {
    const origin = req.headers.get('origin');
    if (req.headers.get('sec-fetch-site') === 'cross-site') return false;
    if (!origin) return true;
    try {
        const protocol = req.headers.get('x-forwarded-proto') === 'https' ? 'https:' : new URL(req.url).protocol;
        const host = req.headers.get('host') || new URL(req.url).host;
        const expected = process.env.DASHBOARD_ORIGIN || `${protocol}//${host}`;
        return new URL(origin).origin === new URL(expected).origin;
    } catch { return false; }
}
