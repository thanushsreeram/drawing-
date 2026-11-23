import React from 'react';
import { useHealthCheck } from '../hooks';
import { StatusBadge } from '../components';
import { API_BASE_URL } from '../services';

export const HomePage: React.FC = () => {
  const {
    state: connectionState,
    data,
    error,
    lastChecked,
    latencyMs,
    checkConnection,
    isLoading,
  } = useHealthCheck(true);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold text-lg text-white">
              S
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                SketchFlow AI
                <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Dev Init
                </span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Phase 1: Project Initialization</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full px-6 py-12 flex-1">
        {/* Hero Banner */}
        <div className="mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100 mb-3">
            AI-Powered Drawing Tutor
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed">
            SketchFlow AI is designed to help users learn to draw by deconstructing reference images into structured, step-by-step drawing lessons and guided worksheets.
          </p>
        </div>

        {/* Diagnostics & Connection Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Frontend Status Card */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl shadow-black/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  Client Runtime
                </span>
                <StatusBadge status="ready" label="Active" />
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Frontend Application</h3>
              <p className="text-sm text-slate-400 mb-4">
                React 19 + TypeScript + Vite + Tailwind CSS runtime is compiled and running cleanly.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-500 flex flex-col gap-1 font-mono">
              <div>Mode: Development</div>
              <div>Stack: React + Vite + Tailwind v4</div>
            </div>
          </div>

          {/* Backend Connection Status Card */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl shadow-black/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  Backend API Bridge
                </span>
                <StatusBadge status={connectionState} />
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">FastAPI Health Service</h3>
              <p className="text-sm text-slate-400 mb-4">
                Direct endpoint connection verification via <code className="text-indigo-400 font-mono text-xs bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">GET /api/health</code>
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1.5">
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-500">Target URL:</span>
                <span className="text-slate-300 truncate max-w-[200px]">{API_BASE_URL}</span>
              </div>
              {latencyMs !== null && (
                <div className="flex justify-between items-center font-mono">
                  <span className="text-slate-500">Latency:</span>
                  <span className="text-emerald-400">{latencyMs} ms</span>
                </div>
              )}
              {lastChecked && (
                <div className="flex justify-between items-center font-mono">
                  <span className="text-slate-500">Last Checked:</span>
                  <span className="text-slate-300">{lastChecked}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Response / Error Information */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/90 shadow-lg mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Health Endpoint Response
              </h4>
              <p className="text-xs text-slate-500">
                Live communication payload received from backend service.
              </p>
            </div>
            <button
              type="button"
              onClick={() => checkConnection()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Testing Connection...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Test Backend Connection</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto">
            {isLoading ? (
              <span className="text-slate-500 italic">Querying GET /api/health...</span>
            ) : error ? (
              <div className="text-rose-400">
                <span className="font-semibold block mb-1">Connection Error:</span>
                <span>{error}</span>
                <p className="mt-2 text-slate-500 text-[11px] not-italic">
                  Ensure the FastAPI backend is running via <code className="text-slate-400">uvicorn app.main:app --reload</code> on port 8000.
                </p>
              </div>
            ) : data ? (
              <pre className="text-emerald-400">{JSON.stringify(data, null, 2)}</pre>
            ) : (
              <span className="text-slate-500 italic">No request sent yet.</span>
            )}
          </div>
        </div>

        {/* System Architecture Notes for Next Phases */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Initialized Architecture Components
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-indigo-400 font-semibold block mb-1">Image Processing</span>
              <span className="text-slate-400">Validation &amp; 3x3 grid processor architecture prepared.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-indigo-400 font-semibold block mb-1">Storage Management</span>
              <span className="text-slate-400">Dedicated directories for uploads, sheets, steps, and lessons.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-indigo-400 font-semibold block mb-1">API Service Layer</span>
              <span className="text-slate-400">Typed requests with decoupled hooks and domain models.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-indigo-400 font-semibold block mb-1">CORS &amp; Security</span>
              <span className="text-slate-400">Restricted origins, environment variables, gitignored artifacts.</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 px-6 py-4 text-center text-xs text-slate-500">
        SketchFlow AI &bull; Project Initialization Phase &bull; Ready for Phase 2
      </footer>
    </div>
  );
};
