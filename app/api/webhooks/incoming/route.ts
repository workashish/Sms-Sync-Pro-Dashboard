import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import crypto from "crypto";

export async function GET(req: NextRequest) {
    return NextResponse.json({
        status: "online",
        message: "SMS Relay Webhook Endpoint. Please send a POST request with the appropriate JSON payload."
    });
}

export async function POST(req: NextRequest) {
        let responsePayload: any = { error: "Unknown error" };
        let statusCode: number = 500;
        let isSuccess: boolean = false;
        let rawBody = "";

        const logRequest = async (payload: any, statusStr: string, errorStr?: string) => {
            const supabase = getSupabase();
            const redacted = payload ? { ...payload } : null;
            if (redacted) {
                if (redacted.body) redacted.body = typeof redacted.body === 'string' ? redacted.body.substring(0, 8) + "...[REDACTED]" : redacted.body;
                if (redacted.sender) redacted.sender = typeof redacted.sender === 'string' ? redacted.sender.substring(0, 4) + "...[REDACTED]" : redacted.sender;
                if (redacted.metadata?.code) redacted.metadata.code = "***";
            }
            await supabase.from('webhook_logs').insert([{
                id: crypto.randomUUID(),
                status: statusStr,
                payload: redacted,
                error: errorStr || null,
                created_at: new Date().toISOString()
            }]);
        };

        try {
            rawBody = await req.text();
            
            const secret = process.env.APP_HMAC_SECRET;

            if (secret) {
                const signature = req.headers.get("x-hmac-signature") || req.headers.get("x-signature");

                if (!signature) {
                    await logRequest(null, "error", "Missing HMAC signature");
                    return NextResponse.json({ error: "Missing HMAC signature" }, { status: 401 });
                }

                const expectedSignature = crypto
                    .createHmac("sha256", secret)
                    .update(rawBody)
                    .digest("hex");

                try {
                    if (
                        signature.length !== expectedSignature.length ||
                        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
                    ) {
                        await logRequest(null, "error", "Invalid HMAC signature");
                        return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
                    }
                } catch (e) {
                    await logRequest(null, "error", "Invalid HMAC signature");
                    return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
                }
            }

            const body = JSON.parse(rawBody);
            const { type = 'message', sender, time, metadata } = body;
            let messageBody = body.body;

            if (!sender || !messageBody) {
                await logRequest(body, "error", "Missing required fields: sender, body");
                return NextResponse.json({ error: "Missing required fields: sender, body" }, { status: 400 });
            }

            const aesKey = process.env.APP_AES_PASSWORD || process.env.APP_AES_KEY;
            if (aesKey && typeof messageBody === 'string') {
                try {
                    // Try decrypting with CryptoJS (supports standard AES outputs like those from Android/Web clients)
                    const CryptoJS = require("crypto-js");
                    const safeBase64 = messageBody.replace(/ /g, '+');
                    const bytes = CryptoJS.AES.decrypt(safeBase64, aesKey);
                    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
                    
                    if (!decrypted) {
                        throw new Error("Empty decryption result. Key might be wrong or format unsupported.");
                    }
                    messageBody = decrypted;
                } catch (e: any) {
                    await logRequest(body, "error", "AES Decryption failed: " + e.message);
                    return NextResponse.json({ error: "Failed to decrypt message body with AES key" }, { status: 400 });
                }
            }

            const supabase = getSupabase();
            
            // Define table based on payload type
            let tableName = 'messages';
            if (type === 'otp') {
                tableName = 'otp_messages';
            } else if (type === 'bank') {
                tableName = 'bank_activity';
            }

            const payload: any = {
                id: crypto.randomUUID(),
                sender,
                body: messageBody,
                time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                created_at: new Date().toISOString()
            };

            if (tableName === 'otp_messages' || tableName === 'bank_activity') {
                payload.metadata = metadata || null;
            }

            const { error } = await supabase.from(tableName).insert([payload]);

            if (error) {
                console.error("Supabase insert error:", error);
                await logRequest(body, "error", `Database error: ${error.message}`);
                return NextResponse.json({ error: "Database error", details: error }, { status: 500 });
            }

            await logRequest(body, "success");
            return NextResponse.json({ success: true, message: "Payload processed successfully" }, { status: 201 });
        } catch (error: any) {
            console.error("Webhook Error:", error);
            await logRequest(rawBody ? { raw: rawBody } : null, "error", error.message || "Internal server error");
            return NextResponse.json(
                { error: error.message || "Internal server error" },
                { status: 500 }
            );
        }
}
