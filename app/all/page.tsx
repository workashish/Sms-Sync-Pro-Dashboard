'use client';
import { Sidebar } from "@/components/Sidebar";
import { RefreshCcw, Smartphone, Inbox, Search, Trash2, LayoutList } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatLocalTime } from "@/lib/timeUtils";

interface Message {
    id: string;
    sender: string;
    body: string;
    time: string;
    status: string;
    created_at?: string;
    type?: string; 
    tableName?: string;
}

export default function AllMessages() {
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
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

    const handleDelete = async (e: React.MouseEvent, id: string, tableName: string) => {
        e.stopPropagation();
        try {
            const supabase = getSupabase();
            const { error: pbError } = await supabase.from(tableName).delete().eq('id', id);
            
            if (pbError) {
                console.warn("Delete remote error:", pbError);
            }

            setMessages(current => current.filter(m => m.id !== id));
            
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    const fetchMessages = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const supabase = getSupabase();
            
            const [msgRes, otpRes, bankRes] = await Promise.all([
                supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(100),
                supabase.from('otp_messages').select('*').order('created_at', { ascending: false }).limit(100),
                supabase.from('bank_activity').select('*').order('created_at', { ascending: false }).limit(100)
            ]);
            
            const combine: Message[] = [];
            
            if (msgRes.data) {
                msgRes.data.forEach(m => combine.push({ ...m, type: 'General', tableName: 'messages' }));
            }
            if (otpRes.data) {
                otpRes.data.forEach(m => combine.push({ ...m, type: 'OTP', tableName: 'otp_messages' }));
            }
            if (bankRes.data) {
                bankRes.data.forEach(m => combine.push({ ...m, type: 'Bank', tableName: 'bank_activity' }));
            }
            
            combine.sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            });
            
            setMessages(combine);
        } catch (err: any) {
            console.error("Failed to fetch messages from Supabase", err);
            setError(err.message || "Failed to load messages.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleRefresh = () => {
        fetchMessages();
    };

    const filteredMessages = messages.filter(msg => 
        msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.body.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (msg.type && msg.type.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
            <Sidebar />
            <main className="flex-1 overflow-auto p-8 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">All Messages</h1>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search messages..."
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
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 grid grid-cols-12 gap-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <div className="col-span-2">Sender</div>
                        <div className="col-span-1">Type</div>
                        <div className="col-span-6">Message Body</div>
                        <div className="col-span-2">Time Received</div>
                        <div className="col-span-1 text-right">Actions</div>
                    </div>
                    
                    {messages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                                <LayoutList className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No incoming messages</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                                Your SMS feed is awaiting data from all categories.
                            </p>
                        </div>
                    ) : filteredMessages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No matches found</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                                Try adjusting your search query.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredMessages.map(msg => {
                                const isExpanded = expandedIds.has(msg.id);
                                return (
                                <div 
                                    key={msg.id} 
                                    onClick={() => toggleExpand(msg.id)}
                                    className="p-5 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                >
                                    <div className="col-span-2 font-medium text-slate-700 dark:text-slate-300 flex items-center truncate">
                                        <Smartphone className="shrink-0 w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" />
                                        <span className="truncate">{msg.sender}</span>
                                    </div>
                                    <div className="col-span-1">
                                        <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${
                                            msg.type === 'OTP' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                            msg.type === 'Bank' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            {msg.type}
                                        </span>
                                    </div>
                                    <div className={`col-span-6 text-sm text-slate-600 dark:text-slate-400 pr-4 ${isExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                                        {msg.body}
                                    </div>
                                    <div className="col-span-2 text-sm text-slate-500 dark:text-slate-500 font-mono">
                                        {formatLocalTime(msg.created_at, msg.time)}
                                    </div>
                                    <div className="col-span-1 text-right flex justify-end gap-3 items-center">
                                        <button 
                                            onClick={(e) => handleDelete(e, msg.id, msg.tableName || 'messages')}
                                            className="text-slate-400 hover:text-rose-500 transition-colors"
                                            title="Delete Message"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
