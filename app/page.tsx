'use client';
import { DashboardLayout } from "@/components/DashboardLayout";
import { RefreshCcw, Search, Inbox, ShieldAlert, Banknote, Clock, Maximize2, Trash2, Smartphone, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

export default function AllMessagesCenter() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchMessages = async (currentPage = 1, isLoadMore = false) => {
        if (!isLoadMore) setLoading(true);
        try {
            const supabase = getSupabase();
            const limit = currentPage * 20;
            const queries = await Promise.all([
                supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(limit),
                supabase.from('otp_messages').select('*').order('created_at', { ascending: false }).limit(limit),
                supabase.from('bank_activity').select('*').order('created_at', { ascending: false }).limit(limit)
            ]);
            
            const normalize = (data: any[], table: string) => (data || []).map(d => ({ ...d, _table: table }));
            const all = [
                ...normalize(queries[0].data, 'messages'), 
                ...normalize(queries[1].data, 'otp_messages'), 
                ...normalize(queries[2].data, 'bank_activity')
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            setMessages(all);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages(page, page > 1);
    }, [page]);

    const handleRefresh = () => {
        setPage(1);
        fetchMessages(1, false);
    };

    const handleDelete = async (id: string, table: string) => {
        setDeleting(id);
        try {
            const supabase = getSupabase();
            await supabase.from(table).delete().eq('id', id);
            setMessages(prev => prev.filter(m => m.id !== id));
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(null);
        }
    };

    const filtered = messages.filter(m => 
        (m.body && m.body.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (m.sender && m.sender.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        Master Inbox 
                        <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 text-xs py-1 px-2.5 rounded-full font-semibold">ALL</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-lg">Comprehensive timeline of all synchronized messages across categories.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <button onClick={handleRefresh} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm text-slate-600 dark:text-slate-300">
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col justify-center items-center h-64 text-slate-400 space-y-4">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium">Synchronizing records...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Inbox className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No records found</h3>
                    <p className="text-slate-500 text-sm mt-1">Try adjusting your search criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((msg, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{msg.sender?.substring(0,2).toUpperCase()}</span>
                                        </div>
                                        <div className="truncate">
                                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{msg.sender}</p>
                                        </div>
                                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                                            {msg._table === 'otp_messages' ? 'OTP' : msg._table === 'bank_activity' ? 'Bank' : 'General'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                                        <div className="flex items-center gap-1.5 opacity-70">
                                            <Clock className="w-3 h-3" />
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <button 
                                            disabled={deleting === msg.id}
                                            onClick={() => handleDelete(msg.id, msg._table!)} 
                                            className="p-1.5 rounded bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                                            title="Delete Message"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                            </div>
                            {msg.metadata?.device && (
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                    <Smartphone className="w-3.5 h-3.5" />
                                    <span>{msg.metadata.device}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {!loading && filtered.length > 0 && filtered.length % 20 === 0 && (
                <div className="mt-8 flex justify-center pb-8 border-t border-slate-200 dark:border-slate-800 pt-8">
                    <button 
                        onClick={() => setPage(p => p + 1)} 
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors shadow-sm"
                    >
                        Load More Records <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            )}
        </DashboardLayout>
    )
}
