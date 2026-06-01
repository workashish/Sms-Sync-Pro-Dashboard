'use client';
import { DashboardLayout } from "@/components/DashboardLayout";
import { PieChart as PieChartIcon, BarChart2, Activity, MessageSquare, ShieldAlert, BadgeCent } from 'lucide-react';
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

export default function AnalyticsCenter() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        otp: 0,
        bank: 0,
        general: 0
    });
    
    useEffect(() => {
        let isMounted = true;
        const fetchStats = async () => {
            try {
                setLoading(true);
                const supabase = getSupabase();
                
                const [msgRes, otpRes, bankRes] = await Promise.all([
                    supabase.from('messages').select('*', { count: 'exact', head: true }),
                    supabase.from('otp_messages').select('*', { count: 'exact', head: true }),
                    supabase.from('bank_activity').select('*', { count: 'exact', head: true })
                ]);
                
                if (isMounted) {
                    const general = msgRes.count || 0;
                    const otp = otpRes.count || 0;
                    const bank = bankRes.count || 0;
                    
                    setStats({
                        total: general + otp + bank,
                        general,
                        otp,
                        bank
                    });
                }
            } catch (err) {
                console.error("Failed to load analytics", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        
        fetchStats();
        
        return () => { isMounted = false; };
    }, []);

    return (
        <DashboardLayout>
                <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <PieChartIcon className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                        Analytics Overview
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time breakdown of all ingested messages.</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><Activity className="w-16 h-16" /></div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Ingested</h3>
                                <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><MessageSquare className="w-16 h-16 text-blue-500" /></div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">General SMS</h3>
                                <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{stats.general}</p>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldAlert className="w-16 h-16 text-orange-500" /></div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">OTP / Auth</h3>
                                <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{stats.otp}</p>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><BadgeCent className="w-16 h-16 text-emerald-500" /></div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bank Activity</h3>
                                <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{stats.bank}</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">Traffic Analysis</h3>
                            {stats.total === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 dark:text-slate-400">
                                    <BarChart2 className="w-8 h-8 mb-3 opacity-50" />
                                    <p>Awaiting data collection</p>
                                </div>
                            ) : (
                                <div className="w-full h-8 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                    {stats.general > 0 && <div style={{ width: `${(stats.general / stats.total) * 100}%` }} className="h-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white transition-all" title={`General: ${stats.general}`}></div>}
                                    {stats.otp > 0 && <div style={{ width: `${(stats.otp / stats.total) * 100}%` }} className="h-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white transition-all" title={`OTP: ${stats.otp}`}></div>}
                                    {stats.bank > 0 && <div style={{ width: `${(stats.bank / stats.total) * 100}%` }} className="h-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white transition-all" title={`Bank: ${stats.bank}`}></div>}
                                </div>
                            )}
                            {stats.total > 0 && (
                                <div className="flex flex-wrap items-center gap-4 mt-6">
                                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-sm text-slate-600 dark:text-slate-400">General ({(stats.general/stats.total*100).toFixed(1)}%)</span></div>
                                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span><span className="text-sm text-slate-600 dark:text-slate-400">OTP ({(stats.otp/stats.total*100).toFixed(1)}%)</span></div>
                                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span><span className="text-sm text-slate-600 dark:text-slate-400">Bank ({(stats.bank/stats.total*100).toFixed(1)}%)</span></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DashboardLayout>
    )
}
