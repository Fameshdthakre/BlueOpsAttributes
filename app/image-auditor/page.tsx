"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/app/components/PageHeader";

const MARKETPLACES = [
  { label: "Amazon.com (US)", domain: "com", portal: "vendor" },
  { label: "Amazon.co.uk (UK)", domain: "co.uk", portal: "vendor" },
  { label: "Amazon.de (Germany)", domain: "de", portal: "vendor" },
  { label: "Amazon.fr (France)", domain: "fr", portal: "vendor" },
  { label: "Amazon.ca (Canada)", domain: "ca", portal: "vendor" },
  { label: "Amazon.com.mx (Mexico)", domain: "com.mx", portal: "vendor" },
  { label: "Amazon.in (India)", domain: "in", portal: "vendor" },
];

export default function ImageAuditorPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/image-audit/sessions", {
      headers: { "x-user-id": "" },
    })
      .then(r => r.json())
      .then(data => setSessions(data.sessions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="Image Auditor"
        subtitle="Compare portal images vs live PDP images for Vendor/Seller Central."
        breadcrumbs={[{ label: "BlueOps Hub", href: "/dashboard" }, { label: "Image Auditor" }]}
      >
        <Link
          href="/image-auditor/new"
          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Audit Session
        </Link>
      </PageHeader>

      <div className="p-8 max-w-6xl mx-auto w-full flex-1 space-y-6 overflow-y-auto">
        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-sm text-purple-300">
          <strong>How it works:</strong> Create a session → install the Image Auditor Chrome Extension →
          paste your API token in the extension options → navigate to VC/SC to start the audit.
          Results sync automatically to BlueOps.
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="bg-bg-card border border-bg-input rounded-xl p-5 h-20 animate-pulse" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-bg-card border border-bg-input rounded-xl">
            <svg className="w-16 h-16 text-text-muted mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-bold text-text-main mb-2">No audit sessions yet</h3>
            <p className="text-text-muted mb-6">Create a session and connect the Image Auditor extension to get started.</p>
            <Link href="/image-auditor/new" className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-semibold transition-colors">
              Create Session
            </Link>
          </div>
        ) : (
          <div className="bg-bg-card border border-bg-input rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left text-text-main border-collapse">
              <thead className="bg-bg-dark border-b border-bg-input text-text-muted uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Session</th>
                  <th className="p-4 font-semibold">Portal</th>
                  <th className="p-4 font-semibold">Domain</th>
                  <th className="p-4 font-semibold">Mode</th>
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
                    <td className="p-4 text-text-muted">{s.mode}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-bg-dark rounded-full h-1.5 w-24">
                          <div
                            className="bg-purple-400 h-1.5 rounded-full"
                            style={{ width: s.total_asins > 0 ? `${Math.round((s.completed_asins / s.total_asins) * 100)}%` : "0%" }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">{s.completed_asins}/{s.total_asins}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-semibold ${s.status === "completed" ? "text-status-success" : s.status === "processing" ? "text-blue-400" : "text-status-warning"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4 text-text-muted text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <Link href={`/history/image-audit/${s.id}`} className="text-primary hover:text-primary-hover text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
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
