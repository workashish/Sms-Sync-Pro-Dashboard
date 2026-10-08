import { parseMessage } from '@/lib/message-parser';
import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
    if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const supabase = getSupabase();
        
        // Query the most recent message that looks like a Bharat Taxi OTP
        const { data, error } = await supabase
            .from('otp_messages')
            .select('body, time, created_at, received_at, metadata')
            .or('body.ilike.%Bharat Taxi%,body.ilike.%Sahakar Taxi%')
            .gte('received_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
            .order('received_at', { ascending: false })
            .limit(1);
            
        if (error) {
            console.error('Error fetching Bharat Taxi OTP:', error);
            return NextResponse.json({ 
                error: "Failed to fetch OTP", 
                details: error.message,
                hint: "Ensure the Supabase URL and ANON key are correct."
            }, { 
                status: 500,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Surrogate-Control': 'no-store',
                } 
            });
        }
        
        if (!data || data.length === 0) {
            return NextResponse.json({ error: "No OTP found for Bharat Taxi recently" }, { 
                status: 404,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Surrogate-Control': 'no-store',
                } 
            });
        }
        
        const messageBody = data[0].body;
        
        // Extract 4-digit code using regex
        const code = data[0].metadata?.code || parseMessage(messageBody).code;
        const match = typeof code === 'string' && /^\d{4}$/.test(code) ? [code, code] : null;
        
        if (match && match[1]) {
            return NextResponse.json({ 
                success: true,
                code: match[1],
                time: data[0].time,
                created_at: data[0].created_at,
                raw_message: messageBody
            }, {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Surrogate-Control': 'no-store',
                } 
            });
        } else {
            return NextResponse.json({ 
                error: "Could not extract a 4-digit code from the latest message",
                raw_message: messageBody
            }, { 
                status: 400,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Surrogate-Control': 'no-store',
                } 
            });
        }

    } catch (error: any) {
        return NextResponse.json({ error: "Unable to fetch OTP" }, { status: 500 });
    }
}
