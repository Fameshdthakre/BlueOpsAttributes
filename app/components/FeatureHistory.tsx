"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/app/lib/api";
import { STATUS_COLORS } from "@/app/lib/constants";

export type FeatureToolType = "attr_master" | "aplus" | "image_audit" | "listing_audit";

const getHref = (tool: FeatureToolType, id: string) => {
  switch (tool) {
    case "attr_master": return `/history/attr-master/${id}`;
    case "aplus": return `/history/aplus/${id}`;
    case "image_audit": return `/history/image-audit/${id}`;
    case "listing_audit": return `/history/listing-audit/${id}`;
  }
};

interface Props {
  toolType: FeatureToolType;
}

export default function FeatureHistory({ toolType }: Props) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadHistory = useCallback(async (currentOffset: number, reset = false) => {
    try {
      setLoading(true);
      const res = await api.getUnifiedHistory(toolType, 50, currentOffset);
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
  }, [toolType]);

  useEffect(() => {
    setSessions([]);
    setOffset(0);
    setHasMore(true);
    loadHistory(0, true);
  }, [loadHistory]);

  if (error) {
    return (
      <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-bg-card border border-bg-input rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-text-main border-collapse">
          <thead className="bg-bg-dark border-b border-bg-input text-text-muted uppercase text-xs">
            <tr>
              <th className="p-4 font-semibold">Name / Input</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Progress</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-input">
            {sessions.map(s => (
              <tr key={s.id} className="hover:bg-bg-input/50 transition-colors group">
                <td className="p-4 font-medium text-text-main">
                  {s.name || "Untitled Session"}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[s.status] || "text-text-muted bg-bg-dark border border-bg-input"}`}>
                    {s.status}
                  </span>
                </td>
                <td className="p-4 text-text-muted">
                  {s.total_asins > 0 ? `${s.processed_asins} / ${s.total_asins}` : "—"}
                </td>
                <td className="p-4 text-text-muted">
                  {new Date(s.created_at).toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  <Link
                    href={getHref(toolType, s.id)}
                    className="text-primary hover:text-primary-hover font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    View Details →
                  </Link>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-text-muted">
                  No sessions found.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-muted animate-pulse">
                  Loading...
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
                loadHistory(nextOffset);
              }}
              disabled={loading}
              className="text-sm font-semibold text-primary hover:text-primary-hover disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
