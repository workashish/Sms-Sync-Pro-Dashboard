'use client';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Settings, Database, Info } from 'lucide-react';

export default function SettingsCenter() {
    // Read Supabase config state
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return (
        <DashboardLayout>
                <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6 max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                            <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                            System Settings
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View system configuration and integration status.</p>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {/* Database Status Widget */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-5 flex items-start gap-4 transition-colors">
                        <div className={`p-3 rounded-full ${isSupabaseConfigured ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                            <Database className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                Supabase Integration
                                {isSupabaseConfigured ? (
                                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Connected</span>
                                ) : (
                                    <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Missing Config</span>
                                )}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {isSupabaseConfigured 
                                    ? "Your application is properly connected to a live Supabase backend. All webhooks will be routed to the database."
                                    : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables to enable persistence."
                                }
                            </p>
                            {!isSupabaseConfigured && (
                                <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded p-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                                    <p className="flex items-center text-slate-500 dark:text-slate-400 mb-2">
                                        <Info className="w-4 h-4 mr-2" /> Required Database Tables:
                                    </p>
                                    <ul className="list-disc pl-8 space-y-1">
                                        <li><span className="font-bold dark:text-slate-300">messages</span> (id, sender, body, time, created_at)</li>
                                        <li><span className="font-bold dark:text-slate-300">otp_messages</span> (id, sender, body, time, created_at, metadata)</li>
                                        <li><span className="font-bold dark:text-slate-300">bank_activity</span> (id, sender, body, time, created_at, metadata)</li>
                                        <li><span className="font-bold dark:text-slate-300">webhook_logs</span> (id, status, payload, error, created_at)</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DashboardLayout>
    )
}
