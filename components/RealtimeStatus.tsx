'use client';

import { CircleAlert, LoaderCircle, Wifi, WifiOff } from 'lucide-react';
import { useRealtimeStatus } from './RealtimeProvider';

const config = {
    live: { label: 'Live', detail: 'New messages appear instantly', icon: Wifi, color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    connecting: { label: 'Connecting', detail: 'Restoring the live connection', icon: LoaderCircle, color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    offline: { label: 'Offline', detail: 'Waiting for an internet connection', icon: WifiOff, color: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
    unavailable: { label: 'Realtime unavailable', detail: 'Realtime needs server configuration', icon: CircleAlert, color: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
} as const;

export function RealtimeStatus({ compact = false }: { compact?: boolean }) {
    const { state } = useRealtimeStatus();
    const item = config[state];
    const Icon = item.icon;
    return (
        <div role="status" title={item.detail} className={`inline-flex items-center gap-2 ${item.color}`}>
            <span className="relative flex h-2 w-2" aria-hidden="true">
                {state === 'live' && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${item.dot} opacity-50`} />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${item.dot}`} />
            </span>
            {!compact && <Icon className={`h-3.5 w-3.5 ${state === 'connecting' ? 'animate-spin' : ''}`} aria-hidden="true" />}
            <span className="text-xs font-semibold">{item.label}</span>
        </div>
    );
}
