'use client';
import { DashboardLayout } from "@/components/DashboardLayout";
import { RefreshCcw, ShieldCheck, Banknote, Clock, Trash2, Smartphone, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

export default function BankActivity() {
    const [messages, setMessages] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    
    const fetchMessages = async (currentPage = 1, isLoadMore = false) => {
        if (!isLoadMore) setLoading(true);
        try {
            const supabase = getSupabase();
            const { data } = await supabase.from('bank_activity').select('*').order('created_at', { ascending: false }).limit(currentPage * 20);
            if(data) setMessages(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMessages(page, page > 1); }, [page]);

    const handleRefresh = () => {
        setPage(1);
        fetchMessages(1, false);
    };

    const handleDelete = async (id: string) => {
        setDeleting(id);
        try {
            const supabase = getSupabase();
            await supabase.from('bank_activity').delete().eq('id', id);
            setMessages(prev => prev.filter(m => m.id !== id));
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-8 px-2 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    Bank Verification
                </h1>
                <button onClick={handleRefresh} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm text-slate-600 dark:text-slate-300">
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            {loading && page === 1 && (
                <div className="flex flex-col justify-center items-center h-64 text-slate-400 space-y-4">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium">Synchronizing records...</p>
                </div>
            )}
            {!(loading && page === 1) && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {messages.length === 0 ? (
                     <div className="md:col-span-2 py-20 text-center"><p className="text-slate-400">No bank activity found</p></div>
                ) : messages.map((m,i)=>(
                    <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{m.sender?.substring(0,2).toUpperCase()}</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{m.sender}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                                    <div className="flex items-center gap-1.5 opacity-70">
                                        <Clock className="w-3 h-3" />
                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <button 
                                        disabled={deleting === m.id}
                                        onClick={() => handleDelete(m.id)} 
                                        className="p-1.5 rounded bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                                        title="Delete Message"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap break-words">{m.body}</p>
                        </div>
                        {m.metadata?.device && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                <Smartphone className="w-3.5 h-3.5" />
                                <span>{m.metadata.device}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {!loading && messages.length > 0 && messages.length % 20 === 0 && (
                <div className="mt-8 flex justify-center pb-8 border-t border-slate-200 dark:border-slate-800 pt-8">
                    <button 
                        onClick={() => setPage(p => p + 1)} 
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors shadow-sm"
                    >
                        Load More Records <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            )}
            </>
            )}
        </DashboardLayout>
    )
}
