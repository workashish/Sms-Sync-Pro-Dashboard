import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: Request) {
    const supabase = getSupabase();
    const { data: cols, error: colsErr } = await supabase.rpc('query_columns', {}); // not gonna work easily
    const { data, error } = await supabase.from('messages').select('*').limit(1);
    return NextResponse.json({ data, error });
}
