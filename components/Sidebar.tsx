'use client';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert, BadgeCent, MessageSquare, PieChart, Settings, LayoutDashboard, LogOut, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    const links = [
        { name: "Live Feed", href: "/", icon: LayoutDashboard },
        { name: "All Messages", href: "/all", icon: MessageSquare },
        { name: "OTP Center", href: "/otp", icon: ShieldAlert },
        { name: "Bank Activity", href: "/bank", icon: BadgeCent },
        { name: "Analytics", href: "/analytics", icon: PieChart },
        { name: "System Logs", href: "/logs", icon: MessageSquare },
        { name: "Settings", href: "/settings", icon: Settings },
    ];

    return (
        <aside className="bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col h-full w-72 transition-colors">
            <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-500/20">
                        <LayoutDashboard className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-lg">Sync Pro</span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="lg:hidden p-2 -mr-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
            <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-3 pb-2 pt-2">Dashboards</div>
                {links.slice(0, 5).map((link) => {
                    const active = pathname === link.href;
                    return (
                        <Link onClick={onClose} key={link.name} href={link.href} className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${active ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-slate-700/50 text-blue-600 dark:text-blue-400 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 font-medium hover:pl-4 border border-transparent"}`}>
                            <link.icon className={`shrink-0 h-4 w-4 ${active ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`} />
                            <span>{link.name}</span>
                        </Link>
                    )
                })}
                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-3 pb-2 pt-6">System</div>
                {links.slice(5).map((link) => {
                    const active = pathname === link.href;
                    return (
                        <Link onClick={onClose} key={link.name} href={link.href} className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${active ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-slate-700/50 text-blue-600 dark:text-blue-400 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 font-medium hover:pl-4 border border-transparent"}`}>
                            <link.icon className={`shrink-0 h-4 w-4 ${active ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`} />
                            <span>{link.name}</span>
                        </Link>
                    )
                })}
            </nav>
            <div className="mt-auto p-4 space-y-4 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm border-t border-slate-200/50 dark:border-slate-800/50">
                <div className="bg-white dark:bg-slate-950 rounded-xl p-3.5 border border-slate-200/70 dark:border-slate-800/70 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> System Integrity</p>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-slate-600 dark:text-slate-400">AES-256</span> <span className="text-emerald-600 dark:text-emerald-500 font-bold">Active</span>
                    </div>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-slate-600 dark:text-slate-400">HMAC</span> <span className="text-emerald-600 dark:text-emerald-500 font-bold">Verified</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Relay</span> <span className="text-emerald-600 dark:text-emerald-500 font-bold">Online</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-between px-2 pt-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Theme</span>
                    <ThemeToggle />
                </div>

                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 mt-2 rounded-xl text-sm border-slate-200/50 border dark:border-slate-800 text-rose-600 dark:text-rose-400 bg-rose-50/50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 font-medium transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    <span>Lock Dashboard</span>
                </button>
            </div>
        </aside>
    )
}
