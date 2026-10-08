import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSupabase } from '@/lib/supabase';
import { normalizeMessages, PayloadError, redactPayload, verifySignature } from '@/lib/webhook';

export async function POST(req: Request) {
    const secret = process.env.APP_HMAC_SECRET;
    if (!secret) return NextResponse.json({ error: 'Webhook authentication is not configured' }, { status: 503 });
    if (Number(req.headers.get('content-length')) > 1048576)
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    let raw: string;
    try {
        const reader = req.body?.getReader();
        if (!reader) return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
        const chunks: Uint8Array[] = []; let bytes = 0;
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > 1048576) { await reader.cancel(); return NextResponse.json({ error: 'Payload too large' }, { status: 413 }); }
            chunks.push(value);
        }
        raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
    if (!verifySignature(raw, req.headers.get('x-hmac-signature') || req.headers.get('x-signature'), secret))
        return NextResponse.json({ error: 'Invalid or missing signature' }, { status: 401 });
    let payload: unknown;
    let messages;
    try {
        payload = JSON.parse(raw);
        messages = normalizeMessages(payload, process.env.APP_AES_PASSWORD);
    } catch (error) {
        return NextResponse.json({ error: error instanceof PayloadError ? error.message : 'Invalid JSON' }, { status: 400 });
    }
    try {
        const supabase = getSupabase();
        const { error } = await supabase.rpc('ingest_messages', { entries: messages, audit_payload: redactPayload(payload) });
        if (error) throw error;
        return NextResponse.json({ success: true, processed: messages.length });
    } catch {
        return NextResponse.json({ error: 'Message storage failed' }, { status: 500 });
    }
}
