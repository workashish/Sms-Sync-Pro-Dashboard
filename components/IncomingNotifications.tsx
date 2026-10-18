'use client';
import { useCallback } from 'react';
import { RealtimeMessage, useRealtimeMessage } from '@/lib/realtime-events';
export function IncomingNotifications() {
    const notify = useCallback((message: RealtimeMessage) => {
        if (localStorage.getItem('syncpro_notifications') !== 'true' || !('Notification' in window) || Notification.permission !== 'granted') return;
        const id = `${message._table}:${message.id}`;
        if (localStorage.getItem('syncpro_last_notified') === id) return;
        localStorage.setItem('syncpro_last_notified', id);
        const notice = new Notification('SMS Sync Pro', {
            body: 'A new message arrived. Open the dashboard to view it.',
            tag: id,
        });
        notice.onclick = () => { window.focus(); notice.close(); };
    }, []);
    useRealtimeMessage(notify);
    return null;
}
