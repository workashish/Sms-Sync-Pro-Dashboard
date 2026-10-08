import { readJson, RequestError } from '@/lib/request';
import { NextResponse } from 'next/server';
import { isAuthenticated, sameOrigin } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
const tables = new Set(['messages', 'otp_messages', 'bank_activity', 'webhook_logs', 'all_messages']);
type Context = { params: Promise<{ table: string }> };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
async function authorize(req: Request, context: Context) {
    if (!(await isAuthenticated())) return json({ error: 'Unauthorized' }, 401);
    if (req.method !== 'GET' && !sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
    const { table } = await context.params;
    return tables.has(table) && (req.method === 'GET' || table !== 'all_messages') ? table : json({ error: 'Unknown table' }, 404);
}
export async function GET(req: Request, context: Context) {
    const table = await authorize(req, context); if (typeof table !== 'string') return table;
    try {
        const url = new URL(req.url);
        const limit = Number(url.searchParams.get('limit') || 12);
        const offset = Number(url.searchParams.get('offset') || 0);
        const search = url.searchParams.get('search') || '';
        if (!Number.isInteger(limit) || limit < 1 || limit > 500 || !Number.isSafeInteger(offset) || offset < 0 || search.length > 128) return json({ error: 'Invalid page request' }, 400);
        if (table === 'webhook_logs') {
            const { data, count, error } = await getSupabase().from(table).select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
            if (error) throw error; return json({ data: data || [], count });
        }
        const { data, error } = await getSupabase().rpc('query_message_page', {
            category: table === "all_messages" && url.searchParams.get("arrival") === "true" ? "live" : table, page_offset: offset, page_size: limit, search_text: search,
            only_unread: url.searchParams.get('unread') === 'true', only_reminder: url.searchParams.get('reminder') === 'true',
        });
        if (error) throw error;
        return json(data);
    } catch { return json({ error: 'Database request failed' }, 500); }
}
export async function DELETE(req: Request, context: Context) {
    const table = await authorize(req, context); if (typeof table !== 'string') return table;
    let body: any; try { body = await readJson(req, 2048); } catch (e) { return json({ error: "Invalid request" }, e instanceof RequestError ? e.status : 400); }
    if (!body || typeof body.id !== 'string' || !uuid.test(body.id)) return json({ error: 'Invalid deletion request' }, 400);
    try {
        const { error } = await getSupabase().from(table).delete().eq('id', body.id);
        if (error) throw error; return json({ success: true });
    } catch { return json({ error: 'Database request failed' }, 500); }
}
export async function PATCH(req: Request, context: Context) {
    const table = await authorize(req, context); if (typeof table !== 'string') return table;
    let body: any; try { body = await readJson(req, 2048); } catch (e) { return json({ error: "Invalid request" }, e instanceof RequestError ? e.status : 400); }
    if (!body || table === 'webhook_logs' || typeof body.id !== 'string' || !uuid.test(body.id) || !['is_unread', 'is_reminder'].includes(body.key) || typeof body.value !== 'boolean') return json({ error: 'Invalid update request' }, 400);
    try {
        const { error } = await getSupabase().rpc('set_message_flag', { target_table: table, target_id: body.id, flag: body.key, flag_value: body.value });
        if (error) throw error; return json({ success: true });
    } catch { return json({ error: 'Database request failed' }, 500); }
}
