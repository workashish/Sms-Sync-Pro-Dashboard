'use client';

import { useEffect } from 'react';

export const MESSAGE_INSERT_EVENT = 'syncpro:message-insert';
export const LOG_INSERT_EVENT = 'syncpro:log-insert';
export const REALTIME_RECONCILE_EVENT = 'syncpro:realtime-reconcile';

export type MessageTable = 'messages' | 'otp_messages' | 'bank_activity';
export type RealtimeMessage = {
    id: string;
    sender: string;
    body: string;
    time: string;
    received_at?: string | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
    _table: MessageTable;
};

export type RealtimeLog = {
    id: string;
    payload: unknown;
    status: string;
    error?: string | null;
    created_at: string;
};

function useCustomEvent<T>(name: string, listener: (detail: T) => void) {
    useEffect(() => {
        const handler = (event: Event) => listener((event as CustomEvent<T>).detail);
        window.addEventListener(name, handler);
        return () => window.removeEventListener(name, handler);
    }, [name, listener]);
}

export function useRealtimeMessage(listener: (message: RealtimeMessage) => void) {
    useCustomEvent(MESSAGE_INSERT_EVENT, listener);
}

export function useRealtimeLog(listener: (log: RealtimeLog) => void) {
    useCustomEvent(LOG_INSERT_EVENT, listener);
}

export function useRealtimeReconcile(listener: () => void) {
    useCustomEvent<void>(REALTIME_RECONCILE_EVENT, listener);
}
