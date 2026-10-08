'use client';
import { useEffect } from 'react';
import { getRecords } from '@/lib/data-client';
export function IncomingNotifications() {
    useEffect(() => {
        let active = true, busy = false, initialized = false;
        let latest = '';
        const check = async () => {
            if (busy || localStorage.getItem('syncpro_notifications') !== 'true' || !('Notification' in window) || Notification.permission !== 'granted') return;
            busy = true;
            try {
                const { data } = await getRecords('all_messages', 1, { arrival: true });
                const id = data[0] ? `${data[0]._table}:${data[0].id}` : '';
                if (active && initialized && id && id !== latest) {
                    // Avoid multiple tabs alerting for the same arrival.
                    if (localStorage.getItem('syncpro_last_notified') !== id) {
                        localStorage.setItem('syncpro_last_notified', id);
                        const notice = new Notification('SMS Sync Pro', { body: 'A new message arrived. Open the dashboard to view it.', tag: 'smssync-incoming' });
                        notice.onclick = () => { window.focus(); notice.close(); };
                    }
                }
                if (active) { latest = id; initialized = true; }
            } catch {} finally { busy = false; }
        };
        const interval = window.setInterval(check, 5000);
        check();
        window.addEventListener('syncpro-preferences', check);
        return () => { active = false; clearInterval(interval); window.removeEventListener('syncpro-preferences', check); };
    }, []);
    return null;
}
