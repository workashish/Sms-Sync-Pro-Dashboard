'use client';
import { DashboardLayout } from "@/components/DashboardLayout";
import { PieChart as PieChartIcon, Activity, MessageSquare, KeyRound, Banknote } from "lucide-react";
import { useState, useEffect } from "react";
import { getAnalytics } from "@/lib/data-client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Pie, PieChart, Cell } from "recharts";

interface DailyCount {
    date: string;
    messages: number;
    otp: number;
    bank: number;
}

export default function AnalyticsCenter() {
    const [counts, setCounts] = useState({ messages: 0, otp: 0, bank: 0 });
    const [chartData, setChartData] = useState<DailyCount[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                
                const result = await getAnalytics();
                setCounts(result.counts);
                setChartData(result.days);
            } catch (e) {
                setError("Unable to load analytics. Please retry.");
                console.error("Failed to load analytics: ", e);
            }
            setLoading(false);
        };

        fetchAnalytics();
    }, []);

    const COLORS = ['#6366f1', '#f97316', '#10b981'];
    const pieData = [
        { name: 'General', value: counts.messages },
        { name: 'OTP', value: counts.otp },
        { name: 'Bank', value: counts.bank }
    ];

    return (
        <DashboardLayout>
            {error && <p role="alert" className="mb-4 text-rose-600">{error}</p>}
            <div className="mb-8 px-2 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Activity className="w-8 h-8 text-indigo-500" />
                        System Analytics
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-lg">Advanced traffic metrics and categorized data breakdown.</p>
                </div>
            </div>
            
            {loading ? (
                <div className="flex flex-col justify-center items-center h-64 text-slate-400 space-y-4">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium">Computing analytics...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-3 text-slate-500 mb-2">
                                <Activity className="w-5 h-5 text-indigo-500" />
                                <span className="font-semibold text-sm">Total Volume</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{counts.messages + counts.otp + counts.bank}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-3 text-slate-500 mb-2">
                                <MessageSquare className="w-5 h-5 text-blue-500" />
                                <span className="font-semibold text-sm">General Messages</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{counts.messages}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-3 text-slate-500 mb-2">
                                <KeyRound className="w-5 h-5 text-orange-500" />
                                <span className="font-semibold text-sm">OTP & Codes</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{counts.otp}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-3 text-slate-500 mb-2">
                                <Banknote className="w-5 h-5 text-emerald-500" />
                                <span className="font-semibold text-sm">Bank Activity</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{counts.bank}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Traffic Overview */}
                        <div className="col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-slate-800 dark:text-slate-200 font-bold mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-slate-400" /> Last 7 Days Volume
                            </h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                        <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(val) => val.split('-').slice(1).join('/')} axisLine={false} tickLine={false} />
                                        <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ fontSize: 13, fontWeight: 500 }}
                                        />
                                        <Bar dataKey="messages" name="General" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="otp" name="OTP" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="bank" name="Bank" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Relative Breakdown */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                            <h3 className="text-slate-800 dark:text-slate-200 font-bold mb-6 flex items-center gap-2">
                                <PieChartIcon className="w-4 h-4 text-slate-400" /> Relative Breakdown
                            </h3>
                            <div className="flex-1 flex items-center justify-center relative min-h-[220px]">
                                {(counts.messages + counts.otp + counts.bank) > 0 ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                                                itemStyle={{ fontSize: 13, fontWeight: 500 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-slate-400 text-sm">No data available to construct proportional layout.</p>
                                )}
                                {(counts.messages + counts.otp + counts.bank) > 0 && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                            {pieData.reduce((acc, curr) => acc + curr.value, 0)}
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium">TOTAL</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <div className="w-3 h-3 rounded-full bg-[#3b82f6] mx-auto mb-1.5"></div>
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">General</p>
                                </div>
                                <div>
                                    <div className="w-3 h-3 rounded-full bg-[#f97316] mx-auto mb-1.5"></div>
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">OTP</p>
                                </div>
                                <div>
                                    <div className="w-3 h-3 rounded-full bg-[#10b981] mx-auto mb-1.5"></div>
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Bank</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
