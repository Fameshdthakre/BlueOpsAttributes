"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { api } from "@/app/lib/api";
import { Job } from "@/app/lib/types";
import { set as idbSet, get as idbGet, del as idbDel } from "idb-keyval";
import { useCallback } from "react";

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
  asinFile: File | null;
  setAsinFile: (file: File | null) => void;
  validationFile: File | null;
  setValidationFile: (file: File | null) => void;
  // Job State
  jobs: Job[];
  totalJobsCount: number;
  validationMap: any;
  setJobsAndMap: (jobs: Job[], map: any) => void;

  // Process State
  limit: number | '';
  setLimit: (limit: number | '') => void;
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
  startProcessing: (existingSessionId?: string) => Promise<void>;
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
    titleCol: "",
    barcodeCol: "",
    descCol: "",
    urlsCol: "",
  });
  const [valMappings, setValMappings] = useState<any>({
    valAttrCol: "",
    valPtypeCol: "",
    valDdCol: "",
  });
  const [asinFile, setAsinFile] = useState<File | null>(null);
  const [validationFile, setValidationFile] = useState<File | null>(null);
  // Process Data
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobsCount, setTotalJobsCount] = useState(0);
  const [validationMap, setValidationMap] = useState<any>({});

  const [limit, setLimit] = useState<number | ''>(0);
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
  
  // Throttling logic
  const requestHistoryRef = useRef<number[]>([]);
  const rpmLimitRef = useRef(15);
  const isThrottledRef = useRef(false);

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
    setLogs((prev) => [...prev.slice(-499), { time, level, message }]);
  };

  const setJobsAndMap = useCallback(async (newJobs: Job[], newMap: any) => {
    // Store huge array in IndexedDB instead of memory
    await idbSet("blueops_jobs", newJobs);
    
    // We keep a lightweight list in state just for basic counting/rendering if needed, 
    // or we can just empty it. For UI purposes, we'll keep it empty to save memory,
    // and rely on totalJobsCount.
    setJobs([]);
    setTotalJobsCount(newJobs.length);
    setValidationMap(newMap);
  }, []);

  const processNext = async () => {
    if (
      !runningRef.current ||
      pausedRef.current ||
      queueRef.current.length === 0 ||
      isThrottledRef.current
    ) {
      return;
    }

    if (runningCountRef.current >= concurrencyRef.current) {
      return;
    }

    // --- RPM Throttling Check ---
    const now = Date.now();
    requestHistoryRef.current = requestHistoryRef.current.filter(t => now - t < 60000);
    if (requestHistoryRef.current.length >= rpmLimitRef.current) {
      const oldest = requestHistoryRef.current[0];
      const waitTime = 60000 - (now - oldest);
      addLog("WARNING", `RPM Limit reached (${rpmLimitRef.current}/min). Pausing queue for ${Math.ceil(waitTime/1000)}s...`);
      
      isThrottledRef.current = true;
      setTimeout(() => {
        isThrottledRef.current = false;
        // Resume queue
        for (let i = runningCountRef.current; i < concurrencyRef.current; i++) {
          processNext();
        }
      }, waitTime + 100);
      
      return;
    }
    
    // Register the request
    requestHistoryRef.current.push(now);
    // ----------------------------

    const job = queueRef.current.shift();
    if (!job) return;

    runningCountRef.current++;
    
    // Periodically save remaining queue to IDB so it can be recovered if page crashes
    if (queueRef.current.length % 100 === 0) {
      idbSet("blueops_jobs_queue", queueRef.current).catch(console.error);
    }
    addLog(
      "INFO",
      `Starting job for ASIN: ${job.asin} (${job.attributes.length} attrs)`,
    );

    try {
      const result = await api.processAsin(
        sessionIdRef.current!,
        job,
        validationMap,
      );

      setProcessedCount((prev) => prev + 1);

      let v = 0;
      let u = 0;
      let f = 0;
      result.results.forEach((r) => {
        if (r.status === "Validated" || r.status === "Free Text") v++;
        else if (r.status === "Unresolved") u++;
        else f++;
      });

      setValidatedCount((prev) => prev + v);
      setUnresolvedCount((prev) => prev + u);
      setFailedCount((prev) => prev + f);

      if (result.provider_used === "None") {
        addLog(
          "ERROR",
          `Failed ASIN ${job.asin}: ${result.error || "All providers failed or missing API keys."}`,
        );
      } else {
        const parts = [];
        if (v > 0) parts.push(`${v} Resolved`);
        if (u > 0) parts.push(`${u} Unresolved`);
        if (f > 0) parts.push(`${f} Failed`);
        const countsStr = parts.length > 0 ? parts.join(", ") : result.status;
        addLog(
          "SUCCESS",
          `Completed ASIN ${job.asin} via ${result.provider_used}: ${countsStr}`,
        );
      }
    } catch (err: any) {
      addLog("ERROR", `Failed ASIN ${job.asin}: ${err.message}`);
      setFailedCount((prev) => prev + job.attributes.length);
      setProcessedCount((prev) => prev + 1);
    } finally {
      runningCountRef.current--;

      if (queueRef.current.length === 0 && runningCountRef.current === 0) {
        finishSession();
      } else {
        processNext();
      }
    }
  };

  const startProcessing = async (existingSessionId?: string) => {
    setRunning(true);
    setPaused(false);
    runningRef.current = true;
    pausedRef.current = false;

    setProcessedCount(0);
    setValidatedCount(0);
    setUnresolvedCount(0);
    setFailedCount(0);
    setLogs([]);
    requestHistoryRef.current = [];
    isThrottledRef.current = false;

    // Fetch config to get RPM Limit
    try {
      const conf = await api.getSettings();
      const primary = conf.primary_provider || "Gemini";
      if (conf.providers && conf.providers[primary] && conf.providers[primary].rpm_limit) {
        rpmLimitRef.current = conf.providers[primary].rpm_limit;
      }
    } catch(e) {
      // ignore
    }

    const savedJobs = await idbGet<Job[]>("blueops_jobs") || [];
    const numLimit = typeof limit === 'number' ? limit : 0;
    const jobsToRun = numLimit > 0 ? savedJobs.slice(0, numLimit) : savedJobs;
    setTotalJobsCount(jobsToRun.length);
    queueRef.current = jobsToRun;

    // Clear original jobs to free disk/memory
    await idbDel("blueops_jobs");
    await idbSet("blueops_jobs_queue", queueRef.current);

    if (existingSessionId) {
      addLog("INFO", `Resuming existing session ${existingSessionId} for ${jobsToRun.length} jobs...`);
      sessionIdRef.current = existingSessionId;
      addLog(
        "INFO",
        `Starting fan-out with concurrency ${concurrency}...`,
      );
      for (let i = 0; i < concurrency; i++) {
        processNext();
      }
    } else {
      addLog("INFO", `Creating session for ${jobsToRun.length} jobs...`);

      try {
        const res = await api.createSession("WebUpload", validationMap);
        sessionIdRef.current = res.session_id;

        addLog(
          "INFO",
          `Session created: ${res.session_id}. Starting fan-out with concurrency ${concurrency}...`,
        );

        for (let i = 0; i < concurrency; i++) {
          processNext();
        }
      } catch (err: any) {
        addLog("ERROR", `Failed to create session: ${err.message}`);
        setRunning(false);
        runningRef.current = false;
      }
    }
  };

  const pauseProcessing = () => {
    setPaused(true);
    pausedRef.current = true;
    addLog(
      "WARNING",
      "Processing paused. Waiting for active jobs to finish...",
    );
  };

  const resumeProcessing = () => {
    setPaused(false);
    pausedRef.current = false;
    addLog("INFO", "Processing resumed.");
    for (let i = runningCountRef.current; i < concurrencyRef.current; i++) {
      processNext();
    }
  };

  const cancelProcessing = async () => {
    setRunning(false);
    runningRef.current = false;
    queueRef.current = [];
    idbDel("blueops_jobs_queue").catch(console.error);
    addLog(
      "ERROR",
      "Processing cancelled. Active jobs will finish, but no new jobs will start.",
    );
    if (sessionIdRef.current) {
      await api.updateSession(sessionIdRef.current, "Cancelled");
    }
  };

  const finishSession = async () => {
    setRunning(false);
    runningRef.current = false;
    idbDel("blueops_jobs_queue").catch(console.error);
    addLog("SUCCESS", "All jobs completed!");
    if (sessionIdRef.current) {
      await api.updateSession(sessionIdRef.current, "Complete");
    }
  };

  return (
    <AppContext.Provider
      value={{
        asinHeaders,
        setAsinHeaders,
        validationHeaders,
        setValidationHeaders,
        mappings,
        setMappings,
        valMappings,
        setValMappings,
        asinFile,
        setAsinFile,
        validationFile,
        setValidationFile,
        jobs,
        totalJobsCount,
        validationMap,
        setJobsAndMap,
        limit,
        setLimit,
        concurrency,
        setConcurrency,
        running,
        paused,
        processedCount,
        validatedCount,
        unresolvedCount,
        failedCount,
        logs,
        enableLogs,
        setEnableLogs,
        startProcessing,
        pauseProcessing,
        resumeProcessing,
        cancelProcessing,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
