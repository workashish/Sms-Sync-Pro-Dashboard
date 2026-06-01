import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  // If we are on the server environment and have a service role key, prioritize it
  // This allows the server (e.g. webhooks) to bypass RLS if the user enables it, keeping writes secure
  if (typeof window === 'undefined' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (!supabaseAdminClient) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        if (supabaseUrl) {
           supabaseAdminClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
        }
    }
    if (supabaseAdminClient) return supabaseAdminClient;
  }

  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are required to connect to Supabase.');
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}
