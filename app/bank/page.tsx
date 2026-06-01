'use client';
import { Sidebar } from "@/components/Sidebar";
import { RefreshCcw, Landmark, Inbox, Search, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatLocalTime } from "@/lib/timeUtils";

interface BankMessage {
    id: string;
    sender: string;
    body: string;
    time: string;
    created_at?: string;
    metadata?: {
        bank_type?: string;
        amount?: number;
    }
}

export default function BankActivity() {
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<BankMessage[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            const supabase = getSupabase();
            const { error: pbError } = await supabase.from('bank_activity').delete().eq('id', id);
            
            if (pbError) {
                console.warn("Delete remote error:", pbError);
            }

            setMessages(current => current.filter(m => m.id !== id));
            
            const stored = localStorage.getItem('sms_sync_bank_activity');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    const updated = parsed.filter((m: any) => m.id !== id);
                    localStorage.setItem('sms_sync_bank_activity', JSON.stringify(updated));
                } catch (err) {}
            }
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    const fetchMessages = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const supabase = getSupabase();
            const { data, error: pbError } = await supabase
                .from('bank_activity')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (pbError) throw pbError;
            
            if (data) {
                setMessages(data as any);
            }
        } catch (err: any) {
            console.error("Failed to fetch messages from Supabase", err);
            // Fallback to local storage if Supabase fails (e.g. not configured)
            const stored = localStorage.getItem('sms_sync_bank_activity');
            if (stored) {
                try {
                    setMessages(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to parse local storage fallback");
                }
            } else {
                setError(err.message || "Failed to load bank activity.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();

        const supabase = getSupabase();
        const channel = supabase.channel('public:bank_activity')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'bank_activity' },
                (payload) => {
                    setMessages(current => [payload.new as BankMessage, ...current]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const formatAmount = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g,"")) : amount;
        if (isNaN(num)) return `$${amount}`;
        return `$${num.toFixed(2)}`;
    };

    const handleRefresh = () => {
        fetchMessages();
    };

    const filteredMessages = messages.filter(msg => 
        msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (msg.metadata?.bank_type || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
            <Sidebar />
            <main className="flex-1 overflow-auto p-8 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Bank Activity</h1>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                            />
                        </div>
                        <button 
                            onClick={handleRefresh}
                            disabled={loading}
                            className="shrink-0 text-[10px] uppercase font-bold tracking-wider bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-lg flex items-center transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-50 h-[38px]"
                        >
                            <RefreshCcw className={`w-3 h-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px] flex flex-col transition-colors">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100/50 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                                <th className="p-4 font-bold w-1/4">Institution</th>
                                <th className="p-4 font-bold w-1/6">Type</th>
                                <th className="p-4 font-bold">Details</th>
                                <th className="p-4 font-bold">Time</th>
                                <th className="p-4 font-bold text-right w-1/6">Amount</th>
                                <th className="p-4 font-bold text-center w-12"></th>
                            </tr>
                        </thead>
                        {filteredMessages.length > 0 && (
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                {filteredMessages.map((msg) => {
                                    const isCredit = msg.metadata?.bank_type === 'DEPOSIT';
                                    const isDebit = msg.metadata?.bank_type === 'PAYMENT';
                                    const isExpanded = expandedIds.has(msg.id);
                                    
                                    return (
                                        <tr key={msg.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors cursor-pointer" onClick={() => toggleExpand(msg.id)}>
                                            <td className="p-4 font-medium flex items-center text-slate-700 dark:text-slate-300">
                                                <Landmark className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" />
                                                {msg.sender}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${isCredit ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : isDebit ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                                                    {msg.metadata?.bank_type || 'INFO'}
                                                </span>
                                            </td>
                                            <td className={`p-4 text-slate-600 dark:text-slate-400 max-w-[200px] ${isExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                                                {msg.body}
                                            </td>
                                            <td className="p-4 text-slate-500 font-mono text-xs">
                                                {formatLocalTime(msg.created_at, msg.time)}
                                            </td>
                                            <td className="p-4 text-right">
                                                {msg.metadata?.amount != null && (
                                                    <span className={`font-mono font-bold ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : isDebit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                                        {isCredit ? '+' : isDebit ? '-' : ''}{formatAmount(msg.metadata.amount as any)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={(e) => handleDelete(e, msg.id)}
                                                    className="text-slate-400 hover:text-rose-500 transition-colors"
                                                    title="Delete Message"
                                                >
                                                    <Trash2 className="w-4 h-4 ml-auto" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        )}
                    </table>
                    {messages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-t border-slate-100 dark:border-slate-800">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                                <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No transaction records</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                                Pending automated classification. Bank alerts forwarded to this dashboard will appear here after parsing.
                            </p>
                        </div>
                    ) : filteredMessages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-t border-slate-100 dark:border-slate-800">
                            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No matches found</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                                Try adjusting your search query.
                            </p>
                        </div>
                    ) : null}
                </div>
            </main>
        </div>
    )
}
