'use client';

import React from 'react';
import { CircleAlert, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-dvh bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-900/60 dark:bg-slate-900">
            <CircleAlert className="mx-auto mb-4 h-10 w-10 text-rose-500" aria-hidden="true" />
            <h1 className="text-xl font-bold">The dashboard hit an unexpected error</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Reload this page to restore the latest data and connection.</p>
            <button onClick={() => window.location.reload()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reload dashboard
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
