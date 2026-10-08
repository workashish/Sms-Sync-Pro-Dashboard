'use client';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Settings, Check, Monitor, Layout, Bell, Database, HardDrive, Trash2, Webhook, Send, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { purgeRecords, exportRecords } from "@/lib/data-client";

export default function SettingsCenter() {
    const [notifications, setNotifications] = useState(false);
    const [saved, setSaved] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const storedNotif = localStorage.getItem('syncpro_notifications') === 'true';
        setNotifications(storedNotif);
    }, []);

    const saveSettings = async () => {
        if (notifications) {
            if (!('Notification' in window)) { alert('This browser does not support notifications.'); return; }
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') { alert('Notifications are blocked. Allow them in your browser settings to enable alerts.'); return; }
        }
        localStorage.setItem('syncpro_notifications', String(notifications));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        window.dispatchEvent(new Event("syncpro-preferences"));
    };

    const clearAllData = async () => {
        if (!confirm("Are you sure you want to delete ALL messages and logs? This is irreversible.")) return;
        setClearing(true);
        try {
            await purgeRecords();
            alert("All database tables cleared.");
        } catch (e) {
            alert("Failed to clear database");
        }
        setClearing(false);
    };

    const exportData = async () => {
        setExporting(true);
        try {
            const { id } = await exportRecords();
            const link = document.createElement('a');
            link.href = `/api/export?id=${encodeURIComponent(id)}`;
            link.download = `syncpro-export-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(link); link.click(); link.remove();
        } catch (e) {
            alert("Failed to export data");
        }
        setExporting(false);
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
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-6 flex items-center gap-2"><Bell className="w-4 h-4" /> Session Alerts</h3>
                    
                    <label className="flex items-center justify-between cursor-pointer group">
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">Browser Notifications</p>
                            <p className="text-sm text-slate-500 mt-1">Show a browser notification when a new message arrives. Message contents stay hidden.</p>
                        </div>
                        <div className="relative inline-flex items-center">
                            <input type="checkbox" className="sr-only peer" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </div>
                    </label>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-6 flex items-center gap-2"><HardDrive className="w-4 h-4" /> Data Management</h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">Export All Records</p>
                            <p className="text-sm text-slate-500 mt-1 max-w-sm">Download a complete JSON backup of all retained message records.</p>
                        </div>
                        <button 
                            disabled={exporting}
                            onClick={exportData}
                            className="px-5 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" /> {exporting ? "Exporting..." : "Download JSON"}
                        </button>
                    </div>
                </div>

                <div className="bg-red-50 dark:bg-red-500/10 p-6 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm">
                    <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Database className="w-4 h-4" /> Danger Zone</h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">Purge Data Storage</p>
                            <p className="text-sm text-slate-500 mt-1 max-w-sm">Permanently delete all messages, auth codes, and synchronization logs from the database.</p>
                        </div>
                        <button 
                            disabled={clearing}
                            onClick={clearAllData}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" /> {clearing ? "Purging..." : "Clear DB"}
                        </button>
                    </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                    <button onClick={saveSettings} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2">
                        {saved && <Check className="w-4 h-4" />}
                        {saved ? "Saved for This Browser" : "Apply Preferences"}
                    </button>
                    <p className="text-xs text-slate-400">Settings are persisted locally to this device browser.</p>
                </div>
            </div>
        </DashboardLayout>
    )
}
