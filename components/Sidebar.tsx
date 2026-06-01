'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, BadgeCent, MessageSquare, PieChart, Settings, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
    const pathname = usePathname();
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
        <aside className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full w-64 transition-colors">
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <LayoutDashboard className="h-6 w-6 text-blue-600 dark:text-blue-500 mr-2" />
                <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight">SMS Sync Pro</span>
            </div>
            <nav className="p-4 space-y-1 flex-1">
                {links.map((link) => {
                    const active = pathname === link.href;
                    return (
                        <Link key={link.name} href={link.href} className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors ${active ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"}`}>
                            <link.icon className={`shrink-0 h-4 w-4 ${active ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`} />
                            <span>{link.name}</span>
                        </Link>
                    )
                })}
            </nav>
            <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">System Integrity</p>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 dark:text-slate-400">AES-256</span> <span className="text-emerald-600 dark:text-emerald-500 font-bold">Active</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 dark:text-slate-400">HMAC</span> <span className="text-emerald-600 dark:text-emerald-500 font-bold">Verified</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Relay</span> <span className="text-emerald-600 dark:text-emerald-500 font-bold">Online</span>
                    </div>
                </div>
                <div className="flex items-center justify-between px-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Theme</span>
                    <ThemeToggle />
                </div>
            </div>
        </aside>
    )
}
