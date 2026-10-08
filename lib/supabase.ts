import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
    if (!client) {
        const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) throw new Error('Server database configuration is missing.');
        client = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    return client;
}
