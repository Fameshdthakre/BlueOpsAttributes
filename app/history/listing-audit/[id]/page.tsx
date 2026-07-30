"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/app/components/PageHeader";

export default function ListingAuditHistoryPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/listing-audit/sessions/${sessionId}/results`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSession(data.session);
      setResults(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.location.href = `/api/listing-audit/sessions/${id}/report`;
  };

  const filteredResults = results.filter(r =>
    !search || r.asin?.toLowerCase().includes(search.toLowerCase())
  );

  // Gather all scraped data keys for dynamic columns
  const allKeys = new Set<string>();
  results.forEach(r => {
    if (r.scraped_data && typeof r.scraped_data === "object") {
      Object.keys(r.scraped_data).forEach(k => allKeys.add(k));
    }
  });
  const dynamicCols = Array.from(allKeys).slice(0, 10); // limit to 10

  if (loading) return <div className="p-8 text-text-muted">Loading session...</div>;
  if (error) return <div className="p-8 text-status-error">{error}</div>;

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title={`Listing Audit: ${session?.name || id}`}
        subtitle={`Marketplace: ${session?.marketplace} · Mode: ${session?.mode}`}
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/" },
          { label: "History", href: "/history" },
          { label: "Listing Auditor" },
        ]}
      >
        <div className="flex gap-2">
          <Link href="/history" className="px-4 py-2 bg-bg-dark border border-bg-input rounded-lg font-semibold text-text-main text-sm">
            Back to History
          </Link>
          <button
            onClick={handleExport}
            className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </PageHeader>

      <div className="p-8 max-w-6xl mx-auto w-full space-y-6 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total ASINs", value: session?.total_asins ?? 0 },
            { label: "Completed", value: session?.completed_asins ?? 0 },
            { label: "Status", value: session?.status },
            { label: "Marketplace", value: session?.marketplace || "—" },
          ].map((stat) => (
            <div key={stat.label} className="bg-bg-card border border-bg-input rounded-xl p-4">
              <div className="text-xs text-text-muted mb-1">{stat.label}</div>
              <div className="text-xl font-bold text-text-main">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by ASIN..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm bg-bg-dark border border-bg-input rounded-lg p-3 text-sm text-text-main focus:border-primary outline-none"
        />

        {/* Data Table */}
        <div className="bg-bg-card border border-bg-input rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text-main border-collapse whitespace-nowrap">
              <thead className="bg-bg-dark border-b border-bg-input text-text-muted uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">ASIN</th>
                  <th className="p-4 font-semibold">Status</th>
                  {dynamicCols.map(k => (
                    <th key={k} className="p-4 font-semibold text-primary">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-input">
                {filteredResults.map((r) => (
                  <tr key={r.id} className="hover:bg-bg-input/50 transition-colors">
                    <td className="p-4 font-mono text-xs">{r.asin}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded border ${
                        r.status === "success"
                          ? "text-status-success bg-status-success/10 border-status-success/20"
                          : "text-status-error bg-status-error/10 border-status-error/20"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    {dynamicCols.map(k => (
                      <td key={k} className="p-4 text-xs text-text-muted max-w-[180px] truncate" title={r.scraped_data?.[k] || ""}>
                        {r.scraped_data?.[k] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
                {filteredResults.length === 0 && (
                  <tr><td colSpan={dynamicCols.length + 2} className="p-8 text-center text-text-muted">No results found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
