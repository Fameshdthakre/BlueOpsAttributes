"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/app/lib/api";
import ToolBadge, { ToolType } from "@/app/components/ToolBadge";

// ── Tool Card ──────────────────────────────────────────────────────────────
function ToolCard({
  title,
  href,
  color,
  stats,
  icon,
}: {
  title: string;
  href: string;
  color: string;
  stats: { label: string; value: number | string }[];
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="group">
      <div className="bg-bg-card border border-bg-input rounded-xl p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
          <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            Open →
          </span>
        </div>
        <h3 className="font-bold text-text-main mb-3">{title}</h3>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-text-main">{s.value}</div>
              <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

// ── Quick Action Button ────────────────────────────────────────────────────
function QuickAction({ label, href, icon }: { label: string; href: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-lg bg-bg-dark border border-bg-input hover:border-primary/40 hover:bg-primary/5 transition-all group">
      <span className="text-text-muted group-hover:text-primary transition-colors">{icon}</span>
      <span className="text-sm font-medium text-text-main">{label}</span>
    </Link>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const am = stats?.attr_master;
  const ap = stats?.aplus;
  const ia = stats?.image_audit;
  const la = stats?.listing_scrape;
  const recent: any[] = stats?.recent_sessions || [];

  const totalSessions =
    (am?.total_sessions || 0) + (ap?.total_sessions || 0) +
    (ia?.total_sessions || 0) + (la?.total_sessions || 0);

  const totalAsins =
    (am?.total_jobs || 0) + (ap?.total_jobs || 0) +
    (ia?.total_asins || 0) + (la?.total_asins || 0);

  const getHref = (tool: string, id: string) => {
    switch (tool) {
      case "attr_master": return `/history/attr-master/${id}`;
      case "aplus": return `/history/aplus/${id}`;
      case "image_audit": return `/history/image-audit/${id}`;
      case "listing_scrape": return `/history/listing-scrape/${id}`;
      default: return "#";
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-3xl font-bold text-text-main">BlueOps Dashboard</h1>
        <p className="text-text-muted mt-1">Welcome back. Here's what's happening across your tools.</p>
      </div>

      <div className="p-8 pt-4 space-y-8 max-w-7xl w-full mx-auto flex-1">
        {/* ── Global Stats Row ────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-bg-card border border-bg-input rounded-xl p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Sessions", value: totalSessions, color: "text-primary" },
              { label: "ASINs / Items Processed", value: totalAsins, color: "text-accent" },
              { label: "Attr. Master Sessions", value: am?.total_sessions ?? 0, color: "text-blue-400" },
              { label: "A+ Drafts Completed", value: ap?.completed ?? 0, color: "text-orange-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-bg-card border border-bg-input rounded-xl p-5">
                <div className={`text-3xl font-extrabold ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-xs text-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Two Column Layout ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tool Cards (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-text-muted uppercase tracking-wider">Tools</h2>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="bg-bg-card border border-bg-input rounded-xl p-5 animate-pulse h-40" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToolCard
                  title="Attribute Master"
                  href="/input"
                  color="bg-blue-500/10 text-blue-400"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4" /></svg>}
                  stats={[
                    { label: "Sessions", value: am?.total_sessions ?? 0 },
                    { label: "Total Jobs", value: am?.total_jobs ?? 0 },
                    { label: "Validated", value: am?.validated ?? 0 },
                    { label: "Failed", value: am?.failed ?? 0 },
                  ]}
                />
                <ToolCard
                  title="A+ Publisher"
                  href="/aplus-publisher"
                  color="bg-orange-500/10 text-orange-400"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                  stats={[
                    { label: "Sessions", value: ap?.total_sessions ?? 0 },
                    { label: "Total Drafts", value: ap?.total_jobs ?? 0 },
                    { label: "Completed", value: ap?.completed ?? 0 },
                    { label: "Failed", value: ap?.failed ?? 0 },
                  ]}
                />
                <ToolCard
                  title="Image Auditor"
                  href="/image-auditor"
                  color="bg-purple-500/10 text-purple-400"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                  stats={[
                    { label: "Sessions", value: ia?.total_sessions ?? 0 },
                    { label: "ASINs Audited", value: ia?.total_asins ?? 0 },
                    { label: "Matched", value: ia?.matched ?? 0 },
                    { label: "Mismatched", value: ia?.mismatched ?? 0 },
                  ]}
                />
                <ToolCard
                  title="Listing Scraper"
                  href="/listing-scraper"
                  color="bg-green-500/10 text-green-400"
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                  stats={[
                    { label: "Sessions", value: la?.total_sessions ?? 0 },
                    { label: "ASINs Scraped", value: la?.total_asins ?? 0 },
                    { label: "Success", value: la?.success ?? 0 },
                    { label: "Errors", value: la?.errors ?? 0 },
                  ]}
                />
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div>
              <h2 className="text-base font-bold text-text-muted uppercase tracking-wider mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <QuickAction
                  label="New Attribute Extraction"
                  href="/input"
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                />
                <QuickAction
                  label="New A+ Session"
                  href="/aplus-publisher/new"
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                />
                <QuickAction
                  label="New Image Audit"
                  href="/image-auditor/new"
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                />
                <QuickAction
                  label="New Listing Scrape"
                  href="/listing-scraper"
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                />
                <QuickAction
                  label="Settings & API Keys"
                  href="/settings"
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent Sessions ─────────────────────────────────────────────── */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-text-muted uppercase tracking-wider">Recent Sessions</h2>
            <Link href="/history" className="text-sm text-primary hover:text-primary-hover font-semibold">
              View All →
            </Link>
          </div>
          <div className="bg-bg-card border border-bg-input rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-text-muted">Loading recent sessions...</div>
            ) : recent.length === 0 ? (
              <div className="p-8 text-center text-text-muted">No sessions yet. Create one with a quick action above.</div>
            ) : (
              <table className="w-full text-left text-sm text-text-main border-collapse">
                <thead className="bg-bg-dark border-b border-bg-input text-text-muted uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold">Tool</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Progress</th>
                    <th className="p-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-input">
                  {recent.map((s) => (
                    <tr key={`${s.tool_type}-${s.id}`} className="hover:bg-bg-input/50 transition-colors">
                      <td className="p-4">
                        <ToolBadge tool={s.tool_type as ToolType} />
                      </td>
                      <td className="p-4 text-text-main font-medium">
                        <Link href={getHref(s.tool_type, s.id)} className="hover:text-primary transition-colors">
                          {s.name || "Untitled"}
                        </Link>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded border ${
                          s.status === "Complete" || s.status === "completed"
                            ? "text-status-success bg-status-success/10 border-status-success/20"
                            : s.status === "Running" || s.status === "processing"
                              ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
                              : "text-status-warning bg-status-warning/10 border-status-warning/20"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-4 text-text-muted">
                        {s.total_asins > 0 ? `${s.processed_asins}/${s.total_asins}` : "—"}
                      </td>
                      <td className="p-4 text-text-muted">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
