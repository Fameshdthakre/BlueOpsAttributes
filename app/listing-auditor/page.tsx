"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/app/components/PageHeader";

const MARKETPLACES = [
  "Amazon.com", "Amazon.co.uk", "Amazon.de", "Amazon.fr", "Amazon.it",
  "Amazon.es", "Amazon.ca", "Amazon.com.mx", "Amazon.in", "Amazon.co.jp",
  "Amazon.com.au", "Amazon.ae", "Amazon.sa", "Amazon.sg", "Amazon.nl",
  "Amazon.se", "Amazon.pl", "Amazon.eg", "Amazon.com.tr",
];

export default function ListingAuditorPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/listing-audit/sessions", {
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
        title="Listing Auditor"
        subtitle="Scrape and audit Amazon listing data at scale."
        breadcrumbs={[{ label: "BlueOps Hub", href: "/dashboard" }, { label: "Listing Auditor" }]}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full font-semibold">
            v1 · Scraper Only
          </span>
          <Link
            href="/listing-auditor/scraper"
            className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Scraper Session
          </Link>
        </div>
      </PageHeader>

      <div className="p-8 max-w-6xl mx-auto w-full flex-1 space-y-6 overflow-y-auto">
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-300">
          <strong>Scraper Mode (v1):</strong> Install the Listing Auditor Chrome Extension → paste your API token →
          navigate to any Amazon catalogue or search page → click &quot;Scrape&quot; and results will appear here in real-time.
          Catalogue Auditor (AI-powered comparison) is coming in v2.
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="bg-bg-card border border-bg-input rounded-xl p-5 h-20 animate-pulse" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-bg-card border border-bg-input rounded-xl">
            <svg className="w-16 h-16 text-text-muted mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-xl font-bold text-text-main mb-2">No listing audit sessions yet</h3>
            <p className="text-text-muted mb-6">Connect the extension and start scraping to see results here.</p>
            <Link href="/listing-auditor/scraper" className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-semibold transition-colors">
              New Scraper Session
            </Link>
          </div>
        ) : (
          <div className="bg-bg-card border border-bg-input rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left text-text-main border-collapse">
              <thead className="bg-bg-dark border-b border-bg-input text-text-muted uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Session</th>
                  <th className="p-4 font-semibold">Marketplace</th>
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
                    <td className="p-4 text-text-muted">{s.marketplace}</td>
                    <td className="p-4 text-text-muted">{s.mode}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-bg-dark rounded-full h-1.5 w-24">
                          <div
                            className="bg-green-400 h-1.5 rounded-full"
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
                      <Link href={`/history/listing-audit/${s.id}`} className="text-primary hover:text-primary-hover text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
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
