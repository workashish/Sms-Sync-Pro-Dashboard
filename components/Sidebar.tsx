'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, BadgeCent, MessageSquare, PieChart, Settings, LayoutDashboard } from "lucide-react";

export function Sidebar() {
    const pathname = usePathname();
    const links = [
        { name: "Live Feed", href: "/", icon: LayoutDashboard },
        { name: "OTP Center", href: "/otp", icon: ShieldAlert },
        { name: "Bank Activity", href: "/bank", icon: BadgeCent },
        { name: "Analytics", href: "/analytics", icon: PieChart },
        { name: "Logs & Settings", href: "/settings", icon: Settings },
    ];

    return (
        <aside className="bg-white flex flex-col h-full border-r border-slate-200 w-64">
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-200 bg-white">
                <LayoutDashboard className="h-6 w-6 text-blue-600 mr-2" />
                <span className="font-semibold text-slate-900 tracking-tight">SMS Sync Pro</span>
            </div>
            <nav className="p-4 space-y-1 flex-1">
                {links.map((link) => {
                    const active = pathname === link.href;
                    return (
                        <Link key={link.name} href={link.href} className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors ${active ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50 font-medium"}`}>
                            <link.icon className={`shrink-0 h-4 w-4 ${active ? "text-blue-600" : "text-slate-400"}`} />
                            <span>{link.name}</span>
                        </Link>
                    )
                })}
            </nav>
            <div className="mt-auto p-4 border-t border-slate-100">
                <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">System Integrity</p>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">AES-256</span> <span className="text-emerald-600 font-bold">Active</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">HMAC</span> <span className="text-emerald-600 font-bold">Verified</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Relay</span> <span className="text-emerald-600 font-bold">Online</span>
                    </div>
                </div>
            </div>
        </aside>
    )
}
