'use client';
import { DashboardLayout } from "@/components/DashboardLayout";
import { PieChart as PieChartIcon } from "lucide-react";

export default function AnalyticsCenter() {
    return (
        <DashboardLayout>
            <div className="mb-8 px-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <PieChartIcon className="w-8 h-8 text-indigo-500" />
                    Analytics
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-lg">Advanced metrics and breakdown.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center h-32 flex items-center justify-center">
                    <p className="text-xl font-bold">120 Total</p>
               </div>
               <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center h-32 flex items-center justify-center">
                    <p className="text-xl font-bold text-orange-500">45 OTP</p>
               </div>
               <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center h-32 flex items-center justify-center">
                    <p className="text-xl font-bold text-emerald-500">20 Bank</p>
               </div>
            </div>
        </DashboardLayout>
    )
}
