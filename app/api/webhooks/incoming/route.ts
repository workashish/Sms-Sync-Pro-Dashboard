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
            const expectedSignatureHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
            const expectedSignatureB64 = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
            if (signature !== expectedSignatureHex && signature !== expectedSignatureB64) {
                await logRequest(null, "error", "Invalid HMAC signature");
                return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
            }
        }

        let body = JSON.parse(rawBody);
        
        // Handle array of messages (some SMS forwarders send batches)
        const messages = Array.isArray(body) ? body : [body];
        
        const aesPassword = process.env.APP_AES_PASSWORD;
        const inserts: any = { 'messages': [], 'otp_messages': [], 'bank_activity': [] };

        for (const msg of messages) {
            const { type = 'message', sender, time, metadata } = msg;
            let messageBody = msg.body;

            if (aesPassword && messageBody && messageBody.includes(':')) {
                try {
                    const textParts = messageBody.split(':');
                    const iv = Buffer.from(textParts.shift()!, 'hex');
                    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
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
                continue; // Skip invalid messages in batch
            }

            let tableName = 'messages';
            const msgLower = messageBody.toLowerCase();
            
            if (type === 'otp' || msgLower.includes('code is') || msgLower.includes('otp') || msgLower.includes('verification')) {
                tableName = 'otp_messages';
            } else if (type === 'bank' || msgLower.includes('transaction') || msgLower.includes('debited') || msgLower.includes('credited')) {
                tableName = 'bank_activity';
            }

            inserts[tableName].push({
                id: crypto.randomUUID(),
                sender,
                body: messageBody,
                time: time || new Date().toISOString(),
                metadata: { ...(metadata || {}), is_unread: true }
            });
        }

        let hasError = false;
        let lastErrorMsg = "";

        for (const tableName of Object.keys(inserts)) {
            if (inserts[tableName].length > 0) {
                const { error } = await supabase.from(tableName).insert(inserts[tableName]);
                if (error) {
                    hasError = true;
                    lastErrorMsg = error.message;
                }
            }
        }

        if (hasError) {
            await logRequest(body, "error", `DB error: ${lastErrorMsg}`);
            return NextResponse.json({ error: "DB Error", details: lastErrorMsg }, { status: 500 });
        }

        await logRequest(body, "success");
        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
}
