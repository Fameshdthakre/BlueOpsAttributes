"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/lib/AppContext';
import { STATUS_COLORS } from '@/lib/constants';

export default function ProcessPage() {
  const router = useRouter();
  
  const {
    jobs, totalJobsCount,
    limit, setLimit,
    concurrency, setConcurrency,
    running, paused,
    processedCount, validatedCount, unresolvedCount, failedCount,
    logs, enableLogs,
    startProcessing, pauseProcessing, resumeProcessing, cancelProcessing
  } = useApp();

  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const [logFilter, setLogFilter] = useState("All");
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleDownloadLogs = () => {
    const text = logs.map(l => `[${l.time}] [${l.level}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueops_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Intentionally removed the redirect.
    // If jobs are completely empty, we will render a beautiful Empty State instead.
  }, [totalJobsCount, running, logs.length]);

  const targetLimit = limit > 0 ? limit : totalJobsCount;
  const progressPercent = targetLimit > 0 ? Math.round((processedCount / targetLimit) * 100) : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in">
      {totalJobsCount === 0 && !running && logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-bg-card border border-bg-input rounded-xl shadow-sm mt-8">
          <div className="text-6xl mb-6">🚀</div>
          <h2 className="text-2xl font-bold text-text-main mb-2">Ready to process data?</h2>
          <p className="text-text-muted mb-8 text-center max-w-md">
            You haven't loaded any ASINs into memory yet. Head over to the Input page to map your columns and queue up a batch.
          </p>
          <Link 
            href="/input" 
            className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <span>📂</span> Upload Data on Input Page
          </Link>
        </div>
      ) : (
        <>
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Process Jobs</h1>
          <p className="text-text-muted mt-2">Loaded {totalJobsCount} unique ASINs.</p>
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
        <div className="bg-bg-card p-6 rounded-xl border border-bg-input space-y-4" id="tour-start-process">
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
      <div className="bg-[#090C10] rounded-xl border border-bg-input shadow-inner flex flex-col h-[500px]">
        {/* Log Header / Toolbar */}
        <div className="p-3 border-b border-bg-input flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-dark rounded-t-xl">
          <div className="flex gap-2">
            {['All', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'].map(f => (
              <button
                key={f}
                onClick={() => setLogFilter(f)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  logFilter === f 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-transparent text-text-muted border-bg-input hover:border-text-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-text-muted hover:text-text-main transition-colors">
              <input 
                type="checkbox" 
                checked={autoScroll}
                onChange={e => setAutoScroll(e.target.checked)}
                className="accent-primary"
              />
              Follow Tail
            </label>
            <button 
              onClick={handleDownloadLogs}
              disabled={logs.length === 0}
              className="text-xs bg-bg-card hover:bg-bg-input border border-bg-input px-3 py-1 rounded text-text-main transition-colors disabled:opacity-50"
            >
              📥 Download Logs
            </button>
          </div>
        </div>

        {/* Log Body */}
        <div className="p-4 font-mono text-sm overflow-y-auto flex-1">
          {!enableLogs && (
            <div className="text-status-warning italic mb-4 p-2 bg-status-warning/10 rounded">
              ⚠️ Live UI Logs are disabled. Logs are still collected in memory for downloading.
            </div>
          )}
          
          {logs
            .filter(l => logFilter === "All" || l.level === logFilter)
            .slice(-100)
            .map((log, i) => {
              // Regex to find ASINs (10 uppercase alphanumeric chars starting with B typically, but standard 10 alphanumeric is safe for Amazon)
              const messageElements = log.message.split(/(B[0-9A-Z]{9}|[0-9]{9}[0-9X])/g).map((part, idx) => {
                if (/(B[0-9A-Z]{9}|[0-9]{9}[0-9X])/.test(part)) {
                  return <span key={idx} className="text-accent bg-accent/10 px-1 rounded">{part}</span>;
                }
                return part;
              });

              return (
                <div key={i} className="mb-2 leading-relaxed flex items-start">
                  <span className="text-slate-500 mr-3 shrink-0 mt-0.5">{log.time}</span>
                  <span className={`mr-3 shrink-0 text-[10px] font-bold px-2 py-0.5 rounded mt-0.5 ${
                    log.level === 'INFO' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    log.level === 'SUCCESS' ? 'bg-status-success/20 text-status-success border border-status-success/30' :
                    log.level === 'WARNING' ? 'bg-status-warning/20 text-status-warning border border-status-warning/30' :
                    'bg-status-error/20 text-status-error border border-status-error/30'
                  }`}>{log.level}</span>
                  <span className="text-slate-300 break-all">{messageElements}</span>
                </div>
              );
            })}
          {logs.length === 0 && <div className="text-slate-500 italic">Waiting to start...</div>}
          {logs.length > 0 && logFilter !== "All" && logs.filter(l => l.level === logFilter).length === 0 && (
            <div className="text-slate-500 italic">No {logFilter} logs found.</div>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
        </>
      )}
    </div>
  );
}
