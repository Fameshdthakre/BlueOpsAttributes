"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/AppContext';
import { STATUS_COLORS } from '@/lib/constants';

export default function ProcessPage() {
  const router = useRouter();
  
  const {
    jobs,
    limit, setLimit,
    concurrency, setConcurrency,
    running, paused,
    processedCount, validatedCount, unresolvedCount, failedCount,
    logs,
    startProcessing, pauseProcessing, resumeProcessing, cancelProcessing
  } = useApp();

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If jobs are completely empty and we're not running, we shouldn't be here
    if (jobs.length === 0 && !running && logs.length === 0) {
      router.push("/input");
    }
  }, [jobs, running, router, logs.length]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);



  const targetLimit = limit > 0 ? limit : jobs.length;
  const progressPercent = targetLimit > 0 ? Math.round((processedCount / targetLimit) * 100) : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Process Jobs</h1>
          <p className="text-text-muted mt-2">Loaded {jobs.length} unique ASINs.</p>
        </div>
        <div className="flex gap-4">
          {!running ? (
            <button onClick={startProcessing} className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
              ▶ Start
            </button>
          ) : (
            <>
              {paused ? (
                <button onClick={resumeProcessing} className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                  ▶ Resume
                </button>
              ) : (
                <button onClick={pauseProcessing} className="bg-status-warning hover:bg-status-warning/80 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                  ⏸ Pause
                </button>
              )}
              <button onClick={cancelProcessing} className="bg-status-error hover:bg-status-error/80 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                ⏹ Cancel
              </button>
            </>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-bg-card p-6 rounded-xl border border-bg-input space-y-4">
          <h3 className="font-semibold text-text-main mb-4">Configuration</h3>
          
          <div>
            <label className="block text-sm text-text-muted mb-1">Process Limit (0 = All)</label>
            <input 
              type="number" 
              value={limit} 
              onChange={e => setLimit(Number(e.target.value))}
              disabled={running}
              className="w-full bg-bg-input border-none rounded p-2 text-text-main"
            />
          </div>
          
          <div>
            <label className="block text-sm text-text-muted mb-1">Concurrency: {concurrency}</label>
            <input 
              type="range" 
              min="1" max="10" 
              value={concurrency}
              onChange={e => setConcurrency(Number(e.target.value))}
              disabled={running}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>Sequential (1)</span>
              <span>Fast (10)</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="md:col-span-2 bg-bg-card p-6 rounded-xl border border-bg-input">
          <h3 className="font-semibold text-text-main mb-4">Live Progress</h3>
          
          <div className="w-full bg-bg-input rounded-full h-4 mb-2 overflow-hidden">
            <div 
              className="bg-primary h-4 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-text-muted mb-6">
            <span>{processedCount} / {targetLimit} ASINs processed</span>
            <span>{progressPercent}% Complete</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-bg-dark border border-status-success/20 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-status-success">{validatedCount}</div>
              <div className="text-xs text-text-muted uppercase">Validated</div>
            </div>
            <div className="bg-bg-dark border border-status-warning/20 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-status-warning">{unresolvedCount}</div>
              <div className="text-xs text-text-muted uppercase">Unresolved</div>
            </div>
            <div className="bg-bg-dark border border-status-error/20 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-status-error">{failedCount}</div>
              <div className="text-xs text-text-muted uppercase">Failed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Log */}
      <div className="bg-[#090C10] p-4 rounded-xl border border-bg-input font-mono text-sm h-96 overflow-y-auto shadow-inner">
        {logs.map((log, i) => (
          <div key={i} className="mb-1 leading-relaxed">
            <span className="text-slate-500 mr-3">{log.time}</span>
            <span className={`mr-3 font-semibold ${
              log.level === 'INFO' ? 'text-blue-400' :
              log.level === 'SUCCESS' ? 'text-status-success' :
              log.level === 'WARNING' ? 'text-status-warning' :
              'text-status-error'
            }`}>{log.level}</span>
            <span className="text-slate-300">{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && <div className="text-slate-500 italic">Waiting to start...</div>}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
