'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { LOG_INSERT_EVENT, MESSAGE_INSERT_EVENT, MessageTable, REALTIME_RECONCILE_EVENT } from '@/lib/realtime-events';

type RealtimeState = 'connecting' | 'live' | 'offline' | 'unavailable';
type RealtimeContextValue = { state: RealtimeState; lastEventAt: number | null };
type TokenResponse = { url: string; publicKey: string; token: string; expiresAt: number };

const RealtimeContext = createContext<RealtimeContextValue>({ state: 'connecting', lastEventAt: null });
const tables: MessageTable[] = ['messages', 'otp_messages', 'bank_activity'];

function dispatch(name: string, detail?: unknown) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
}

async function getToken(signal?: AbortSignal): Promise<TokenResponse> {
    const response = await fetch('/api/realtime/token', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal,
    });
    if (response.status === 401) {
        window.location.assign('/login');
        throw new Error('Session expired.');
    }
    if (!response.ok) throw new Error(response.status === 503 ? 'Realtime is not configured.' : 'Realtime authorization failed.');
    return response.json();
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLogin = pathname === '/login';
    const [state, setState] = useState<RealtimeState>('connecting');
    const [lastEventAt, setLastEventAt] = useState<number | null>(null);
    const lastReconcile = useRef(0);

    useEffect(() => {
        if (isLogin) {
            setState('offline');
            return;
        }

        const abort = new AbortController();
        let active = true;
        let refreshTimer: number | undefined;
        let startRetryTimer: number | undefined;
        let refreshRetryDelay = 5_000;
        let startRetryDelay = 5_000;
        let starting = false;
        let client: SupabaseClient | undefined;
        let channel: RealtimeChannel | undefined;
        const seenEvents = new Set<string>();

        const firstSeen = (id: string) => {
            if (seenEvents.has(id)) return false;
            seenEvents.add(id);
            if (seenEvents.size > 500) seenEvents.delete(seenEvents.values().next().value!);
            return true;
        };

        const reconcile = () => {
            const now = Date.now();
            if (now - lastReconcile.current < 750) return;
            lastReconcile.current = now;
            dispatch(REALTIME_RECONCILE_EVENT);
        };

        const refreshAuth = async () => {
            if (!active || !client) return;
            try {
                const fresh = await getToken(abort.signal);
                await client.realtime.setAuth(fresh.token);
                refreshRetryDelay = 5_000;
                setState(navigator.onLine ? 'live' : 'offline');
                scheduleTokenRefresh(fresh.expiresAt);
            } catch {
                if (!active) return;
                setState(navigator.onLine ? 'unavailable' : 'offline');
                window.clearTimeout(refreshTimer);
                refreshTimer = window.setTimeout(() => void refreshAuth(), refreshRetryDelay);
                refreshRetryDelay = Math.min(refreshRetryDelay * 2, 60_000);
            }
        };

        const scheduleTokenRefresh = (expiresAt: number) => {
            window.clearTimeout(refreshTimer);
            const delay = Math.max(15_000, expiresAt * 1000 - Date.now() - 60_000);
            refreshTimer = window.setTimeout(() => void refreshAuth(), delay);
        };

        const scheduleStartRetry = () => {
            window.clearTimeout(startRetryTimer);
            startRetryTimer = window.setTimeout(() => {
                void start();
                startRetryDelay = Math.min(startRetryDelay * 2, 60_000);
            }, startRetryDelay);
        };

        const start = async () => {
            if (starting || client) return;
            starting = true;
            setState(navigator.onLine ? 'connecting' : 'offline');
            try {
                const [config, supabaseModule] = await Promise.all([getToken(abort.signal), import('@supabase/supabase-js')]);
                if (!active) return;
                startRetryDelay = 5_000;
                window.clearTimeout(startRetryTimer);
                client = supabaseModule.createClient(config.url, config.publicKey, {
                    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
                    realtime: { params: { eventsPerSecond: 20 } },
                });
                await client.realtime.setAuth(config.token);
                scheduleTokenRefresh(config.expiresAt);

                let subscription = client.channel('sms-sync-dashboard');
                for (const table of tables) {
                    subscription = subscription.on(
                        'postgres_changes',
                        { event: 'INSERT', schema: 'public', table },
                        payload => {
                            if (!active) return;
                            if (!firstSeen(`message:${table}:${payload.new.id}`)) return;
                            setLastEventAt(Date.now());
                            dispatch(MESSAGE_INSERT_EVENT, { ...payload.new, _table: table });
                        },
                    );
                }
                channel = subscription.on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'webhook_logs' },
                    payload => {
                        if (!active) return;
                        if (!firstSeen(`log:${payload.new.id}`)) return;
                        setLastEventAt(Date.now());
                        dispatch(LOG_INSERT_EVENT, payload.new);
                    },
                ).subscribe(status => {
                    if (!active) return;
                    if (status === 'SUBSCRIBED') {
                        setState('live');
                        reconcile();
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                        setState(navigator.onLine ? 'connecting' : 'offline');
                    }
                });
            } catch (error) {
                if (!active || abort.signal.aborted) return;
                setState(navigator.onLine ? 'unavailable' : 'offline');
                console.warn(error instanceof Error ? error.message : 'Realtime setup failed.');
                scheduleStartRetry();
            } finally {
                starting = false;
            }
        };

        const onOnline = () => {
            setState('connecting');
            if (client) { void refreshAuth(); reconcile(); }
            else void start();
        };
        const onOffline = () => setState('offline');
        const onVisibility = () => { if (document.visibilityState === 'visible') reconcile(); };
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        window.addEventListener('focus', reconcile);
        document.addEventListener('visibilitychange', onVisibility);
        start();

        return () => {
            active = false;
            abort.abort();
            window.clearTimeout(refreshTimer);
            window.clearTimeout(startRetryTimer);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
            window.removeEventListener('focus', reconcile);
            document.removeEventListener('visibilitychange', onVisibility);
            if (client && channel) void client.removeChannel(channel);
        };
    }, [isLogin]);

    const value = useMemo(() => ({ state, lastEventAt }), [state, lastEventAt]);
    return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeStatus() {
    return useContext(RealtimeContext);
}
