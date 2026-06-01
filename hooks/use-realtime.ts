'use client'

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getDecryptedMessageById, SmsMessage } from '@/app/actions/messages';

interface UseRealtimeMessagesProps {
    onNewMessage?: (msg: SmsMessage) => void;
    category?: string;
}

export function useRealtimeMessages({ onNewMessage, category }: UseRealtimeMessagesProps = {}) {
    useEffect(() => {
        // Request Web Notification permissions
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        }

        const supabase = createClient();
        
        const channel = supabase.channel('schema-db-changes')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'sms_messages' 
            }, async (payload) => {
                const newRecord = payload.new;
                
                // Discard early if category is specified and doesn't match
                if (category && newRecord.category !== category) return;

                // We have the ID, let's fetch the decrypted full message via Server Action
                const msg = await getDecryptedMessageById(newRecord.id);
                if (msg) {
                    if (onNewMessage) onNewMessage(msg);
                    
                    // Show standard web notification
                    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                        let title = "New Message";
                        if (msg.category === 'otp') title = "New OTP Received";
                        if (msg.category === 'bank') title = "Bank Alert";
                        
                        new Notification(title, {
                            body: `${msg.sender}: ${msg.message.substring(0, 50)}...`,
                            icon: '/icon.png'
                        });
                    }

                    // Show Sonner Toast inside the app
                    toast(msg.category === 'otp' ? "Code Received" : "New SMS", {
                        description: `From: ${msg.sender}`,
                        action: msg.category === 'otp' ? {
                            label: 'Copy',
                            onClick: () => navigator.clipboard.writeText(msg.metadata?.code || "")
                        } : undefined,
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [onNewMessage, category]);
}
