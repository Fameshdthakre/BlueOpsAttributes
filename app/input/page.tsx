"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "@/app/lib/api";
import { useApp } from "@/app/lib/AppContext";
import PageHeader from "@/app/components/PageHeader";

const findHeader = (headersLower: string[], ...keywords: string[]) => {
  return headersLower.find((h) => keywords.some((k) => h.includes(k)));
};

export default function InputPage() {
  const [asinFile, setAsinFile] = useState<File | null>(null);
  const [validationFile, setValidationFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKeys, setHasApiKeys] = useState<boolean | null>(null);

  // Auto-scroll logic variables for logs
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [logFilter, setLogFilter] = useState("All");
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const checkSettings = async () => {
      try {
        const conf = await api.getSettings();
        const hasKey =
          conf.providers?.OpenAI?.api_key ||
          conf.providers?.Gemini?.api_key ||
          conf.providers?.Claude?.api_key;
        setHasApiKeys(!!hasKey);
      } catch (err) {
        // If settings fail to load, default to true to not block the user unexpectedly
        setHasApiKeys(true);
      }
    };
    checkSettings();
  }, []);

  const {
    asinHeaders,
    setAsinHeaders,
    validationHeaders,
    setValidationHeaders,
    mappings,
    setMappings,
    valMappings,
    setValMappings,
    setJobsAndMap,
    jobs,
    totalJobsCount,
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
  } = useApp();

  const { asinCol, attrCol, ptypeCol, brandCol, titleCol } = mappings;
  const { valAttrCol, valPtypeCol, valDdCol } = valMappings;

  const handleAsinUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const f = e.target.files[0];
    setAsinFile(f);
    try {
      const res = await api.uploadFile(f);
      setAsinHeaders(res.headers);

      // Auto-detect mappings
      const h_lower = res.headers.map((h: string) => h.toLowerCase());

      const asinMatch = findHeader(h_lower, "asin");
      const attrMatch = findHeader(h_lower, "attribute");
      const ptypeMatch = findHeader(h_lower, "product type", "producttype");
      const brandMatch = findHeader(h_lower, "brand");
      const titleMatch = findHeader(h_lower, "title", "name");

      setMappings({
        asinCol: asinMatch ? res.headers[h_lower.indexOf(asinMatch)] : "",
        attrCol: attrMatch ? res.headers[h_lower.indexOf(attrMatch)] : "",
        ptypeCol: ptypeMatch ? res.headers[h_lower.indexOf(ptypeMatch)] : "",
        brandCol: brandMatch ? res.headers[h_lower.indexOf(brandMatch)] : "",
        titleCol: titleMatch ? res.headers[h_lower.indexOf(titleMatch)] : "",
      });

      // Store raw data in session storage for the process page
      sessionStorage.setItem("blueops_jobs_raw", JSON.stringify(res.data));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleValidationUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || !e.target.files[0]) return;
    const f = e.target.files[0];
    setValidationFile(f);
    try {
      const res = await api.uploadFile(f); // Just to get headers for mapping
      setValidationHeaders(res.headers);

      const h_lower = res.headers.map((h: string) => h.toLowerCase());

      const valAttrMatch = findHeader(h_lower, "attribute");
      const valPtypeMatch = findHeader(h_lower, "product type", "producttype");
      const valDdMatch = findHeader(h_lower, "allowed values", "dropdown");

      setValMappings({
        valAttrCol: valAttrMatch
          ? res.headers[h_lower.indexOf(valAttrMatch)]
          : "",
        valPtypeCol: valPtypeMatch
          ? res.headers[h_lower.indexOf(valPtypeMatch)]
          : "",
        valDdCol: valDdMatch ? res.headers[h_lower.indexOf(valDdMatch)] : "",
      });

      sessionStorage.setItem("blueops_val_raw", JSON.stringify(res.data));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Auto-load jobs when all requirements are met
  useEffect(() => {
    if (hasApiKeys === false || !asinCol || !attrCol) {
      // Requirements not met, don't load yet
      return;
    }

    if (validationFile && (!valAttrCol || !valDdCol)) {
      // Validation file present but columns missing, don't load
      return;
    }

    try {
      const asinDataStr = sessionStorage.getItem("blueops_jobs_raw");
      const valDataStr = sessionStorage.getItem("blueops_val_raw");

      if (!asinDataStr) return;

      const asinData = JSON.parse(asinDataStr);

      let validationMapToUse: Record<string, string[]> | null = null;
      if (validationFile && valDataStr) {
        const valData = JSON.parse(valDataStr);
        validationMapToUse = {};
        valData.forEach((row: any) => {
          const aId = row[valAttrCol]?.toString().trim() || "";
          const pType = valPtypeCol
            ? row[valPtypeCol]?.toString().trim() || ""
            : "";
          const vals =
            row[valDdCol]
              ?.toString()
              .split(",")
              .map((v: string) => v.trim())
              .filter(Boolean) || [];

          if (aId) {
            const key = pType ? `${aId}|${pType}` : aId;
            validationMapToUse![key] = vals;
          }
        });
      }

      const jobMap: Record<string, any> = {};
      asinData.forEach((row: any) => {
        const rowAsin = row[asinCol]?.toString().trim() || "";
        const rowAttr = row[attrCol]?.toString().trim() || "";
        if (!rowAsin || !rowAttr) return;

        const key = `${rowAsin}_${rowAttr}`;

        const extra = { ...row };
        [asinCol, attrCol, ptypeCol, brandCol, titleCol].forEach((c) => {
          if (c) delete extra[c];
        });

        jobMap[key] = {
          asin: rowAsin,
          attribute_id: rowAttr,
          product_type: ptypeCol ? row[ptypeCol]?.toString().trim() : "",
          brand: brandCol ? row[brandCol]?.toString().trim() : "",
          title: titleCol ? row[titleCol]?.toString().trim() : "",
          extra_data: extra,
        };
      });

      setJobsAndMap(Object.values(jobMap), validationMapToUse);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [
    hasApiKeys,
    asinCol,
    attrCol,
    ptypeCol,
    brandCol,
    titleCol,
    valAttrCol,
    valPtypeCol,
    valDdCol,
    validationFile,
    setJobsAndMap,
  ]);

  // Log scrolling
  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleDownloadLogs = () => {
    const text = logs
      .map((l) => `[${l.time}] [${l.level}] ${l.message}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blueops_logs_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const targetLimit = limit > 0 ? limit : totalJobsCount;
  const progressPercent =
    targetLimit > 0 ? Math.round((processedCount / targetLimit) * 100) : 0;

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="Attribute Master"
        subtitle="Upload your ASIN extraction jobs, configure, and process."
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/" },
          { label: "Attribute Master" },
        ]}
      >
        <a
          href={api.downloadTemplatesUrl()}
          id="tour-templates"
          className="bg-bg-input hover:bg-surface-2 text-accent px-4 py-2 rounded-lg font-medium border border-accent/20 hover:border-accent/50 transition-colors flex items-center gap-2 text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download Templates
        </a>
      </PageHeader>

      <div className="p-8 max-w-6xl mx-auto space-y-8 w-full overflow-y-auto flex-1">
        {error && (
          <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-lg">
            {error}
          </div>
        )}

        {hasApiKeys === false && (
          <div className="p-4 bg-status-warning/10 border border-status-warning/20 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-status-warning">
              <div className="text-2xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-status-warning"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold">Missing AI Provider API Key</h3>
                <p className="text-sm opacity-90">
                  You must add at least one API Key (OpenAI or Gemini) before
                  you can process ASINs.
                </p>
              </div>
            </div>
            <Link
              href="/settings"
              className="bg-status-warning hover:bg-status-warning/80 text-bg-dark px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap text-center flex items-center gap-2"
            >
              <span>Go to Settings</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ASIN Card */}
          <div
            className="bg-bg-card p-6 rounded-xl border border-bg-input"
            id="tour-asin-upload"
          >
            <h2 className="text-xl font-semibold mb-4 text-text-main flex items-center gap-2">
              <span className="text-primary">1</span> ASIN Job File
            </h2>

            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleAsinUpload}
              className="block w-full text-sm text-text-muted
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-white
              hover:file:bg-primary-hover
              cursor-pointer mb-6"
            />

            {asinHeaders.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">
                  Column Mapping
                </h3>
                <div className="bg-bg-dark rounded-lg overflow-x-auto w-full border border-bg-input">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-bg-input/50 text-text-muted">
                      <tr>
                        <th className="p-3 font-semibold w-1/3">Data Field</th>
                        <th className="p-3 font-semibold">Excel Column</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bg-input">
                      <tr>
                        <td className="p-3 text-text-main font-medium flex items-center gap-2">
                          ASIN{" "}
                          <span className="text-status-error text-xs">*</span>
                        </td>
                        <td className="p-2">
                          <select
                            value={asinCol}
                            onChange={(e) =>
                              setMappings({
                                ...mappings,
                                asinCol: e.target.value,
                              })
                            }
                            className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all"
                          >
                            <option value="">-- Select --</option>
                            {asinHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-text-main font-medium flex items-center gap-2">
                          Attribute ID{" "}
                          <span className="text-status-error text-xs">*</span>
                        </td>
                        <td className="p-2">
                          <select
                            value={attrCol}
                            onChange={(e) =>
                              setMappings({
                                ...mappings,
                                attrCol: e.target.value,
                              })
                            }
                            className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all"
                          >
                            <option value="">-- Select --</option>
                            {asinHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-text-main font-medium">
                          Product Type
                        </td>
                        <td className="p-2">
                          <select
                            value={ptypeCol}
                            onChange={(e) =>
                              setMappings({
                                ...mappings,
                                ptypeCol: e.target.value,
                              })
                            }
                            className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all"
                          >
                            <option value="">-- Optional --</option>
                            {asinHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-text-main font-medium">
                          Brand
                        </td>
                        <td className="p-2">
                          <select
                            value={brandCol}
                            onChange={(e) =>
                              setMappings({
                                ...mappings,
                                brandCol: e.target.value,
                              })
                            }
                            className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all"
                          >
                            <option value="">-- Optional --</option>
                            {asinHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-text-main font-medium">
                          Title
                        </td>
                        <td className="p-2">
                          <select
                            value={titleCol}
                            onChange={(e) =>
                              setMappings({
                                ...mappings,
                                titleCol: e.target.value,
                              })
                            }
                            className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all"
                          >
                            <option value="">-- Optional --</option>
                            {asinHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Validation Card */}
          <div
            className="bg-bg-card p-6 rounded-xl border border-bg-input"
            id="tour-validation-upload"
          >
            <h2 className="text-xl font-semibold mb-4 text-text-main flex items-center gap-2">
              <span className="text-primary">2</span> Validation File{" "}
              <span className="text-sm font-normal text-text-muted">
                (Optional)
              </span>
            </h2>

            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleValidationUpload}
              className="block w-full text-sm text-text-muted
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-white
              hover:file:bg-primary-hover
              cursor-pointer mb-6"
            />

            {validationHeaders.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">
                  Column Mapping
                </h3>
                <div className="bg-bg-dark rounded-lg overflow-x-auto w-full border border-bg-input">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-bg-input/50 text-text-muted">
                      <tr>
                        <th className="p-3 font-semibold w-1/3">Data Field</th>
                        <th className="p-3 font-semibold">Excel Column</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bg-input">
                      <tr>
                        <td className="p-3 text-text-main font-medium flex items-center gap-2">
                          Attribute ID{" "}
                          <span className="text-status-error text-xs">*</span>
                        </td>
                        <td className="p-2">
                          <select
                            value={valAttrCol}
                            onChange={(e) =>
                              setValMappings({
                                ...valMappings,
                                valAttrCol: e.target.value,
                              })
                            }
                            className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all"
                          >
                            <option value="">-- Select --</option>
                            {validationHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-text-main font-medium">
                          Product Type
                        </td>
                        <td className="p-2">
                          <select
                            value={valPtypeCol}
                            onChange={(e) =>
                              setValMappings({
                                ...valMappings,
                                valPtypeCol: e.target.value,
                              })
                            }
                            className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all"
                          >
                            <option value="">-- Optional --</option>
                            {validationHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-text-main font-medium flex items-center gap-2">
                          Allowed Values{" "}
                          <span className="text-status-error text-xs">*</span>
                        </td>
                        <td className="p-2">
                          <select
                            value={valDdCol}
                            onChange={(e) =>
                              setValMappings({
                                ...valMappings,
                                valDdCol: e.target.value,
                              })
                            }
                            className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all"
                          >
                            <option value="">-- Select --</option>
                            {validationHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Missing API Key Block if columns are mapped but jobs can't load */}
        {hasApiKeys === false && asinCol && attrCol && totalJobsCount === 0 && (
          <div className="bg-status-warning/10 border border-status-warning/30 rounded-xl p-6 mt-8 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4">
            <svg
              className="w-12 h-12 text-status-warning mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-bold text-text-main mb-2">Almost Ready!</h3>
            <p className="text-text-muted max-w-lg mb-6">
              You've mapped your columns successfully, but the processing dashboard is paused because you haven't configured an AI Provider API Key.
            </p>
            <Link
              href="/settings"
              className="bg-status-warning hover:bg-status-warning/80 text-bg-dark px-6 py-3 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg shadow-status-warning/20"
            >
              <span>Configure API Keys</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        )}

        {/* --- Processing Dashboard merged below --- */}
        {totalJobsCount > 0 && (
          <div
            id="processing-section"
            className="space-y-8 pt-8 border-t border-bg-input mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
              <h2 className="text-2xl font-bold text-text-main flex items-center gap-2">
                <span className="text-primary">3</span> Processing Dashboard{" "}
                <span className="text-sm font-normal text-text-muted">
                  ({totalJobsCount} Jobs)
                </span>
              </h2>

              <div className="flex gap-2 w-full md:w-auto">
                {!running ? (
                  <button
                    id="tour-start-process"
                    onClick={startProcessing}
                    className="flex-1 md:flex-none text-sm bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {processedCount > 0 ? "Resume" : "Start Extraction"}
                  </button>
                ) : (
                  <>
                    {paused ? (
                      <button
                        onClick={resumeProcessing}
                        className="flex-1 md:flex-none text-sm bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={pauseProcessing}
                        className="flex-1 md:flex-none text-sm bg-status-warning hover:bg-status-warning/80 text-bg-dark px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Pause
                      </button>
                    )}
                    <button
                      onClick={cancelProcessing}
                      className="flex-1 md:flex-none text-sm bg-status-error/10 hover:bg-status-error text-status-error hover:text-white border border-status-error/30 hover:border-status-error px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Controls */}
              <div className="bg-bg-card p-6 rounded-xl border border-bg-input space-y-4">
                <h3 className="font-semibold text-text-main mb-4">
                  Configuration
                </h3>

                <div>
                  <label className="block text-sm text-text-muted mb-1">
                    Process Limit (0 = All)
                  </label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    disabled={running}
                    className="w-full bg-bg-input border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-1">
                    Concurrency: {concurrency}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={concurrency}
                    onChange={(e) => setConcurrency(Number(e.target.value))}
                    disabled={running}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-text-muted mt-1">
                    <span>Sequential (1)</span>
                    <span>Fast (10)</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="md:col-span-2 bg-bg-card p-6 rounded-xl border border-bg-input">
                <h3 className="font-semibold text-text-main mb-4">
                  Live Progress
                </h3>

                <div className="w-full bg-bg-input rounded-full h-4 mb-2 overflow-hidden shadow-inner">
                  <div
                    className={`h-4 transition-all duration-300 ${running ? "bg-accent animate-pulse" : paused ? "bg-status-warning" : "bg-status-success"}`}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-text-muted mb-6">
                  <span>
                    {processedCount} / {targetLimit} ASINs processed
                  </span>
                  <span className="font-bold">{progressPercent}% Complete</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-bg-dark border border-status-success/20 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-status-success">
                      {validatedCount}
                    </div>
                    <div className="text-xs text-text-muted uppercase mt-1 tracking-wide font-medium">
                      Validated
                    </div>
                  </div>
                  <div className="bg-bg-dark border border-status-warning/20 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-status-warning">
                      {unresolvedCount}
                    </div>
                    <div className="text-xs text-text-muted uppercase mt-1 tracking-wide font-medium">
                      Unresolved
                    </div>
                  </div>
                  <div className="bg-bg-dark border border-status-error/20 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-status-error">
                      {failedCount}
                    </div>
                    <div className="text-xs text-text-muted uppercase mt-1 tracking-wide font-medium">
                      Failed
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Log */}
            <div className="bg-[#090C10] rounded-xl border border-bg-input shadow-inner flex flex-col h-[500px]">
              {/* Log Header / Toolbar */}
              <div className="p-3 border-b border-bg-input flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-dark rounded-t-xl">
                <div className="flex gap-2">
                  {["All", "INFO", "SUCCESS", "WARNING", "ERROR"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        logFilter === f
                          ? "bg-primary text-white border-primary"
                          : "bg-transparent text-text-muted border-bg-input hover:border-text-muted"
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
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="accent-primary rounded"
                    />
                    Follow Tail
                  </label>
                  <button
                    onClick={handleDownloadLogs}
                    disabled={logs.length === 0}
                    className="text-xs bg-bg-card hover:bg-bg-input border border-bg-input px-3 py-1 rounded text-text-main transition-colors disabled:opacity-50"
                  >
                    <svg
                      className="w-4 h-4 inline-block mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download
                  </button>
                </div>
              </div>

              {/* Log Body */}
              <div className="p-4 font-mono text-sm overflow-y-auto flex-1">
                {!enableLogs && (
                  <div className="text-status-warning italic mb-4 p-2 bg-status-warning/10 rounded">
                    ⚠️ Live UI Logs are disabled. Logs are still collected in
                    memory for downloading.
                  </div>
                )}

                {logs
                  .filter((l) => logFilter === "All" || l.level === logFilter)
                  .slice(-100)
                  .map((log, i) => {
                    const messageElements = log.message
                      .split(/(B[0-9A-Z]{9}|[0-9]{9}[0-9X])/g)
                      .map((part, idx) => {
                        if (/(B[0-9A-Z]{9}|[0-9]{9}[0-9X])/.test(part)) {
                          return (
                            <span
                              key={idx}
                              className="text-accent bg-accent/10 px-1 rounded"
                            >
                              {part}
                            </span>
                          );
                        }
                        return part;
                      });

                    return (
                      <div
                        key={i}
                        className="mb-2 leading-relaxed flex items-start"
                      >
                        <span className="text-slate-500 mr-3 shrink-0 mt-0.5">
                          {log.time}
                        </span>
                        <span
                          className={`mr-3 shrink-0 text-[10px] font-bold px-2 py-0.5 rounded mt-0.5 ${
                            log.level === "INFO"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : log.level === "SUCCESS"
                                ? "bg-status-success/20 text-status-success border border-status-success/30"
                                : log.level === "WARNING"
                                  ? "bg-status-warning/20 text-status-warning border border-status-warning/30"
                                  : "bg-status-error/20 text-status-error border border-status-error/30"
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="text-slate-300 break-all">
                          {messageElements}
                        </span>
                      </div>
                    );
                  })}
                {logs.length === 0 && (
                  <div className="text-slate-500 italic">
                    Waiting to start...
                  </div>
                )}
                {logs.length > 0 &&
                  logFilter !== "All" &&
                  logs.filter((l) => l.level === logFilter).length === 0 && (
                    <div className="text-slate-500 italic">
                      No {logFilter} logs found.
                    </div>
                  )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
