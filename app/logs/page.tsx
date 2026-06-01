'use client';

import { DashboardLayout } from "@/components/DashboardLayout";
import { RefreshCcw, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatLocalTime } from "@/lib/timeUtils";

interface WebhookLog {
    id: string;
    status: 'success' | 'error';
    payload: any;
    error: string | null;
    created_at: string;
}

export default function SystemLogs() {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<WebhookLog[]>([]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('webhook_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
                
            if (error) {
                console.error("Error fetching logs:", error);
            } else {
                setLogs(data || []);
            }
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();

        const supabase = getSupabase();
        const channel = supabase.channel('public:webhook_logs')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'webhook_logs' },
                (payload) => {
                    setLogs(current => [payload.new as WebhookLog, ...current].slice(0, 50));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <DashboardLayout>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                            <FileText className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                            System Logs
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time webhook ingestion events and error tracking.</p>
                    </div>
                    <button 
                        onClick={fetchLogs}
                        disabled={loading}
                        className="shrink-0 text-[10px] uppercase font-bold tracking-wider bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-lg flex items-center transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-50 h-[38px]"
                    >
                        <RefreshCcw className={`w-3 h-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px] flex flex-col transition-colors">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 grid grid-cols-12 gap-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <div className="col-span-2">Time</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-8">Payload / Error</div>
                    </div>
                    
                    {logs.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No logs available</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                                Waiting for incoming webhook requests.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {logs.map(log => (
                                <div key={log.id} className="p-5 grid grid-cols-12 gap-4 items-start hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="col-span-2 text-sm text-slate-500 dark:text-slate-500 font-mono flex flex-col gap-1">
                                        <span>{new Date(log.created_at).toLocaleDateString()}</span>
                                        <span>{formatLocalTime(log.created_at)}</span>
                                    </div>
                                    <div className="col-span-2 flex items-start">
                                        {log.status === 'success' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                <CheckCircle2 className="w-3 h-3" /> Success
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                                                <XCircle className="w-3 h-3" /> Error
                                            </span>
                                        )}
                                    </div>
                                    <div className="col-span-8 flex flex-col gap-2 overflow-hidden">
                                        {log.error && (
                                            <div className="text-sm text-rose-600 dark:text-rose-400 font-medium break-words">
                                                {log.error}
                                            </div>
                                        )}
                                        {log.payload ? (
                                            <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-100 dark:border-slate-800 overflow-x-auto whitespace-pre-wrap word-break">
                                                {JSON.stringify(log.payload, null, 2)}
                                            </pre>
                                        ) : (
                                            <span className="text-sm text-slate-400 dark:text-slate-500 italic">No payload recorded</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DashboardLayout>
    );
}
