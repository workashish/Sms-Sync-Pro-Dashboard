'use client';
import { MessageBody } from "@/components/MessageBody";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RefreshCcw, Search, Inbox, ShieldAlert, Banknote, Clock, Maximize2, Trash2, Smartphone, ChevronDown, ChevronLeft, ChevronRight, Mail, MailOpen, Bell, BellRing, Filter } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getRecords, deleteRecord, updateMetadata } from "@/lib/data-client";

export default function AllMessagesCenter() {
    const [messages, setMessages] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const requestSequence = useRef(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
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
            const { data, count } = await getRecords('all_messages', ITEMS_PER_PAGE, { offset: (page - 1) * ITEMS_PER_PAGE, search: searchTerm, unread: filterUnread, reminder: filterReminder });
            if (sequence !== requestSequence.current) return;
            setMessages(data || []);
            setTotalCount(count || 0);
        } catch (e) {
            setError("Unable to update messages. Please retry.");
            console.error(e);
        } finally {
            if (sequence === requestSequence.current) setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();

        
        const interval = window.setInterval(fetchMessages, 5000);
        return () => { ++requestSequence.current; window.clearInterval(interval); };
    }, [page, searchTerm, filterUnread, filterReminder]);

    const handleRefresh = () => {
        setPage(1);
        fetchMessages();
    };

    const handleDelete = async (id: string, table: string) => {
        setDeleting(id);
        try {
            await deleteRecord(table, id);
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
            
            await updateMetadata(msg._table, msg.id, key, newValue);
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, metadata: updatedMeta } : m));
            await fetchMessages();
        } catch (e) {
            setError("Unable to update messages. Please retry.");
            console.error(e);
        } finally {
            setUpdating(null);
        }
    };

    const filtered = messages.filter(m => {
        const meta = m.metadata || {};
        const matchesSearch = (m.body && m.body.toLowerCase().includes(searchTerm.toLowerCase())) || 
                              (m.sender && m.sender.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const isUnread = meta.is_unread === true;
        const isReminder = meta.is_reminder === true;

        if (!matchesSearch) return false;
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
                        Master Inbox 
                        <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 text-xs py-1 px-2.5 rounded-full font-semibold">ALL</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-lg">Comprehensive timeline of all synchronized messages across categories.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <div className="flex items-center gap-2">
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
                    </div>
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            aria-label="Search message records" placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <button aria-label="Refresh messages" onClick={handleRefresh} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm text-slate-600 dark:text-slate-300">
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading && messages.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-64 text-slate-400 space-y-4">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium">Synchronizing records...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div 
                    className="flex flex-col items-center justify-center py-20 text-center bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700"
                >
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Inbox className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No records found</h3>
                    <p className="text-slate-500 text-sm mt-1">Try adjusting your search criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginatedMessages.map((msg, i) => {
                        const isUnread = msg.metadata?.is_unread === true;
                        const isReminder = msg.metadata?.is_reminder === true;
                        
                        return (
                        <div 
                            key={msg.id} 
                            className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 ${isUnread ? 'border-l-4 border-l-indigo-500' : 'border-slate-200/60 dark:border-slate-800/60'} shadow-sm hover:shadow-md transition-all group flex flex-col justify-between`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{msg.sender?.substring(0,2).toUpperCase()}</span>
                                        </div>
                                        <div className="truncate">
                                            <p className={`font-bold text-sm truncate ${isUnread ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-slate-100'}`}>{msg.sender}</p>
                                        </div>
                                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                                            {msg._table === 'otp_messages' ? 'OTP' : msg._table === 'bank_activity' ? 'Bank' : 'General'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            disabled={updating === msg.id}
                                            onClick={() => toggleMetadata(msg, 'is_reminder')} 
                                            className={`p-1.5 rounded transition-colors disabled:opacity-50 ${isReminder ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                                            title="Toggle Reminder"
                                        >
                                            {isReminder ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                                        </button>
                                        <button 
                                            disabled={updating === msg.id}
                                            onClick={() => toggleMetadata(msg, 'is_unread')} 
                                            className={`p-1.5 rounded transition-colors disabled:opacity-50 ${isUnread ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                                            title="Mark as Read/Unread"
                                        >
                                            {isUnread ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
                                        </button>
                                        <button 
                                            disabled={deleting === msg.id}
                                            onClick={() => handleDelete(msg.id, msg._table!)} 
                                            className="p-1.5 rounded bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-50 ml-1"
                                            title="Delete Message"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-2">
                                    <Clock className="w-3 h-3" />
                                    {new Date(msg.received_at || msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                </div>
                                <MessageBody body={msg.body} unread={isUnread} />
                            </div>
                            {msg.metadata?.device_model && (
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                    <Smartphone className="w-3.5 h-3.5" />
                                    <span>{msg.metadata.device_model}</span>
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            )}
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
        </DashboardLayout>
    )
}
