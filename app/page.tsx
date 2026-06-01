'use client';
import { Sidebar } from "@/components/Sidebar";
import { RefreshCcw, Smartphone, ShieldCheck, Inbox, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

interface Message {
    id: string;
    sender: string;
    body: string;
    time: string;
    status: string;
    created_at?: string;
}

const formatTime = (isoString?: string, fallbackString?: string) => {
    if (isoString) {
        try {
            return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            // ignore
        }
    }
    return fallbackString || "";
};

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const supabase = getSupabase();
            const { data, error: pbError } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (pbError) throw pbError;
            
            if (data) {
                // Map DB schema to UI schema if necessary, assuming 1:1 for simplicity
                setMessages(data as any);
            }
        } catch (err: any) {
            console.error("Failed to fetch messages from Supabase", err);
            // Fallback to local storage if Supabase fails (e.g. not configured)
            const stored = localStorage.getItem('sms_sync_live_feed');
            if (stored) {
                try {
                    setMessages(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to parse local storage fallback");
                }
            } else {
                setError(err.message || "Failed to load messages.");
            }
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
        msg.body.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 overflow-auto p-8 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Feed</h1>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                            />
                        </div>
                        <button 
                            onClick={handleRefresh}
                            disabled={loading}
                            className="shrink-0 text-[10px] uppercase font-bold tracking-wider bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg flex items-center transition-colors text-slate-600 disabled:opacity-50 h-[38px]"
                        >
                            <RefreshCcw className={`w-3 h-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px] flex flex-col">
                    <div className="p-5 border-b border-slate-100 grid grid-cols-12 gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div className="col-span-3">Sender</div>
                        <div className="col-span-6">Message Body</div>
                        <div className="col-span-2">Time Received</div>
                        <div className="col-span-1 text-right">Status</div>
                    </div>
                    
                    {messages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                <Inbox className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 mb-1">No incoming messages</h3>
                            <p className="text-sm text-slate-500 max-w-sm mb-6">
                                Your SMS feed is awaiting data. Configure your relay provider to route messages to the webhook endpoint.
                            </p>
                            <div className="bg-slate-50 border border-slate-200 rounded text-left p-4 w-full max-w-md">
                                <p className="text-xs font-mono text-slate-600 break-all mb-2">
                                    <span className="text-slate-400 select-none">POST</span> /api/webhooks/incoming
                                </p>
                                <div className="text-[10px] font-mono text-slate-500 bg-white p-2 rounded border border-slate-100">
                                    {`{
  "sender": "+1...",
  "body": "Message content here..."
}`}
                                </div>
                            </div>
                        </div>
                    ) : filteredMessages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <Search className="w-8 h-8 text-slate-300 mb-3" />
                            <h3 className="text-sm font-bold text-slate-700 mb-1">No matches found</h3>
                            <p className="text-sm text-slate-500 max-w-sm">
                                Try adjusting your search query.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredMessages.map(msg => (
                                <div key={msg.id} className="p-5 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 transition-colors">
                                    <div className="col-span-3 font-medium text-slate-700 flex items-center">
                                        <Smartphone className="w-4 h-4 mr-2 text-slate-400" />
                                        {msg.sender}
                                    </div>
                                    <div className="col-span-6 text-sm text-slate-600 pr-4 truncate">
                                        {msg.body}
                                    </div>
                                    <div className="col-span-2 text-sm text-slate-500 font-mono">
                                        {formatTime(msg.created_at, msg.time)}
                                    </div>
                                    <div className="col-span-1 text-right flex justify-end">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
