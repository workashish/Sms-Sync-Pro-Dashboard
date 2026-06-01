'use client';
import { DashboardLayout } from "@/components/DashboardLayout";
import { LayoutDashboard, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

export default function LogsCenter() {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        const fetchLogs = async () => {
            const supabase = getSupabase();
            const { data } = await supabase.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(50);
            if (data) setLogs(data);
        };
        fetchLogs();
    }, []);

    return (
        <DashboardLayout>
            <div className="mb-8 px-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <LayoutDashboard className="w-8 h-8 text-slate-400" />
                    System Logs
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-lg">Audit trail of webhook invocations and payload processing.</p>
            </div>

            <div className="space-y-4">
                {logs.length === 0 ? (
                    <div className="py-24 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                        <p className="text-sm text-slate-500 font-medium">No system logs available yet.</p>
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
                            <div className="flex-shrink-0 mt-1">
                                {log.status === 'success' ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-rose-500" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                        {log.status}
                                    </span>
                                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}</span>
                                </div>
                                <pre className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto border border-slate-200/50 dark:border-slate-800/50 whitespace-pre-wrap break-words">
                                    {JSON.stringify(log.payload, null, 2)}
                                </pre>
                                {log.error && (
                                    <p className="mt-2 text-xs text-rose-500 font-medium">{log.error}</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </DashboardLayout>
    )
}
