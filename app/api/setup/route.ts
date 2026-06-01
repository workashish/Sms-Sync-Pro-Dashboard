import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET() {
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl || dbUrl.includes('YOUR_')) {
        return NextResponse.json({ error: "No Database connection string found." });
    }

    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        
        // Ensure tables exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS sms_messages (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                sender text NOT NULL,
                message_encrypted text NOT NULL,
                device_model text,
                timestamp bigint NOT NULL,
                received_at timestamp with time zone DEFAULT now(),
                category text DEFAULT 'general',
                metadata jsonb DEFAULT '{}'::jsonb
            );
        `);

        // Check if publication exists, then try adding the table
        try {
            await client.query(`CREATE PUBLICATION supabase_realtime;`);
        } catch(e) {
            // Probably already exists, safely ignore
        }
        
        try {
            await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE sms_messages;`);
        } catch(e) {
            // Already added to publication
        }

        return NextResponse.json({ success: true, message: "Database schema configured successfully." });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    } finally {
        await client.end();
    }
}
