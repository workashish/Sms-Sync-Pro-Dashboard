'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                router.push('/');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || 'Invalid password');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 transition-colors">
            
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 text-center bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Secure Access</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Dashboard requires a master password to proceed.</p>
                </div>
                
                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-lg p-3 flex items-center text-rose-600 dark:text-rose-400 text-sm">
                                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                                {error}
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Master Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your dashboard password..."
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center transition-colors shadow-sm"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Unlock Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
            
            <p className="mt-8 text-xs text-slate-400 text-center uppercase tracking-wider font-bold">
                End-to-End Encrypted Sync Gateway
            </p>
        </div>
    );
}
