"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import { api } from "@/app/lib/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard stats.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-text-muted">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  const { overall, provider_stats, recent_sessions } = stats;

  const COLORS = ['#00E5FF', '#A020F0', '#3b82f6', '#ff0055'];

  return (
    <div className="animate-in fade-in flex flex-col h-full overflow-y-auto bg-bg-dark">
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Monitor your ASIN extraction jobs, token usage, and API costs."
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/" },
          { label: "Dashboard" },
        ]}
      />
      
      <div className="p-8 max-w-6xl mx-auto space-y-8 w-full">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-bg-card p-6 rounded-xl border border-bg-input shadow-lg flex flex-col">
            <span className="text-text-muted text-sm uppercase font-semibold mb-1">Total ASINs</span>
            <span className="text-4xl font-extrabold text-white">{overall.total_asins.toLocaleString()}</span>
          </div>
          <div className="bg-bg-card p-6 rounded-xl border border-bg-input shadow-lg flex flex-col">
            <span className="text-text-muted text-sm uppercase font-semibold mb-1">Attributes Extracted</span>
            <span className="text-4xl font-extrabold text-accent">{overall.total_attributes.toLocaleString()}</span>
          </div>
          <div className="bg-bg-card p-6 rounded-xl border border-bg-input shadow-lg flex flex-col">
            <span className="text-text-muted text-sm uppercase font-semibold mb-1">Total Tokens (In + Out)</span>
            <span className="text-4xl font-extrabold text-primary">{(overall.total_input_tokens + overall.total_output_tokens).toLocaleString()}</span>
          </div>
          <div className="bg-bg-card p-6 rounded-xl border border-purple-500/30 bg-gradient-to-br from-bg-card to-purple-900/10 shadow-lg flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg className="w-16 h-16 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <span className="text-text-muted text-sm uppercase font-semibold mb-1 z-10 text-purple-300">Tavily Credits Burned</span>
            <span className="text-4xl font-extrabold text-purple-400 z-10">{overall.total_tavily_credits?.toLocaleString() || 0}</span>
          </div>
          <div className="bg-bg-card p-6 rounded-xl border border-bg-input shadow-lg flex flex-col">
            <span className="text-text-muted text-sm uppercase font-semibold mb-1">Total Sessions</span>
            <span className="text-4xl font-extrabold text-gray-400">{overall.total_sessions.toLocaleString()}</span>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Provider Calls Pie Chart */}
          <div className="bg-bg-card p-6 rounded-xl border border-bg-input shadow-lg">
            <h3 className="text-lg font-bold text-text-main mb-6">API Calls by Provider</h3>
            <div className="h-64 w-full">
              {provider_stats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={provider_stats}
                      dataKey="calls"
                      nameKey="provider_used"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      label
                    >
                      {provider_stats.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1E1E24', borderColor: '#333333', color: '#fff' }} 
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-text-muted">No provider data yet</div>
              )}
            </div>
          </div>

          {/* Token Usage Bar Chart */}
          <div className="bg-bg-card p-6 rounded-xl border border-bg-input shadow-lg">
            <h3 className="text-lg font-bold text-text-main mb-6">Token Usage (Input vs Output)</h3>
            <div className="h-64 w-full">
              {provider_stats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={provider_stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333333" vertical={false} />
                    <XAxis dataKey="provider_used" stroke="#888888" />
                    <YAxis stroke="#888888" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1E1E24', borderColor: '#333333', color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="input_tokens" name="Input Tokens" stackId="a" fill="#A020F0" />
                    <Bar dataKey="output_tokens" name="Output Tokens" stackId="a" fill="#00E5FF" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-text-muted">No token data yet</div>
              )}
            </div>
          </div>

        </div>

        {/* Recent Sessions Table */}
        <div className="bg-bg-card p-6 rounded-xl border border-bg-input shadow-lg overflow-hidden">
          <h3 className="text-lg font-bold text-text-main mb-6">Recent Extraction Sessions</h3>
          {recent_sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-bg-input/50 text-text-muted">
                  <tr>
                    <th className="p-4 font-semibold">Session ID</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Total Attributes</th>
                    <th className="p-4 font-semibold">Errors/Unresolved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-input">
                  {recent_sessions.map((sess: any) => (
                    <tr key={sess.session_id} className="hover:bg-bg-input/30 transition-colors">
                      <td className="p-4 text-text-main font-mono">{sess.session_id}</td>
                      <td className="p-4 text-text-muted">{new Date(sess.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-text-main font-medium">{sess.total_jobs}</td>
                      <td className="p-4">
                        {sess.errors > 0 ? (
                          <span className="px-2 py-1 bg-status-error/10 text-status-error rounded text-xs font-bold">
                            {sess.errors} Errors
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-status-success/10 text-status-success rounded text-xs font-bold">
                            Flawless
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-text-muted border border-dashed border-bg-input rounded-lg">
              No recent sessions found. Go to Attribute Master to start processing!
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
