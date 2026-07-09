'use client';
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Inbox, ShieldCheck, PieChart, Settings, LayoutDashboard, LogOut, X, RefreshCw } from "lucide-react";

export function Sidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();

    const [origin, setOrigin] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    const links = [
        { name: "Live Feed", href: "/live", icon: Activity },
        { name: "All Messages", href: "/", icon: Inbox },
        { name: "Bank Verification", href: "/bank", icon: ShieldCheck },
        { name: "OTP & Codes", href: "/otp", icon: RefreshCw },
        { name: "Analytics", href: "/analytics", icon: PieChart },
        { name: "System Logs", href: "/logs", icon: LayoutDashboard },
        { name: "Settings", href: "/settings", icon: Settings },
    ];

    return (
        <aside className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col h-full w-72 transition-colors">
            <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
                        <Activity className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-100 tracking-tight text-lg">Sync Pro</span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="lg:hidden p-2 -mr-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
            <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-3 pb-2 pt-2">Dashboards</div>
                {links.slice(0, 5).map((link) => {
                    const active = pathname === link.href;
                    return (
                        <Link onClick={onClose} key={link.name} href={link.href} className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${active ? "bg-indigo-50 dark:bg-indigo-500/10 shadow-sm border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 font-medium hover:pl-4 border border-transparent"}`}>
                            <link.icon className={`shrink-0 h-4 w-4 ${active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
                            <span>{link.name}</span>
                        </Link>
                    )
                })}
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-3 pb-2 pt-6">System</div>
                {links.slice(5).map((link) => {
                    const active = pathname === link.href;
                    return (
                        <Link onClick={onClose} key={link.name} href={link.href} className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${active ? "bg-indigo-50 dark:bg-indigo-500/10 shadow-sm border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 font-medium hover:pl-4 border border-transparent"}`}>
                            <link.icon className={`shrink-0 h-4 w-4 ${active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
                            <span>{link.name}</span>
                        </Link>
                    )
                })}
            </nav>
            <div className="p-4 mx-3 mb-3 bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl space-y-2">
                <h3 className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck className="w-3 h-3"/> App Setup</h3>
                <div className="space-y-2 text-xs">
                    <div>
                        <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Webhook URL:</span>
                        <code className="px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-indigo-600 dark:text-indigo-400 block break-all font-mono text-[10px] select-all cursor-text">
                            {origin ? `${origin}/api/webhooks/incoming` : '/api/webhooks/incoming'}
                        </code>
                    </div>
                    <div>
                        <span className="text-slate-500 dark:text-slate-400 block mb-0.5">AES Key:</span>
                        <div className="px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400 block text-[10px]">
                            Check <span className="font-mono text-indigo-600 dark:text-indigo-400">APP_AES_PASSWORD</span> on server
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/50">
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-sm border-slate-200/50 dark:border-slate-800 border text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-medium transition-colors shadow-sm"
                >
                    <LogOut className="h-4 w-4" />
                    <span>Lock Dashboard</span>
                </button>
            </div>
        </aside>
    )
}
