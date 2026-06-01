import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { classifyMessage } from '@/lib/parsers';
import { decryptAndroidPayload, encryptForDatabase } from '@/lib/encryption';

export async function POST(req: Request) {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature');

    // HMAC Verification
    const HMAC_SECRET = process.env.APP_HMAC_SECRET;
    if (HMAC_SECRET && HMAC_SECRET !== 'YOUR_HMAC_SECRET_KEY') {
        const expected = crypto.createHmac('sha256', HMAC_SECRET).update(rawBody).digest('hex');
        if (signature !== expected) {
            return NextResponse.json({ error: "Unauthorized - HMAC Mismatch" }, { status: 401 });
        }
    }

    try {
        const body = JSON.parse(rawBody);
        const { sender, message, timestamp, device_model } = body;

        // AES-256 Decryption from Android payload
        const AES_PASSWORD = process.env.APP_AES_PASSWORD;
        const isEncrypted = AES_PASSWORD && AES_PASSWORD !== 'YOUR_AES_PASSWORD';
        const plainTextMessage = isEncrypted ? decryptAndroidPayload(message, AES_PASSWORD) : message;

        // Categorize message (OTP, Bank, etc.)
        const { type, metadata } = classifyMessage(plainTextMessage);

        // Re-encrypt it for storage in the Dashboard Database
        const dbEncryptedMessage = encryptForDatabase(plainTextMessage);

        // Insert into Supabase (Bypassing RLS with anon key or service role)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase.from('sms_messages').insert({
            sender,
            message_encrypted: dbEncryptedMessage,
            device_model,
            timestamp,
            category: type,
            metadata
        });

        if (error) {
            console.error("DB Insert Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ status: "success" });
    } catch (e: any) {
        console.error("Webhook processing error", e);
        return NextResponse.json({ error: "Invalid payload formatting", details: e.message }, { status: 400 });
    }
}
