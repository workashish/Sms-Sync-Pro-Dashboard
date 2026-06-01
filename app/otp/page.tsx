'use client';
import { Sidebar } from "@/components/Sidebar";
import { RefreshCcw, ShieldAlert, Smartphone, Copy, Check, Inbox, Search, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatLocalTime } from "@/lib/timeUtils";

interface OtpMessage {
    id: string;
    sender: string;
    body: string;
    time: string;
    created_at?: string;
    metadata?: {
        code?: string;
        expiry_mins?: number;
    }
}

export default function OTPCenter() {
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<OtpMessage[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
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
            const { error: pbError } = await supabase.from('otp_messages').delete().eq('id', id);
            
            if (pbError) {
                console.warn("Delete remote error:", pbError);
            }

            setMessages(current => current.filter(m => m.id !== id));
            
            const stored = localStorage.getItem('sms_sync_otp_center');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    const updated = parsed.filter((m: any) => m.id !== id);
                    localStorage.setItem('sms_sync_otp_center', JSON.stringify(updated));
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
                .from('otp_messages')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (pbError) throw pbError;
            
            if (data) {
                setMessages(data as any);
            }
        } catch (err: any) {
            console.error("Failed to fetch OTPs from Supabase", err);
            const stored = localStorage.getItem('sms_sync_otp');
            if (stored) {
                try {
                    setMessages(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to parse local storage fallback");
                }
            } else {
                setError(err.message || "Failed to load OTPs.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();

        const supabase = getSupabase();
        const channel = supabase.channel('public:otp_messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'otp_messages' },
                (payload) => {
                    setMessages(current => [payload.new as OtpMessage, ...current]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleRefresh = () => {
        fetchMessages();
    };

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredMessages = messages.filter(msg => 
        msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (msg.metadata?.code || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
            <Sidebar />
            <main className="flex-1 overflow-auto p-8 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                        OTP Center
                    </h1>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search codes..."
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

                {messages.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col items-center justify-center p-12 text-center min-h-[400px] transition-colors">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                            <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No OTPs received yet</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                            Waiting for Two-Factor Authentication codes to be detected and extracted.
                        </p>
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col items-center justify-center p-12 text-center min-h-[400px] transition-colors">
                        <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No matches found</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                            Try adjusting your search query.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredMessages.map((msg) => {
                            const otpCode = msg.metadata?.code || "---";
                            const isExpanded = expandedIds.has(msg.id);
                            return (
                                <div key={msg.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative flex flex-col transition-colors cursor-pointer" onClick={() => toggleExpand(msg.id)}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 leading-none uppercase">{msg.sender}</p>
                                            <h4 className="text-2xl font-bold font-mono tracking-widest text-slate-800 dark:text-slate-100 mt-1">{otpCode}</h4>
                                        </div>
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">
                                            {formatLocalTime(msg.created_at, msg.time)}
                                        </span>
                                    </div>
                                    
                                    <p className={`text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed flex-1 ${isExpanded ? 'whitespace-pre-wrap break-words' : 'line-clamp-2'}`}>
                                        {msg.body}
                                    </p>
        
                                    <div className="flex gap-2 mt-auto">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleCopy(otpCode, msg.id); }}
                                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] py-1.5 rounded font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors uppercase"
                                        >
                                            {copiedId === msg.id ? 'COPIED!' : 'COPY CODE'}
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(e, msg.id)}
                                            className="w-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-500 transition-colors cursor-pointer"
                                            title="Delete Message"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
