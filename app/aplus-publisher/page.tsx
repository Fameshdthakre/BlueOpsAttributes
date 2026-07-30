"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/app/components/PageHeader";
import { api } from "@/app/lib/api";

export default function AplusPublisherPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/aplus/sessions", {
      headers: { "x-user-id": "" },
    })
      .then(res => res.json())
      .then(data => setSessions(data.sessions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    pending: "text-status-warning",
    processing: "text-blue-400",
    completed: "text-status-success",
  };

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="A+ Publisher"
        subtitle="Manage A+ Content drafts across Vendor and Seller Central portals."
        breadcrumbs={[{ label: "BlueOps Hub", href: "/dashboard" }, { label: "A+ Publisher" }]}
      >
        <Link
          href="/aplus-publisher/new"
          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Session
        </Link>
      </PageHeader>

      <div className="p-8 max-w-6xl mx-auto w-full flex-1 space-y-6 overflow-y-auto">
        {/* Info Banner */}
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm text-orange-300">
          <strong>How it works:</strong> Create a session in BlueOps → install the A+ Publisher Chrome Extension →
          paste your API token (Settings → Integrations) → the extension will sync and execute drafts automatically.
        </div>

        {/* Session List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-bg-card border border-bg-input rounded-xl p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-bg-card border border-bg-input rounded-xl">
            <svg className="w-16 h-16 text-text-muted mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" />
            </svg>
            <h3 className="text-xl font-bold text-text-main mb-2">No A+ sessions yet</h3>
            <p className="text-text-muted mb-6">Create your first session to start syncing A+ drafts.</p>
            <Link href="/aplus-publisher/new" className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-semibold transition-colors">
              Create Session
            </Link>
          </div>
        ) : (
          <div className="bg-bg-card border border-bg-input rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left text-text-main border-collapse">
              <thead className="bg-bg-dark border-b border-bg-input text-text-muted uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Session Name</th>
                  <th className="p-4 font-semibold">Portal</th>
                  <th className="p-4 font-semibold">Domain</th>
                  <th className="p-4 font-semibold">Progress</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-input">
                {sessions.map(s => (
                  <tr key={s.id} className="hover:bg-bg-input/50 transition-colors group">
                    <td className="p-4 font-medium">{s.name}</td>
                    <td className="p-4 text-text-muted">{s.portal?.toUpperCase()}</td>
                    <td className="p-4 text-text-muted">amazon.{s.domain}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-bg-dark rounded-full h-1.5 w-24">
                          <div
                            className="bg-orange-400 h-1.5 rounded-full"
                            style={{ width: s.total_drafts > 0 ? `${Math.round((s.completed_drafts / s.total_drafts) * 100)}%` : "0%" }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">{s.completed_drafts}/{s.total_drafts}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-semibold ${statusColor[s.status] || "text-text-muted"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4 text-text-muted text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <Link href={`/history/aplus/${s.id}`} className="text-primary hover:text-primary-hover text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
