"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/app/lib/api";
import { SessionResult, DetailedSessionResult } from "@/app/lib/types";
import { STATUS_COLORS } from "@/app/lib/constants";

export type FeatureToolType = "attr_master" | "aplus" | "image_audit" | "listing_scrape";

interface Props {
  toolType: FeatureToolType;
}

export default function FeatureHistory({ toolType }: Props) {
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [sessionDetails, setSessionDetails] = useState<DetailedSessionResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"long" | "wide">("long");

  // ── Load session list (attr_master only for this pane) ─────────────────
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
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
  }, [selectedSessionId]);

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load selected session details ───────────────────────────────────────
  useEffect(() => {
    if (!selectedSessionId) {
      setSessionDetails(null);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const details = await api.getSessionDetails(selectedSessionId);
        setSessionDetails(details);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedSessionId]);

  // ── Export ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!selectedSessionId) return;
    window.location.href = await api.exportSessionUrl(selectedSessionId, viewMode);
  };

  // ── Delete ──────────────────────────────────────────────────────────────
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
      // Re-fetch
      const res = await api.getSessions();
      setSessions(res.sessions);
      if (clearAll || selectedForDeletion.has(selectedSessionId)) {
        setSelectedSessionId(res.sessions.length > 0 ? res.sessions[0].session_id : "");
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

  // ── Filtered results ────────────────────────────────────────────────────
  const filteredResults =
    sessionDetails?.results.filter(
      (r) => statusFilter === "All" || r.match_status === statusFilter,
    ) || [];

  // Extra dynamic columns
  const extraColumns = new Set<string>();
  filteredResults.forEach((r) => {
    if (r.extra_data) {
      try {
        const extra =
          typeof r.extra_data === "string" ? JSON.parse(r.extra_data) : r.extra_data;
        Object.keys(extra).forEach((k) => extraColumns.add(k));
      } catch (e) {}
    }
  });
  const extraColsArray = Array.from(extraColumns).filter(
    (c) => c !== "barcode" && c !== "description",
  );

  // Grouped / Wide pivot
  const { wideRows, wideCols } = useMemo(() => {
    if (!sessionDetails) return { wideRows: [], wideCols: [] };
    const grouped: Record<string, any> = {};
    const cols = new Set<string>();

    filteredResults.forEach((r) => {
      if (!grouped[r.asin]) {
        let parsedExtra: any = {};
        if (r.extra_data) {
          try {
            parsedExtra =
              typeof r.extra_data === "string" ? JSON.parse(r.extra_data) : r.extra_data;
          } catch (e) {}
        }
        grouped[r.asin] = {
          asin: r.asin,
          product_type: r.product_type,
          brand: r.brand,
          title: r.title,
          barcode: parsedExtra["barcode"] || "",
          description: parsedExtra["description"] || "",
        };
      }
      grouped[r.asin][r.attribute_id] = r.final_value;
      cols.add(r.attribute_id);
    });

    return { wideRows: Object.values(grouped), wideCols: Array.from(cols) };
  }, [filteredResults, sessionDetails]);

  // ── Empty state ─────────────────────────────────────────────────────────
  if (sessions.length === 0 && !loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-bg-card border border-bg-input rounded-xl">
        <svg className="w-14 h-14 text-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 className="text-xl font-bold text-text-main mb-2">No sessions found</h3>
        <p className="text-text-muted text-sm">Run your first processing job to see history here.</p>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export button row */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={!selectedSessionId || !sessionDetails}
          className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          title={(!selectedSessionId || !sessionDetails) ? "Select a session to export" : "Export session to Excel"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export {viewMode === "wide" ? "Grouped" : "Detailed"}
        </button>
      </div>

      {/* Main layout: sidebar + data grid */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">

        {/* ── Left Sidebar: Session List ────────────────────────────────── */}
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
                  className="text-xs bg-status-error/10 hover:bg-status-error/30 text-status-error px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1 truncate">
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

            {loading && sessions.length === 0 && (
              <div className="p-4 text-center text-sm text-text-muted animate-pulse">
                Loading sessions...
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Results Data Grid ───────────────────────────── */}
        <div className="bg-bg-card border border-bg-input rounded-xl flex flex-col h-[700px] overflow-hidden">

          {/* Filters + View Toggle Header */}
          <div className="p-4 border-b border-bg-input flex flex-col md:flex-row gap-4 justify-between items-center bg-bg-dark rounded-t-xl">
            <div className="flex flex-wrap gap-2">
              {["All", "Validated", "Free Text", "Unresolved", "Failed"].map((f) => (
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

            <div className="flex bg-bg-dark rounded-lg p-1 border border-bg-input">
              <button
                onClick={() => setViewMode("long")}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === "long" ? "bg-bg-input text-text-main shadow-sm" : "text-text-muted hover:text-text-main"
                }`}
              >
                Detailed
              </button>
              <button
                onClick={() => setViewMode("wide")}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === "wide" ? "bg-bg-input text-text-main shadow-sm" : "text-text-muted hover:text-text-main"
                }`}
              >
                Grouped (Pivot)
              </button>
            </div>

            <div className="text-sm text-text-muted">
              Showing {filteredResults.length} records &bull; {wideRows.length} unique ASINs
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1 w-full relative">
            {viewMode === "wide" ? (
              <table className="w-full text-left text-sm text-text-main border-collapse whitespace-nowrap">
                <thead className="bg-bg-dark sticky top-0 z-10 shadow-sm text-text-muted uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold border-b border-bg-input">ASIN</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Product Type</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Brand</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Title</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Barcode</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Description</th>
                    {wideCols.map((c) => (
                      <th key={c} className="p-4 font-semibold border-b border-bg-input text-primary">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-input">
                  {wideRows.map((r, i) => (
                    <tr key={i} className="hover:bg-bg-input/50 transition-colors">
                      <td className="p-4 font-mono text-xs">{r.asin}</td>
                      <td className="p-4 text-xs text-text-muted">{r.product_type}</td>
                      <td className="p-4 text-xs text-text-muted">{r.brand}</td>
                      <td className="p-4 text-xs text-text-muted truncate max-w-[150px]" title={r.title}>{r.title}</td>
                      <td className="p-4 text-xs text-text-muted">{r.barcode}</td>
                      <td className="p-4 text-xs text-text-muted truncate max-w-[150px]" title={r.description}>{r.description}</td>
                      {wideCols.map((c) => (
                        <td key={c} className="p-4 text-xs font-semibold text-primary max-w-[200px] truncate" title={r[c] || ""}>
                          {r[c] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {wideRows.length === 0 && !loading && (
                    <tr>
                      <td colSpan={100} className="p-8 text-center text-text-muted">
                        No results match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm text-text-main border-collapse whitespace-nowrap">
                <thead className="bg-bg-dark sticky top-0 z-10 shadow-sm text-text-muted uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold border-b border-bg-input">ASIN</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Attribute ID</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Product Type</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Brand</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Title</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Barcode</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Description</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Ref. Product Type</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Ref. Allowed Options</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Final Value</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Status</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Provider</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Confidence</th>
                    {extraColsArray.map((c) => (
                      <th key={c} className="p-4 font-semibold border-b border-bg-input text-primary/70">
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
                      <tr key={i} className="hover:bg-bg-input/50 transition-colors">
                        <td className="p-4 font-mono text-xs">{r.asin}</td>
                        <td className="p-4 font-medium">{r.attribute_id}</td>
                        <td className="p-4 text-xs text-text-muted">{r.product_type}</td>
                        <td className="p-4 text-xs text-text-muted">{r.brand}</td>
                        <td className="p-4 text-xs text-text-muted truncate max-w-[150px]" title={r.title}>{r.title}</td>
                        <td className="p-4 text-xs text-text-muted">{parsedExtra["barcode"] || ""}</td>
                        <td className="p-4 text-xs text-text-muted truncate max-w-[150px]" title={parsedExtra["description"] || ""}>{parsedExtra["description"] || ""}</td>
                        <td className="p-4 text-xs text-text-muted truncate max-w-[130px]">{r.validated_product_type}</td>
                        <td className="p-4 text-xs text-text-muted truncate max-w-[150px]">{r.validated_allowed_options}</td>
                        <td className="p-4 font-semibold text-primary max-w-[200px] truncate" title={r.final_value}>{r.final_value}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${STATUS_COLORS[r.match_status] || STATUS_COLORS["Unresolved"]}`}>
                            {r.match_status}
                          </span>
                        </td>
                        <td className="p-4 text-xs opacity-70">{r.provider_used}</td>
                        <td className="p-4 text-xs opacity-70">
                          {r.confidence != null ? `${(r.confidence * 100).toFixed(1)}%` : ""}
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
                      <td colSpan={100} className="p-8 text-center text-text-muted">
                        No results match this filter.
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan={100} className="p-8 text-center">
                        <div className="flex items-center justify-center gap-3 text-text-muted">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Loading session details...
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
