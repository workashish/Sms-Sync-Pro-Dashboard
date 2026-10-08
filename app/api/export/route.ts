import { NextResponse } from 'next/server';
import { currentSession, isAuthenticated, sameOrigin } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
    if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const session = await currentSession();
    const { data: id, error } = await getSupabase().rpc('start_export', { owner_session: session!.id });
    return error ? NextResponse.json({ error: 'Unable to start export' }, { status: 500 }) : NextResponse.json({ id });
}
export async function GET(req: Request) {
    if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const id = new URL(req.url).searchParams.get('id');
    if (!id || !/^[a-f\d-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid export ID' }, { status: 400 });
    const session = await currentSession(); const db = getSupabase();
    const { data: job, error } = await db.from('export_jobs').select('total').eq('id', id).eq('owner_session', session!.id).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (error || !job) return NextResponse.json({ error: 'Export expired or unavailable. Start again.' }, { status: 404 });
    const encoder = new TextEncoder();
    let cancelled = false, cursor = 0, first = true, received = 0;
    const stream = new ReadableStream<Uint8Array>({
        start(controller) { controller.enqueue(encoder.encode(`{"export_date":${JSON.stringify(new Date().toISOString())},"records":[`)); },
        async pull(controller) {
            try {
                const { data, error } = await db.rpc('export_page', { export_id: id, page_offset: cursor });
                if (error) throw error;
                if (!data?.length) {
                    if (received !== Number(job.total)) throw new Error('Export interrupted');
                    if (!cancelled) { controller.enqueue(encoder.encode(']}')); controller.close(); }
                    await db.rpc('finish_export', { export_id: id }); return;
                }
                for (const item of data) {
                    if (cancelled) return;
                    controller.enqueue(encoder.encode(`${first ? '' : ','}${JSON.stringify({ ...item.record, _table: item.category })}`));
                    first = false; cursor = item.item_index; received++;
                }
            } catch (error) { if (!cancelled) controller.error(error); await db.rpc('finish_export', { export_id: id }); }
        },
        async cancel() { cancelled = true; await db.rpc('finish_export', { export_id: id }); },
    });
    return new Response(stream, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="syncpro-export-${new Date().toISOString().slice(0,10)}.json"` } });
}
