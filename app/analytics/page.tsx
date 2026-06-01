'use client';
import { Sidebar } from "@/components/Sidebar";
import { PieChart as PieChartIcon, BarChart2, Activity } from 'lucide-react';
import { useState, useEffect } from "react";

export default function AnalyticsCenter() {
    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 overflow-auto p-8">
                <div className="mb-8 border-b border-slate-200 pb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <PieChartIcon className="w-6 h-6 text-blue-600" />
                        Analytics
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Activity metrics are currently unavailable due to insufficient historical payload data.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-64 text-center">
                        <BarChart2 className="w-8 h-8 text-slate-300 mb-3" />
                        <h3 className="text-sm font-bold text-slate-700">Traffic Analysis</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs text-center border p-2 rounded bg-slate-50 mt-4 leading-relaxed font-mono">
                           Awaiting data collection
                        </p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-64 text-center">
                        <Activity className="w-8 h-8 text-slate-300 mb-3" />
                        <h3 className="text-sm font-bold text-slate-700">Top Categories</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs text-center border p-2 rounded bg-slate-50 mt-4 leading-relaxed font-mono">
                           Awaiting data collection
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}
