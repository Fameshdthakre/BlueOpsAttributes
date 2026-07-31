"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/app/lib/api";
import PageHeader from "@/app/components/PageHeader";

export default function AplusHistoryPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/aplus/sessions/${sessionId}/jobs`, {
        headers: { "x-user-id": "" },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSession(data.session);
      setJobs(data.jobs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  const statusColor: Record<string, string> = {
    pending: "text-status-warning bg-status-warning/10 border-status-warning/20",
    processing: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    completed: "text-status-success bg-status-success/10 border-status-success/20",
    failed: "text-status-error bg-status-error/10 border-status-error/20",
  };

  if (loading) return <div className="p-8 text-text-muted">Loading session...</div>;
  if (error) return <div className="p-8 text-status-error">{error}</div>;

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title={`A+ Session: ${session?.name || id}`}
        subtitle={`Portal: ${session?.portal?.toUpperCase()} · Domain: amazon.${session?.domain}`}
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/" },
          { label: "History", href: "/history" },
          { label: "A+ Publisher" },
        ]}
      >
        <Link href="/history" className="px-4 py-2 bg-bg-dark border border-bg-input rounded-lg font-semibold text-text-main text-sm">
          Back to History
        </Link>
      </PageHeader>

      <div className="p-8 max-w-6xl mx-auto w-full space-y-6 flex-1 overflow-y-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Drafts", value: session?.total_drafts ?? 0 },
            { label: "Completed", value: session?.completed_drafts ?? 0 },
            { label: "Status", value: session?.status },
            { label: "Created", value: session ? new Date(session.created_at).toLocaleDateString() : "—" },
          ].map((stat) => (
            <div key={stat.label} className="bg-bg-card border border-bg-input rounded-xl p-4">
              <div className="text-xs text-text-muted mb-1">{stat.label}</div>
              <div className="text-xl font-bold text-text-main">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filter Row */}
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "processing", "completed", "failed"].map((f) => (
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

        {/* Jobs Table */}
        <div className="bg-bg-card border border-bg-input rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-text-main border-collapse">
            <thead className="bg-bg-dark border-b border-bg-input text-text-muted uppercase text-xs">
              <tr>
                <th className="p-4 font-semibold">Draft URL</th>
                <th className="p-4 font-semibold">Content Title</th>
                <th className="p-4 font-semibold">Modules</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-input">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-bg-input/50 transition-colors">
                  <td className="p-4 font-mono text-xs max-w-[200px] truncate">
                    <a href={job.draft_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {job.draft_url || "—"}
                    </a>
                  </td>
                  <td className="p-4 text-xs text-text-muted max-w-[150px] truncate">{job.content_title || "—"}</td>
                  <td className="p-4 text-xs text-text-muted">
                    {Array.isArray(job.modules) ? job.modules.join(", ") : (job.modules || "—")}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${statusColor[job.status] || "text-text-muted"}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-status-error max-w-[150px] truncate">{job.error || "—"}</td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-text-muted">No jobs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
