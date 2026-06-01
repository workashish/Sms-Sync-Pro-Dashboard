'use client';
import { Sidebar } from "@/components/Sidebar";
import { Settings, KeyRound, Search, Check, Save, Network, Database, Info } from 'lucide-react';
import { useState, useEffect } from "react";

const SYSTEM_SETTINGS = [
    {
        id: "webhook_secret",
        category: "Security",
        icon: KeyRound,
        title: "Webhook Secret Key (HMAC-SHA256)",
        description: "Used to sign and verify incoming webhook requests.",
        type: "password",
        default: "whsec_demokey_1234567890abcdef"
    },
    {
        id: "aes_key",
        category: "Security",
        icon: KeyRound,
        title: "AES-256 Encryption Key",
        description: "Used to encrypt payload data at rest.",
        type: "password",
        default: "aes_demokey_9876543210abcdef"
    },
    {
        id: "forwarding_url",
        category: "Network",
        icon: Network,
        title: "Forwarding URL",
        description: "Endpoint to forward unhandled SMS messages.",
        type: "text",
        default: "https://api.example.com/sms/forward"
    },
    {
        id: "retention_days",
        category: "Data",
        icon: Database,
        title: "Data Retention (Days)",
        description: "Number of days before old messages are automatically deleted.",
        type: "number",
        default: "30"
    }
];

export default function SettingsCenter() {
    const [searchQuery, setSearchQuery] = useState("");
    const [settingsState, setSettingsState] = useState<Record<string, string>>({});
    const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
    
    // Read Supabase config state
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    useEffect(() => {
        const stored = localStorage.getItem('sms_sync_settings');
        if (stored) {
            try {
                setSettingsState(JSON.parse(stored));
            } catch (err) {
                console.error("Failed to parse settings");
            }
        } else {
            // Initialize defaults
            const defaults = SYSTEM_SETTINGS.reduce((acc, curr) => {
                acc[curr.id] = curr.default;
                return acc;
            }, {} as Record<string, string>);
            setSettingsState(defaults);
        }
    }, []);

    const handleSave = (id: string, value: string) => {
        const updated = { ...settingsState, [id]: value };
        setSettingsState(updated);
        localStorage.setItem('sms_sync_settings', JSON.stringify(updated));
        
        setSavedStatus(prev => ({ ...prev, [id]: true }));
        setTimeout(() => {
            setSavedStatus(prev => ({ ...prev, [id]: false }));
        }, 2000);
    };

    const filteredSettings = SYSTEM_SETTINGS.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categories = Array.from(new Set(filteredSettings.map(s => s.category)));

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
            <Sidebar />
            <main className="flex-1 overflow-auto p-8 relative">
                <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6 max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                            <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                            System Settings
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure security keys, network routes, and data policies.</p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search settings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                        />
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
                    {categories.length === 0 ? (
                        <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center bg-white dark:bg-slate-900 flex flex-col items-center transition-colors">
                            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                            <h3 className="font-bold text-slate-700 dark:text-slate-300">No settings found</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Try adjusting your search terms.</p>
                        </div>
                    ) : (
                        categories.map(category => (
                            <div key={category} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                                <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 border-b border-slate-200 dark:border-slate-800">
                                    <h3 className="font-bold tracking-tight text-slate-800 dark:text-slate-300 uppercase text-xs">{category} Configuration</h3>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredSettings.filter(s => s.category === category).map((setting) => (
                                        <div key={setting.id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center">
                                                    <setting.icon className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2" />
                                                    {setting.title}
                                                </h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{setting.description}</p>
                                            </div>
                                            <div className="w-full md:w-96 flex-shrink-0 flex items-center gap-2">
                                                <input 
                                                    type={setting.type}
                                                    value={settingsState[setting.id] || ""}
                                                    onChange={(e) => setSettingsState(prev => ({ ...prev, [setting.id]: e.target.value }))}
                                                    onBlur={(e) => handleSave(setting.id, e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300 rounded px-3 py-2 text-sm outline-none font-mono transition-all" 
                                                />
                                                <button
                                                    onClick={() => handleSave(setting.id, settingsState[setting.id] || "")}
                                                    className={`shrink-0 h-9 w-9 flex items-center justify-center rounded border transition-colors ${savedStatus[setting.id] ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                                    title="Save"
                                                >
                                                    {savedStatus[setting.id] ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    )
}
