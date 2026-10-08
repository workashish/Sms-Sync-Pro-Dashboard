'use client';
import { parseMessage } from "@/lib/message-parser";
import { MessageBody } from "@/components/MessageBody";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RefreshCcw, KeyRound, Copy, Check, Clock, Trash2, Smartphone, ChevronDown, ChevronLeft, ChevronRight, Mail, MailOpen, Bell, BellRing, Filter } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getRecords, deleteRecord, updateMetadata } from "@/lib/data-client";

export default function OtpCodes() {
    const [messages, setMessages] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const requestSequence = useRef(0);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);
    
    // Filters
    const [filterUnread, setFilterUnread] = useState(false);
    const [filterReminder, setFilterReminder] = useState(false);

    const ITEMS_PER_PAGE = 12;
    
    const fetchMessages = async () => {
        const sequence = ++requestSequence.current;
        setLoading(true);
        setError(null);
        try {
            const { data, count } = await getRecords('otp_messages', ITEMS_PER_PAGE, { offset: (page - 1) * ITEMS_PER_PAGE, search: '', unread: filterUnread, reminder: filterReminder });
            if (sequence !== requestSequence.current) return;
            setMessages(data || []);
            setTotalCount(count || 0);
        } catch (e) {
            setError("Unable to load messages. Please retry.");
        } finally {
            if (sequence === requestSequence.current) setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        
        const interval = window.setInterval(fetchMessages, 5000);
        return () => { ++requestSequence.current; window.clearInterval(interval); };
    }, [page, filterUnread, filterReminder]);

    const handleRefresh = () => {
        setPage(1);
        fetchMessages();
    };

    const handleDelete = async (id: string) => {
        setDeleting(id);
        try {
            await deleteRecord('otp_messages', id);
            setMessages(prev => prev.filter(m => m.id !== id));
            setTotalCount(count => Math.max(0, count - 1));
            await fetchMessages();
        } catch (e) {
            setError("Unable to update messages. Please retry.");
            console.error(e);
        } finally {
            setDeleting(null);
        }
    };
    
    const toggleMetadata = async (msg: any, key: string) => {
        setUpdating(msg.id);
        try {
            const currentMeta = msg.metadata || {};
            const newValue = !currentMeta[key];
            const updatedMeta = { ...currentMeta, [key]: newValue };
            
            await updateMetadata('otp_messages', msg.id, key, newValue);
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, metadata: updatedMeta } : m));
            await fetchMessages();
        } catch (e) {
            setError("Unable to update messages. Please retry.");
            console.error(e);
        } finally {
            setUpdating(null);
        }
    };

    const extractOTP = (text: string) => parseMessage(text).code || null;

    const copyToClipboard = async (text: string, id: string) => {
        try { await navigator.clipboard.writeText(text); } catch { setError("Copy failed. Select and copy the code manually."); return; }
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };
    
    const filtered = messages.filter(m => {
        const meta = m.metadata || {};
        const isUnread = meta.is_unread === true;
        const isReminder = meta.is_reminder === true;
        if (filterUnread && !isUnread) return false;
        if (filterReminder && !isReminder) return false;
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
    useEffect(() => { if (!loading) setPage(p => Math.min(p, totalPages)); }, [totalPages, loading]);
    const paginatedMessages = messages;

    return (
        <DashboardLayout>
            {error && <p role="alert" className="mb-4 text-rose-600">{error}</p>}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <KeyRound className="w-8 h-8 text-orange-500" />
                        OTP & Codes
                    </h1>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button 
                        onClick={() => { setFilterUnread(!filterUnread); setPage(1); }} 
                        className={`p-2.5 rounded-xl border transition-colors shadow-sm flex items-center gap-2 text-sm font-medium ${filterUnread ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                    >
                        <Mail className="w-4 h-4" /> Unread
                    </button>
                    <button 
                        onClick={() => { setFilterReminder(!filterReminder); setPage(1); }} 
                        className={`p-2.5 rounded-xl border transition-colors shadow-sm flex items-center gap-2 text-sm font-medium ${filterReminder ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-500/20 dark:border-orange-500/30 dark:text-orange-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                    >
                        <Bell className="w-4 h-4" /> Reminders
                    </button>
                    <button aria-label="Refresh messages" onClick={handleRefresh} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm text-slate-600 dark:text-slate-300">
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
            {loading && page === 1 && messages.length === 0 && (
                <div className="flex flex-col justify-center items-center h-64 text-slate-400 space-y-4">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium">Synchronizing records...</p>
                </div>
            )}
            {!(loading && page === 1 && messages.length === 0) && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedMessages.length === 0 ? (
                     <div className="col-span-full py-20 text-center"><p className="text-slate-400">No OTP messages found</p></div>
                ) : paginatedMessages.map((m,i)=>{
                    const otp = m.metadata?.code || extractOTP(m.body);
                    const isUnread = m.metadata?.is_unread === true;
                    const isReminder = m.metadata?.is_reminder === true;
                    
                    return (
                    <div 
                        key={m.id} 
                        className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 ${isUnread ? 'border-l-4 border-l-orange-500' : 'border-slate-200 dark:border-slate-800'} shadow-sm flex flex-col justify-between group`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{m.sender?.substring(0,2).toUpperCase()}</span>
                                    </div>
                                    <span className={`font-bold text-slate-900 dark:text-slate-100 truncate ${isUnread ? 'font-black' : ''}`}>{m.sender}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        disabled={updating === m.id}
                                        onClick={() => toggleMetadata(m, 'is_reminder')} 
                                        className={`p-1.5 rounded transition-colors disabled:opacity-50 ${isReminder ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                                        title="Toggle Reminder"
                                    >
                                        {isReminder ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                                    </button>
                                    <button 
                                        disabled={updating === m.id}
                                        onClick={() => toggleMetadata(m, 'is_unread')} 
                                        className={`p-1.5 rounded transition-colors disabled:opacity-50 ${isUnread ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                                        title="Mark as Read/Unread"
                                    >
                                        {isUnread ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
                                    </button>
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
                            
                            {otp && (
                                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-xl flex items-center justify-between">
                                    <span className="text-2xl font-bold tracking-widest text-orange-600 dark:text-orange-400 font-mono">{otp}</span>
                                    <button 
                                        onClick={() => copyToClipboard(otp, m.id)}
                                        className="p-2 bg-white dark:bg-slate-800 rounded-lg hover:bg-orange-100 dark:hover:bg-slate-700 transition-colors border border-orange-200 dark:border-slate-700 text-orange-600 dark:text-orange-400 shadow-sm"
                                    >
                                        {copiedId === m.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-2">
                                <Clock className="w-3 h-3" />
                                {new Date(m.received_at || m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                            </div>

                            <MessageBody body={m.body} unread={isUnread} />
                        </div>
                        {m.metadata?.device_model && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                <Smartphone className="w-3.5 h-3.5" />
                                <span>{m.metadata.device_model}</span>
                            </div>
                        )}
                        </div>
                    )})}
            </div>
            
            {!loading && totalPages > 1 && (
                <div className="mt-8 flex justify-between items-center pb-8 border-t border-slate-200 dark:border-slate-800 pt-8">
                    <button 
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Page {page} of {totalPages}</span>
                    <button 
                        disabled={page === totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                    >
                         Next <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
            </>
            )}
        </DashboardLayout>
    )
}
