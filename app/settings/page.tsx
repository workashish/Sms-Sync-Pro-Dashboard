'use client';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Settings, Check, Monitor, Layout, Bell } from "lucide-react";
import { useState, useEffect } from "react";

export default function SettingsCenter() {
    const [compactMode, setCompactMode] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const storedCompact = localStorage.getItem('syncpro_compact') === 'true';
        const storedNotif = localStorage.getItem('syncpro_notifications') !== 'false';
        setCompactMode(storedCompact);
        setNotifications(storedNotif);
    }, []);

    const saveSettings = () => {
        localStorage.setItem('syncpro_compact', String(compactMode));
        localStorage.setItem('syncpro_notifications', String(notifications));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // Force reload to apply layout changes globally if applied to root layout
        window.location.reload();
    };

    return (
        <DashboardLayout>
            <div className="mb-8 px-2 max-w-3xl border-b border-slate-200 dark:border-slate-800 pb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <Settings className="w-8 h-8 text-slate-400" />
                    Preferences
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Manage functional application behavior and interface density locally.</p>
            </div>

            <div className="max-w-3xl space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-6 flex items-center gap-2"><Layout className="w-4 h-4" /> Interface Density</h3>
                    
                    <label className="flex items-center justify-between cursor-pointer group">
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">Compact View Mode</p>
                            <p className="text-sm text-slate-500 mt-1">Reduces padding in lists and sidebars to show more dense information on screen.</p>
                        </div>
                        <div className="relative inline-flex items-center">
                            <input type="checkbox" className="sr-only peer" checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </div>
                    </label>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-6 flex items-center gap-2"><Bell className="w-4 h-4" /> Session Alerts</h3>
                    
                    <label className="flex items-center justify-between cursor-pointer group">
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">Browser Notifications</p>
                            <p className="text-sm text-slate-500 mt-1">Play sound or show toasts for incoming synced payloads (experimental).</p>
                        </div>
                        <div className="relative inline-flex items-center">
                            <input type="checkbox" className="sr-only peer" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </div>
                    </label>
                </div>

                <div className="pt-4 flex items-center gap-4">
                    <button onClick={saveSettings} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2">
                        {saved && <Check className="w-4 h-4" />}
                        {saved ? "Saved Globally" : "Apply Preferences"}
                    </button>
                    <p className="text-xs text-slate-400">Settings are persisted locally to this device browser.</p>
                </div>
            </div>
        </DashboardLayout>
    )
}
