'use client';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Activity, Clock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getRecords } from "@/lib/data-client";
import { RealtimeMessage, useRealtimeMessage, useRealtimeReconcile } from '@/lib/realtime-events';
import { MessageBody } from '@/components/MessageBody';

export default function LiveFeed() {
    const [events, setEvents] = useState<any[]>([]);

    const [error, setError] = useState<string | null>(null);
    const refresh = useCallback(async () => {
        try {
            const { data } = await getRecords('all_messages', 50, { arrival: true });
            setEvents(data || []);
            setError(null);
        } catch { setError('Unable to refresh the live feed.'); }
    }, []);
    useEffect(() => { void refresh(); }, [refresh]);
    const onMessage = useCallback((message: RealtimeMessage) => {
        setEvents(current => [message, ...current.filter(item => item.id !== message.id)].slice(0, 50));
        setError(null);
    }, []);
    useRealtimeMessage(onMessage);
    useRealtimeReconcile(refresh);

    return (
        <DashboardLayout>
            {error && <p role="alert" className="mb-4 text-rose-600">{error}</p>}
            <div className="mb-8 px-2 max-w-4xl mx-auto text-center mt-8">
                <div className="inline-flex items-center justify-center p-2 mb-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                    <div className="flex items-center gap-2 px-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                        <span className="text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest">Active Stream</span>
                    </div>
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">Live Messages</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto">New messages appear here as soon as Supabase stores them.</p>
            </div>

            <div className="max-w-4xl mx-auto mt-12 space-y-4">
                {events.length === 0 ? (
                    <div className="py-24 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                        <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <p className="text-sm text-slate-500 font-medium">Listening for incoming real-time events...</p>
                    </div>
                ) : (
                    events.map(ev => (
                        <article key={`${ev._table}:${ev.id}`} className="animate-in slide-in-from-top-4 fade-in duration-500 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">{ev._table}</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{ev.sender}</span>
                                </div>
                                <MessageBody body={ev.body} />
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono flex-shrink-0">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(ev.created_at || Date.now()).toLocaleTimeString()}
                            </div>
                        </article>
                    ))
                )}
            </div>
        </DashboardLayout>
    )
}
