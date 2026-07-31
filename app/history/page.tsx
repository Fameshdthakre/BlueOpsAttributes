"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/app/lib/api";
import PageHeader from "@/app/components/PageHeader";
import ToolBadge, { ToolType } from "@/app/components/ToolBadge";
import { STATUS_COLORS } from "@/app/lib/constants";

export default function UnifiedHistoryPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setSessions([]);
    setOffset(0);
    setHasMore(true);
    loadHistory(0, filter, true);
  }, [filter]);

  const loadHistory = async (currentOffset: number, currentFilter: string, reset: boolean = false) => {
    try {
      setLoading(true);
      const res = await api.getUnifiedHistory(currentFilter, 50, currentOffset);
      if (reset) {
        setSessions(res.sessions);
      } else {
        setSessions(prev => [...prev, ...res.sessions]);
      }
      setHasMore(res.sessions.length === 50);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getHref = (tool: string, id: string) => {
    switch (tool) {
      case "attr_master": return `/history/attr-master/${id}`;
      case "aplus": return `/history/aplus/${id}`;
      case "image_audit": return `/history/image-audit/${id}`;
      case "listing_audit": return `/history/listing-audit/${id}`;
      default: return "#";
    }
  };

  const filters = [
    { id: "all", label: "All Tools" },
    { id: "attr_master", label: "Attribute Master" },
    { id: "aplus", label: "A+ Publisher" },
    { id: "image_audit", label: "Image Auditor" },
    { id: "listing_audit", label: "Listing Auditor" },
  ];

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="Unified History"
        subtitle="View past sessions across all BlueOps tools."
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/" },
          { label: "History" },
        ]}
      />

      <div className="flex border-b border-bg-input px-8 mt-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              filter === f.id
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-main"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="p-8 w-full max-w-6xl mx-auto space-y-8 flex-1">

        {error && (
          <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-bg-card border border-bg-input rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-text-main border-collapse">
            <thead className="bg-bg-dark border-b border-bg-input text-text-muted uppercase text-xs">
              <tr>
                <th className="p-4 font-semibold">Tool</th>
                <th className="p-4 font-semibold">Name / Input</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Progress</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-input">
              {sessions.map(s => (
                <tr key={`${s.tool_type}-${s.id}`} className="hover:bg-bg-input/50 transition-colors group">
                  <td className="p-4">
                    <ToolBadge tool={s.tool_type as ToolType} />
                  </td>
                  <td className="p-4 font-medium text-text-main">
                    {s.name || "Untitled Session"}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[s.status] || "text-text-muted bg-bg-dark border border-bg-input"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-4 text-text-muted">
                    {s.total_asins > 0 ? `${s.processed_asins} / ${s.total_asins}` : "-"}
                  </td>
                  <td className="p-4 text-text-muted">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={getHref(s.tool_type, s.id)}
                      className="text-primary hover:text-primary-hover font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View Details &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && !loading && !error && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-text-muted">
                    No sessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {hasMore && sessions.length > 0 && (
            <div className="p-4 border-t border-bg-input text-center">
              <button
                onClick={() => {
                  const nextOffset = offset + 50;
                  setOffset(nextOffset);
                  loadHistory(nextOffset, filter);
                }}
                disabled={loading}
                className="text-sm font-semibold text-primary hover:text-primary-hover"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
