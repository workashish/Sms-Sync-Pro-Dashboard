'use client';
import { Sidebar } from "./Sidebar";
import { useState } from "react";
import { Menu, LayoutDashboard } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden font-sans selection:bg-blue-500/30">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl lg:shadow-none`}>
                <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950/20">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between px-4 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 z-30 sticky top-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <LayoutDashboard className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-lg">Sync Pro</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-blue-500/50 outline-none">
                        <Menu className="w-6 h-6" />
                    </button>
                </header>
                
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 relative">
                    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
