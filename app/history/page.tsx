"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/app/lib/api";
import {
  SessionResult,
  DetailedSessionResult,
  AttributeResult,
} from "@/app/lib/types";
import { STATUS_COLORS } from "@/app/lib/constants";
import PageHeader from "@/app/components/PageHeader";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [sessionDetails, setSessionDetails] =
    useState<DetailedSessionResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(
    new Set(),
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionDetails(selectedSessionId);
    } else {
      setSessionDetails(null);
    }
  }, [selectedSessionId]);

  const loadSessions = async () => {
    try {
      const res = await api.getSessions();
      setSessions(res.sessions);
      if (res.sessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(res.sessions[0].session_id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (id: string) => {
    setLoading(true);
    try {
      const details = await api.getSessionDetails(id);
      setSessionDetails(details);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedSessionId) return;
    window.location.href = await api.exportSessionUrl(selectedSessionId);
  };

  const handleDelete = async (clearAll: boolean) => {
    if (
      !confirm(
        clearAll
          ? "Are you sure you want to delete ALL sessions?"
          : "Are you sure you want to delete the selected sessions?",
      )
    )
      return;

    setIsDeleting(true);
    try {
      await api.deleteSessions(
        clearAll ? undefined : Array.from(selectedForDeletion),
        clearAll,
      );
      setSelectedForDeletion(new Set());
      await loadSessions();
      if (clearAll || selectedForDeletion.has(selectedSessionId)) {
        setSelectedSessionId("");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedForDeletion);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedForDeletion(next);
  };

  const filteredResults =
    sessionDetails?.results.filter(
      (r) => statusFilter === "All" || r.match_status === statusFilter,
    ) || [];

  // Extract dynamic extra columns
  const extraColumns = new Set<string>();
  filteredResults.forEach((r) => {
    if (r.extra_data) {
      try {
        // Handle postgres stringified json or raw object
        const extra =
          typeof r.extra_data === "string"
            ? JSON.parse(r.extra_data)
            : r.extra_data;
        Object.keys(extra).forEach((k) => extraColumns.add(k));
      } catch (e) {}
    }
  });
  // Exclude barcode and description from the catch-all extra columns since they are explicit
  const extraColsArray = Array.from(extraColumns).filter(c => c !== "barcode" && c !== "description");

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="History & Export"
        subtitle="View past extraction sessions and download results."
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/" },
          { label: "History" },
        ]}
      >
        <div id="tour-export" className="inline-block relative">
          <button
            onClick={handleExport}
            disabled={!selectedSessionId || !sessionDetails}
            className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            title={(!selectedSessionId || !sessionDetails) ? "Select a session to export" : "Export session to Excel"}
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
          Export to Excel
          </button>
        </div>
      </PageHeader>

      <div className="p-8 w-full mx-auto space-y-8 overflow-y-auto flex-1">
        {error && (
          <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-lg">
            {error}
          </div>
        )}

        {sessions.length === 0 && !loading && !error ? (
          <div className="flex flex-col items-center justify-center py-24 bg-bg-card border border-bg-input rounded-xl shadow-sm">
            <div className="mb-6 flex justify-center text-primary">
              <svg
                className="w-16 h-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-main mb-2">
              No extraction jobs found!
            </h2>
            <p className="text-text-muted mb-8 text-center max-w-md">
              Your database is completely fresh. Head over to the Attribute
              Master page to upload your first batch of ASINs and start
              extracting attributes.
            </p>
            <Link
              href="/input"
              className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all transform hover:scale-105 flex items-center gap-2"
            >
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Go to Input
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar: Session List */}
            <div className="bg-bg-card border border-bg-input rounded-xl overflow-hidden flex flex-col h-[700px]">
              <div className="p-4 bg-bg-dark border-b border-bg-input font-semibold text-text-main flex justify-between items-center">
                <span>Sessions</span>
                <div className="flex gap-2">
                  {selectedForDeletion.size > 0 && (
                    <button
                      onClick={() => handleDelete(false)}
                      disabled={isDeleting}
                      className="text-xs bg-status-error/20 hover:bg-status-error/40 text-status-error px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 min-w-[70px]"
                    >
                      {isDeleting ? "Deleting..." : `Delete (${selectedForDeletion.size})`}
                    </button>
                  )}
                  {sessions.length > 0 && (
                    <button
                      onClick={() => handleDelete(true)}
                      disabled={isDeleting}
                      className="text-xs bg-status-error/10 hover:bg-status-error/30 text-status-error px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 min-w-[70px]"
                    >
                      {isDeleting ? "Clearing..." : "Clear All"}
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.session_id}
                    onClick={() => setSelectedSessionId(s.session_id)}
                    className={`p-3 rounded-lg cursor-pointer border transition-colors flex gap-3 ${
                      selectedSessionId === s.session_id
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-transparent text-text-muted hover:bg-bg-input hover:text-text-main"
                    }`}
                  >
                    <div
                      onClick={(e) => toggleSelection(e, s.session_id)}
                      className="flex items-center justify-center pt-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedForDeletion.has(s.session_id)}
                        readOnly
                        className="cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1">
                        {new Date(s.timestamp).toLocaleString()}
                      </div>
                      <div className="text-xs opacity-80 flex justify-between">
                        <span>{s.asins_processed} ASINs</span>
                        <span
                          className={
                            s.status === "Complete"
                              ? "text-status-success"
                              : "text-status-warning"
                          }
                        >
                          {s.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && !loading && (
                  <div className="p-4 text-center text-sm text-text-muted">
                    No sessions found.
                  </div>
                )}
              </div>
            </div>

            {/* Main: Results Data Grid */}
            <div className="bg-bg-card border border-bg-input rounded-xl flex flex-col h-[700px] overflow-hidden">
              {/* Header & Filters */}
              <div className="p-4 border-b border-bg-input flex flex-col md:flex-row gap-4 justify-between items-center bg-bg-dark rounded-t-xl">
                <div className="flex flex-wrap gap-2">
                  {[
                    "All",
                    "Validated",
                    "Free Text",
                    "Unresolved",
                    "Failed",
                  ].map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                        statusFilter === f
                          ? "bg-primary text-white border-primary"
                          : "bg-transparent text-text-muted border-bg-input hover:border-text-muted"
                      }`}
                    >
                      {f}
                      {sessionDetails && f !== "All" && (
                        <span className="ml-2 opacity-70">
                          ({sessionDetails.stats[f] || 0})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="text-sm text-text-muted">
                  Showing {filteredResults.length} records
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto flex-1 w-full relative">
                <table className="w-full text-left text-sm text-text-main border-collapse whitespace-nowrap">
                  <thead className="bg-bg-dark sticky top-0 z-10 shadow-sm text-text-muted uppercase text-xs">
                    <tr>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        ASIN
                      </th>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        Attribute ID
                      </th>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        Product Type
                      </th>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        Brand
                      </th>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        Title
                      </th>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        Barcode
                      </th>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        Description
                      </th>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        Ref. Product Type
                      </th>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        Ref. Allowed Options
                      </th>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        Final Value
                      </th>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        Status
                      </th>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        Provider
                      </th>
                      <th className="p-4 font-semibold border-b border-bg-input">
                        Confidence
                      </th>
                      {extraColsArray.map((c) => (
                        <th
                          key={c}
                          className="p-4 font-semibold border-b border-bg-input text-primary/70"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bg-input">
                    {filteredResults.map((r, i) => {
                      let parsedExtra: any = {};
                      if (r.extra_data) {
                        try {
                          parsedExtra =
                            typeof r.extra_data === "string"
                              ? JSON.parse(r.extra_data)
                              : r.extra_data;
                        } catch (e) {}
                      }

                      return (
                        <tr
                          key={i}
                          className="hover:bg-bg-input/50 transition-colors"
                        >
                          <td className="p-4 font-mono text-xs">{r.asin}</td>
                          <td className="p-4 font-medium">{r.attribute_id}</td>
                          <td className="p-4 text-xs text-text-muted">
                            {r.product_type}
                          </td>
                          <td className="p-4 text-xs text-text-muted">
                            {r.brand}
                          </td>
                          <td
                            className="p-4 text-xs text-text-muted truncate max-w-[150px]"
                            title={r.title}
                          >
                            {r.title}
                          </td>
                          <td className="p-4 text-xs text-text-muted">
                            {parsedExtra["barcode"] || ""}
                          </td>
                          <td className="p-4 text-xs text-text-muted truncate max-w-[150px]" title={parsedExtra["description"] || ""}>
                            {parsedExtra["description"] || ""}
                          </td>
                          <td className="p-4 text-xs text-text-muted truncate max-w-[130px]">
                            {r.validated_product_type}
                          </td>
                          <td className="p-4 text-xs text-text-muted truncate max-w-[150px]">
                            {r.validated_allowed_options}
                          </td>
                          <td
                            className="p-4 font-semibold text-primary max-w-[200px] truncate"
                            title={r.final_value}
                          >
                            {r.final_value}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold border ${STATUS_COLORS[r.match_status] || STATUS_COLORS["Unresolved"]}`}
                            >
                              {r.match_status}
                            </span>
                          </td>
                          <td className="p-4 text-xs opacity-70">
                            {r.provider_used}
                          </td>
                          <td className="p-4 text-xs opacity-70">
                            {r.confidence != null
                              ? `${(r.confidence * 100).toFixed(1)}%`
                              : ""}
                          </td>
                          {extraColsArray.map((c) => (
                            <td key={c} className="p-4 text-xs text-text-muted">
                              {parsedExtra[c] || ""}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {filteredResults.length === 0 && !loading && (
                      <tr>
                        <td
                          colSpan={100}
                          className="p-8 text-center text-text-muted"
                        >
                          No results match this filter.
                        </td>
                      </tr>
                    )}
                    {loading && (
                      <tr>
                        <td
                          colSpan={100}
                          className="p-8 text-center text-text-muted"
                        >
                          Loading...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
