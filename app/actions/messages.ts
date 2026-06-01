'use server'

import { createClient } from '@/lib/supabase/server';
import { decryptFromDatabase } from '@/lib/encryption';

// Define the interface matched by the database and dashboard
export interface SmsMessage {
    id: string;
    sender: string;
    message: string;
    device_model: string;
    timestamp: number;
    received_at: string;
    category: string;
    metadata: any;
}

export async function getDecryptedMessages(limit = 100, category?: string): Promise<SmsMessage[]> {
    const supabase = await createClient();
    
    let query = supabase.from('sms_messages')
                        .select('*')
                        .order('timestamp', { ascending: false })
                        .limit(limit);

    if (category) {
        query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    if (error || !data) return [];
    
    return data.map((msg) => ({
        ...msg,
        message: decryptFromDatabase(msg.message_encrypted)
    }));
}

export async function getDecryptedMessageById(id: string): Promise<SmsMessage | null> {
    const supabase = await createClient();
    const { data } = await supabase.from('sms_messages').select('*').eq('id', id).single();
    if (!data) return null;
    
    return {
        ...data,
        message: decryptFromDatabase(data.message_encrypted)
    };
}
