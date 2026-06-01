'use client';
import { Sidebar } from "@/components/Sidebar";
import { RefreshCcw, ShieldAlert, Smartphone, Copy, Check, Inbox, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

interface OtpMessage {
    id: string;
    sender: string;
    body: string;
    time: string;
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
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 overflow-auto p-8 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        OTP Center
                    </h1>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search codes..."
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

                {messages.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <Inbox className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 mb-1">No OTPs received yet</h3>
                        <p className="text-sm text-slate-500 max-w-sm mb-6">
                            Waiting for Two-Factor Authentication codes to be detected and extracted.
                        </p>
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                        <Search className="w-8 h-8 text-slate-300 mb-3" />
                        <h3 className="text-sm font-bold text-slate-700 mb-1">No matches found</h3>
                        <p className="text-sm text-slate-500 max-w-sm">
                            Try adjusting your search query.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredMessages.map((msg) => {
                            const otpCode = msg.metadata?.code || "---";
                            return (
                                <div key={msg.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative flex flex-col">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 leading-none uppercase">{msg.sender}</p>
                                            <h4 className="text-2xl font-bold font-mono tracking-widest text-slate-800 mt-1">{otpCode}</h4>
                                        </div>
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                            {msg.time}
                                        </span>
                                    </div>
                                    
                                    <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed flex-1">
                                        {msg.body}
                                    </p>
        
                                    <div className="flex gap-2 mt-auto">
                                        <button 
                                            onClick={() => handleCopy(otpCode, msg.id)}
                                            className="flex-1 bg-white border border-slate-200 text-slate-700 text-[10px] py-1.5 rounded font-bold hover:bg-slate-50 transition-colors uppercase"
                                        >
                                            {copiedId === msg.id ? 'COPIED!' : 'COPY CODE'}
                                        </button>
                                        <div className="w-8 flex items-center justify-center bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-400">
                                            <Smartphone className="w-3 h-3" />
                                        </div>
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
