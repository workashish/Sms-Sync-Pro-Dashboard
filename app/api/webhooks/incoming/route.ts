import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type = 'message', sender, body: messageBody, time, metadata } = body;

        if (!sender || !messageBody) {
            return NextResponse.json({ error: "Missing required fields: sender, body" }, { status: 400 });
        }

        const supabase = getSupabase();
        
        // Define table based on payload type
        let tableName = 'messages';
        if (type === 'otp') {
            tableName = 'otp_messages';
        } else if (type === 'bank') {
            tableName = 'bank_activity';
        }

        const payload = {
            id: crypto.randomUUID(),
            sender,
            body: messageBody,
            time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: "Delivered",
            metadata: metadata || null,
            created_at: new Date().toISOString()
        };

        const { error } = await supabase.from(tableName).insert([payload]);

        if (error) {
            console.error("Supabase insert error:", error);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Payload processed successfully" }, { status: 201 });
    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
