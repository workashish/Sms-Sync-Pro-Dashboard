import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
    let rawBody = "";
    try {
        rawBody = await req.text();
        const secret = process.env.APP_HMAC_SECRET;
        const supabase = getSupabase();

        const logRequest = async (payload: any, statusStr: string, errorStr?: string) => {
            const redacted = payload ? { ...payload } : null;
            if (redacted) {
                if (redacted.body) redacted.body = typeof redacted.body === 'string' ? "..." : redacted.body;
            }
            await supabase.from('webhook_logs').insert([{
                id: crypto.randomUUID(),
                payload: redacted || { raw: (rawBody || "").substring(0, 100) },
                status: statusStr,
                error: errorStr || null
            }]);
        };

        if (secret) {
            const signature = req.headers.get("x-hmac-signature") || req.headers.get("x-signature");
            if (!signature) {
                await logRequest(null, "error", "Missing HMAC signature");
                return NextResponse.json({ error: "Missing HMAC signature" }, { status: 401 });
            }
        }

        const body = JSON.parse(rawBody);
        const { type = 'message', sender, time, metadata } = body;
        let messageBody = body.body;

        const aesPassword = process.env.APP_AES_PASSWORD;
        if (aesPassword && messageBody && messageBody.includes(':')) {
            try {
                const textParts = messageBody.split(':');
                const iv = Buffer.from(textParts.shift()!, 'hex');
                const encryptedText = Buffer.from(textParts.join(':'), 'hex');
                // Create a 32-byte key
                let key;
                if (aesPassword.length === 32) {
                    key = Buffer.from(aesPassword, 'utf-8');
                } else {
                    key = crypto.createHash('sha256').update(aesPassword).digest();
                }
                const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
                let decrypted = decipher.update(encryptedText);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                messageBody = decrypted.toString('utf8');
            } catch (decErr) {
                console.error("Decryption error:", decErr);
            }
        }

        if (!sender || !messageBody) {
            await logRequest(body, "error", "Missing required fields");
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        let tableName = 'messages';
        if (type === 'otp' || messageBody.toLowerCase().includes('code is') || messageBody.toLowerCase().includes('otp')) {
            tableName = 'otp_messages';
        } else if (type === 'bank' || messageBody.toLowerCase().includes('transaction') || messageBody.toLowerCase().includes('debited')) {
            tableName = 'bank_activity';
        }

        const { error } = await supabase.from(tableName).insert([{
            id: crypto.randomUUID(),
            sender,
            body: messageBody,
            time: time || new Date().toISOString(),
            metadata: metadata || {}
        }]);

        if (error) {
            await logRequest(body, "error", `DB error: ${error.message}`);
            return NextResponse.json({ error: "DB Error", details: error.message }, { status: 500 });
        }

        await logRequest(body, "success");
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
}
