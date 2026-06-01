'use client';
import { DashboardLayout } from "@/components/DashboardLayout";
import { RefreshCcw, ShieldCheck, Banknote } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

export default function BankActivity() {
    const [messages, setMessages] = useState<any[]>([]);
    
    const fetchMessages = async () => {
        const supabase = getSupabase();
        const { data } = await supabase.from('bank_activity').select('*').order('created_at', { ascending: false }).limit(20);
        if(data) setMessages(data);
    };

    useEffect(() => { fetchMessages(); }, []);

    return (
        <DashboardLayout>
            <div className="mb-8 px-2 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    Bank Verification
                </h1>
                <button onClick={fetchMessages} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm text-slate-600 dark:text-slate-300">
                    <RefreshCcw className="w-4 h-4" />
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {messages.length === 0 ? (
                     <div className="md:col-span-2 py-20 text-center"><p className="text-slate-400">No bank activity found</p></div>
                ) : messages.map((m,i)=>(
                    <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{m.sender}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                ))}
            </div>
        </DashboardLayout>
    )
}
