"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/app/lib/api";
import { DetailedSessionResult } from "@/app/lib/types";
import PageHeader from "@/app/components/PageHeader";

export default function AttributeMasterHistoryPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [sessionDetails, setSessionDetails] = useState<DetailedSessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"long" | "wide">("long");

  useEffect(() => {
    if (id) {
      loadSessionDetails(id);
    }
  }, [id]);

  const loadSessionDetails = async (sessionId: string) => {
    setLoading(true);
    try {
      const details = await api.getSessionDetails(sessionId);
      setSessionDetails(details);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!id) return;
    window.location.href = await api.exportSessionUrl(id, viewMode);
  };

  const filteredResults =
    sessionDetails?.results.filter(
      (r) => statusFilter === "All" || r.match_status === statusFilter,
    ) || [];

  const { wideRows, wideCols } = useMemo(() => {
    if (!sessionDetails) return { wideRows: [], wideCols: [] };
    const grouped: Record<string, any> = {};
    const cols = new Set<string>();
    
    filteredResults.forEach(r => {
      if (!grouped[r.asin]) {
        let parsedExtra: any = {};
        if (r.extra_data) {
          try {
            parsedExtra = typeof r.extra_data === "string" ? JSON.parse(r.extra_data) : r.extra_data;
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

  if (loading) {
    return <div className="p-8 flex justify-center text-text-muted">Loading session details...</div>;
  }

  if (error) {
    return <div className="p-8 text-status-error">{error}</div>;
  }

  if (!sessionDetails) {
    return <div className="p-8 text-text-muted">Session not found.</div>;
  }

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title={`Session Details: ${sessionDetails.session.input_file}`}
        subtitle={`Started at ${new Date(sessionDetails.session.timestamp).toLocaleString()}`}
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/" },
          { label: "History", href: "/history" },
          { label: "Attribute Master" },
        ]}
      >
        <div className="flex gap-2">
          <Link
            href="/history"
            className="px-4 py-2 bg-bg-dark border border-bg-input rounded-lg font-semibold text-text-main text-sm"
          >
            Back to History
          </Link>
          <button
            onClick={handleExport}
            className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm transition-colors"
          >
            Export {viewMode === "wide" ? "Grouped" : "Detailed"}
          </button>
        </div>
      </PageHeader>

      <div className="p-8 w-full mx-auto space-y-8 overflow-y-auto flex-1">
        <div className="bg-bg-card border border-bg-input rounded-xl flex flex-col min-h-[600px] overflow-hidden">
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
                  {f} <span className="ml-2 opacity-70">({f === "All" ? sessionDetails.results.length : sessionDetails.stats[f] || 0})</span>
                </button>
              ))}
            </div>
            
            <div className="flex bg-bg-dark rounded-lg p-1 border border-bg-input mt-4 lg:mt-0">
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
                Grouped
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1 w-full relative">
            {viewMode === "wide" ? (
              <table className="w-full text-left text-sm text-text-main border-collapse whitespace-nowrap">
                <thead className="bg-bg-dark sticky top-0 z-10 shadow-sm text-text-muted uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold border-b border-bg-input">ASIN</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Title</th>
                    {wideCols.map(c => (
                      <th key={c} className="p-4 font-semibold border-b border-bg-input text-primary">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-input">
                  {wideRows.map((r, i) => (
                    <tr key={i} className="hover:bg-bg-input/50 transition-colors">
                      <td className="p-4 font-mono text-xs">{r.asin}</td>
                      <td className="p-4 text-xs text-text-muted max-w-[200px] truncate" title={r.title}>{r.title}</td>
                      {wideCols.map(c => (
                        <td key={c} className="p-4 text-xs font-semibold text-primary">{r[c] || ""}</td>
                      ))}
                    </tr>
                  ))}
                  {wideRows.length === 0 && (
                    <tr><td colSpan={100} className="p-8 text-center text-text-muted">No results match this filter.</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm text-text-main border-collapse whitespace-nowrap">
                <thead className="bg-bg-dark sticky top-0 z-10 shadow-sm text-text-muted uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold border-b border-bg-input">ASIN</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Attribute</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Status</th>
                    <th className="p-4 font-semibold border-b border-bg-input">Final Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-input">
                  {filteredResults.map((r, i) => (
                    <tr key={i} className="hover:bg-bg-input/50 transition-colors">
                      <td className="p-4 font-mono text-xs">{r.asin}</td>
                      <td className="p-4 text-xs text-text-muted">{r.attribute_id}</td>
                      <td className="p-4 text-xs">
                        <span className={`px-2 py-1 rounded font-semibold bg-bg-dark border border-bg-input ${
                          r.match_status === "Validated" ? "text-status-success" :
                          r.match_status === "Failed" ? "text-status-error" : "text-status-warning"
                        }`}>
                          {r.match_status}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-semibold text-primary">{r.final_value}</td>
                    </tr>
                  ))}
                  {filteredResults.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-text-muted">No results match this filter.</td></tr>
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
