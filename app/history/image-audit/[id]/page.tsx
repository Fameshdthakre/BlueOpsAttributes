"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/app/components/PageHeader";

export default function ImageAuditHistoryPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/image-audit/sessions/${sessionId}/results`);
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

  const filteredResults = filter === "all" ? results : results.filter(r => r.match_status === filter);

  const statusColor: Record<string, string> = {
    Match: "text-status-success",
    Mismatch: "text-status-error",
    "Partial Match": "text-status-warning",
    Pending: "text-text-muted",
  };

  if (loading) return <div className="p-8 text-text-muted">Loading session...</div>;
  if (error) return <div className="p-8 text-status-error">{error}</div>;

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title={`Image Audit: ${session?.name || id}`}
        subtitle={`Portal: ${session?.portal?.toUpperCase()} · Mode: ${session?.mode}`}
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/" },
          { label: "History", href: "/history" },
          { label: "Image Auditor" },
        ]}
      >
        <Link href="/history" className="px-4 py-2 bg-bg-dark border border-bg-input rounded-lg font-semibold text-text-main text-sm">
          Back to History
        </Link>
      </PageHeader>

      <div className="p-8 max-w-6xl mx-auto w-full space-y-6 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total ASINs", value: session?.total_asins ?? 0 },
            { label: "Completed", value: session?.completed_asins ?? 0 },
            { label: "Status", value: session?.status },
            { label: "Domain", value: session ? `amazon.${session.domain}` : "—" },
          ].map((stat) => (
            <div key={stat.label} className="bg-bg-card border border-bg-input rounded-xl p-4">
              <div className="text-xs text-text-muted mb-1">{stat.label}</div>
              <div className="text-xl font-bold text-text-main">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {["all", "Match", "Mismatch", "Partial Match", "Pending"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                filter === f ? "bg-primary text-white border-primary" : "bg-bg-dark text-text-muted border-bg-input hover:border-text-muted"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Results List */}
          <div className="bg-bg-card border border-bg-input rounded-xl overflow-hidden">
            <div className="p-4 bg-bg-dark border-b border-bg-input text-sm font-semibold text-text-muted uppercase">Results ({filteredResults.length})</div>
            <div className="overflow-y-auto max-h-[500px] divide-y divide-bg-input">
              {filteredResults.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedResult(r)}
                  className={`p-4 cursor-pointer hover:bg-bg-input/60 transition-colors ${selectedResult?.id === r.id ? "bg-primary/10 border-l-2 border-primary" : ""}`}
                >
                  <div className="font-mono text-xs text-text-main mb-1">{r.asin}</div>
                  <div className={`text-xs font-semibold ${statusColor[r.match_status] || "text-text-muted"}`}>{r.match_status || "—"}</div>
                </div>
              ))}
              {filteredResults.length === 0 && (
                <div className="p-8 text-center text-text-muted text-sm">No results match this filter.</div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="bg-bg-card border border-bg-input rounded-xl p-6">
            {selectedResult ? (
              <div className="space-y-4">
                <h3 className="font-bold text-text-main text-lg font-mono">{selectedResult.asin}</h3>
                <div className={`text-sm font-semibold ${statusColor[selectedResult.match_status]}`}>{selectedResult.match_status}</div>
                
                <div>
                  <h4 className="text-xs text-text-muted uppercase mb-2">Portal Images</h4>
                  <div className="flex gap-2 flex-wrap">
                    {(selectedResult.portal_images || []).map((url: string, i: number) => (
                      <img key={i} src={url} alt={`Portal ${i + 1}`} className="w-20 h-20 object-cover rounded border border-bg-input" />
                    ))}
                    {(!selectedResult.portal_images || selectedResult.portal_images.length === 0) && (
                      <span className="text-xs text-text-muted">No images</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-text-muted uppercase mb-2">PDP Images</h4>
                  <div className="flex gap-2 flex-wrap">
                    {(selectedResult.pdp_images || []).map((url: string, i: number) => (
                      <img key={i} src={url} alt={`PDP ${i + 1}`} className="w-20 h-20 object-cover rounded border border-bg-input" />
                    ))}
                    {(!selectedResult.pdp_images || selectedResult.pdp_images.length === 0) && (
                      <span className="text-xs text-text-muted">No images</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-sm">
                Select an ASIN to view image comparison
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
