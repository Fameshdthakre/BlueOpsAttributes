"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Job } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/constants';

interface LogEntry {
  time: string;
  level: string;
  message: string;
}

export default function ProcessPage() {
  const router = useRouter();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [validationMap, setValidationMap] = useState<any>({});
  
  const [limit, setLimit] = useState(0); // 0 = all
  const [concurrency, setConcurrency] = useState(3);
  
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  
  // Progress state
  const [processedCount, setProcessedCount] = useState(0);
  const [validatedCount, setValidatedCount] = useState(0);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Mutex / Queue state refs to control fan-out across renders
  const queueRef = useRef<Job[]>([]);
  const runningCountRef = useRef(0);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Load state from sessionStorage on mount
    const rawData = sessionStorage.getItem("blueops_jobs_raw");
    const mappingsStr = sessionStorage.getItem("blueops_mappings");
    const valMapStr = sessionStorage.getItem("blueops_validation_map");
    
    if (!rawData || !mappingsStr) {
      router.push("/input");
      return;
    }
    
    const rows = JSON.parse(rawData);
    const mappings = JSON.parse(mappingsStr);
    const valMap = valMapStr ? JSON.parse(valMapStr) : {};
    
    // Group rows into Jobs by ASIN
    const jobMap: Record<string, Job> = {};
    
    rows.forEach((row: any) => {
      const asin = row[mappings.asinCol];
      const attr = row[mappings.attrCol];
      if (!asin || !attr) return;
      
      if (!jobMap[asin]) {
        jobMap[asin] = {
          asin,
          attributes: [],
          product_type: mappings.ptypeCol ? row[mappings.ptypeCol] : "",
          brand: mappings.brandCol ? row[mappings.brandCol] : "",
          title: mappings.titleCol ? row[mappings.titleCol] : "",
          extra_data: row
        };
      }
      const attrs = attr.split("|").map((a: string) => a.trim()).filter(Boolean);
      
      attrs.forEach((a: string) => {
        if (!jobMap[asin].attributes.includes(a)) {
          jobMap[asin].attributes.push(a);
        }
      });
    });
    
    setJobs(Object.values(jobMap));
    setValidationMap(valMap);
    setLimit(Object.values(jobMap).length);
  }, [router]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (level: string, message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, level, message }]);
  };

  const processNext = async () => {
    if (!runningRef.current || pausedRef.current || queueRef.current.length === 0) {
      return;
    }
    
    // If we've reached max concurrency, don't spawn more
    if (runningCountRef.current >= concurrency) {
      return;
    }
    
    const job = queueRef.current.shift();
    if (!job) return;
    
    runningCountRef.current++;
    addLog('INFO', `Starting job for ASIN: ${job.asin} (${job.attributes.length} attrs)`);
    
    try {
      const result = await api.processAsin(sessionIdRef.current!, job, validationMap);
      
      setProcessedCount(prev => prev + 1);
      
      let v = 0; let u = 0; let f = 0;
      result.results.forEach(r => {
        if (r.status === "Validated" || r.status === "Free Text") v++;
        else if (r.status === "Unresolved") u++;
        else f++;
      });
      
      setValidatedCount(prev => prev + v);
      setUnresolvedCount(prev => prev + u);
      setFailedCount(prev => prev + f);
      
      addLog('SUCCESS', `Completed ASIN ${job.asin} via ${result.provider_used}: ${result.status}`);
    } catch (err: any) {
      addLog('ERROR', `Failed ASIN ${job.asin}: ${err.message}`);
      setFailedCount(prev => prev + job.attributes.length);
      setProcessedCount(prev => prev + 1);
    } finally {
      runningCountRef.current--;
      
      // If queue is empty and nothing is running, we are done
      if (queueRef.current.length === 0 && runningCountRef.current === 0) {
        finishSession();
      } else {
        // Otherwise, spawn the next job
        processNext();
      }
    }
  };

  const startProcessing = async () => {
    setRunning(true);
    setPaused(false);
    runningRef.current = true;
    pausedRef.current = false;
    
    setProcessedCount(0);
    setValidatedCount(0);
    setUnresolvedCount(0);
    setFailedCount(0);
    setLogs([]);
    
    const jobsToRun = limit > 0 ? jobs.slice(0, limit) : jobs;
    queueRef.current = [...jobsToRun];
    
    addLog('INFO', `Creating session for ${jobsToRun.length} jobs...`);
    
    try {
      const res = await api.createSession("WebUpload");
      sessionIdRef.current = res.session_id;
      
      addLog('INFO', `Session created: ${res.session_id}. Starting fan-out with concurrency ${concurrency}...`);
      
      // Spawn initial workers
      for (let i = 0; i < concurrency; i++) {
        processNext();
      }
      
    } catch (err: any) {
      addLog('ERROR', `Failed to create session: ${err.message}`);
      setRunning(false);
      runningRef.current = false;
    }
  };

  const pauseProcessing = () => {
    setPaused(true);
    pausedRef.current = true;
    addLog('WARNING', 'Processing paused. Waiting for active jobs to finish...');
  };

  const resumeProcessing = () => {
    setPaused(false);
    pausedRef.current = false;
    addLog('INFO', 'Processing resumed.');
    // Respawn workers up to concurrency
    for (let i = runningCountRef.current; i < concurrency; i++) {
      processNext();
    }
  };

  const cancelProcessing = async () => {
    setRunning(false);
    runningRef.current = false;
    queueRef.current = [];
    addLog('ERROR', 'Processing cancelled. Active jobs will finish, but no new jobs will start.');
    if (sessionIdRef.current) {
      await api.updateSession(sessionIdRef.current, "Cancelled");
    }
  };

  const finishSession = async () => {
    setRunning(false);
    runningRef.current = false;
    addLog('SUCCESS', 'All jobs completed!');
    if (sessionIdRef.current) {
      await api.updateSession(sessionIdRef.current, "Complete");
    }
    // Optional: auto redirect to history
    // setTimeout(() => router.push(`/history?session=${sessionIdRef.current}`), 2000);
  };

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
