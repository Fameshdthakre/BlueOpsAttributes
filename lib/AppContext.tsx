"use client";

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { Job } from '@/lib/types';

export interface LogEntry {
  time: string;
  level: string;
  message: string;
}

interface AppContextType {
  // Input State
  asinHeaders: string[];
  setAsinHeaders: (headers: string[]) => void;
  validationHeaders: string[];
  setValidationHeaders: (headers: string[]) => void;
  mappings: any;
  setMappings: (mappings: any) => void;
  valMappings: any;
  setValMappings: (mappings: any) => void;
  
  // Job State
  jobs: Job[];
  totalJobsCount: number;
  validationMap: any;
  setJobsAndMap: (jobs: Job[], map: any) => void;
  
  // Process State
  limit: number;
  setLimit: (limit: number) => void;
  concurrency: number;
  setConcurrency: (concurrency: number) => void;
  running: boolean;
  paused: boolean;
  processedCount: number;
  validatedCount: number;
  unresolvedCount: number;
  failedCount: number;
  logs: LogEntry[];
  enableLogs: boolean;
  setEnableLogs: (enable: boolean) => void;
  
  // Actions
  startProcessing: () => Promise<void>;
  pauseProcessing: () => void;
  resumeProcessing: () => void;
  cancelProcessing: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Input Data
  const [asinHeaders, setAsinHeaders] = useState<string[]>([]);
  const [validationHeaders, setValidationHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<any>({
    asinCol: "",
    attrCol: "",
    ptypeCol: "",
    brandCol: "",
    titleCol: ""
  });
  const [valMappings, setValMappings] = useState<any>({
    valAttrCol: "",
    valPtypeCol: "",
    valDdCol: ""
  });
  
  // Process Data
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobsCount, setTotalJobsCount] = useState(0);
  const [validationMap, setValidationMap] = useState<any>({});
  
  const [limit, setLimit] = useState(0);
  const [concurrency, setConcurrency] = useState(1);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  
  const [processedCount, setProcessedCount] = useState(0);
  const [validatedCount, setValidatedCount] = useState(0);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [enableLogs, setEnableLogs] = useState(true);
  
  // Internal Refs for Orchestration
  const queueRef = useRef<Job[]>([]);
  const runningCountRef = useRef(0);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const concurrencyRef = useRef(1);
  const enableLogsRef = useRef(true);

  // Sync refs
  useEffect(() => {
    concurrencyRef.current = concurrency;
  }, [concurrency]);
  
  useEffect(() => {
    enableLogsRef.current = enableLogs;
  }, [enableLogs]);

  const addLog = (level: string, message: string) => {
    if (!enableLogsRef.current) return;
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, level, message }]);
  };

  const setJobsAndMap = (newJobs: Job[], newMap: any) => {
    setJobs(newJobs);
    setTotalJobsCount(newJobs.length);
    setValidationMap(newMap);
    setLimit(newJobs.length);
  };

  const processNext = async () => {
    if (!runningRef.current || pausedRef.current || queueRef.current.length === 0) {
      return;
    }
    
    if (runningCountRef.current >= concurrencyRef.current) {
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
      
      if (result.provider_used === "None") {
        addLog('ERROR', `Failed ASIN ${job.asin}: ${result.error || "All providers failed or missing API keys."}`);
      } else {
        addLog('SUCCESS', `Completed ASIN ${job.asin} via ${result.provider_used}: ${result.status}`);
      }
    } catch (err: any) {
      addLog('ERROR', `Failed ASIN ${job.asin}: ${err.message}`);
      setFailedCount(prev => prev + job.attributes.length);
      setProcessedCount(prev => prev + 1);
    } finally {
      runningCountRef.current--;
      
      if (queueRef.current.length === 0 && runningCountRef.current === 0) {
        finishSession();
      } else {
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
    setTotalJobsCount(jobsToRun.length);
    queueRef.current = [...jobsToRun];
    
    // Memory Optimization: Clear the large array from React State
    setJobs([]);
    
    addLog('INFO', `Creating session for ${jobsToRun.length} jobs...`);
    
    try {
      const res = await api.createSession("WebUpload");
      sessionIdRef.current = res.session_id;
      
      addLog('INFO', `Session created: ${res.session_id}. Starting fan-out with concurrency ${concurrency}...`);
      
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
    for (let i = runningCountRef.current; i < concurrencyRef.current; i++) {
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
  };

  return (
    <AppContext.Provider value={{
      asinHeaders, setAsinHeaders,
      validationHeaders, setValidationHeaders,
      mappings, setMappings,
      valMappings, setValMappings,
      jobs, totalJobsCount, validationMap, setJobsAndMap,
      limit, setLimit,
      concurrency, setConcurrency,
      running, paused,
      processedCount, validatedCount, unresolvedCount, failedCount,
      logs, enableLogs, setEnableLogs,
      startProcessing, pauseProcessing, resumeProcessing, cancelProcessing
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
