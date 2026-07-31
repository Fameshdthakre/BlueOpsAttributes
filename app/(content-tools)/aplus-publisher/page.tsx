"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/components/PageHeader";
import FeatureHistory from "@/app/components/FeatureHistory";

export default function AplusPublisherPage() {
  const [activeTab, setActiveTab] = useState<"process" | "history">("process");

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

      {/* Tab Switcher */}
      <div className="flex border-b border-bg-input px-8 mt-2">
        <button
          onClick={() => setActiveTab("process")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "process"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          Sessions
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          History
        </button>
      </div>

      {activeTab === "history" && (
        <div className="p-8 max-w-6xl mx-auto w-full flex-1 overflow-y-auto">
          <FeatureHistory toolType="aplus" />
        </div>
      )}

      {activeTab === "process" && (
        <div className="p-8 max-w-6xl mx-auto w-full flex-1 space-y-6 overflow-y-auto">
          {/* Info Banner */}
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm text-orange-300">
            <strong>How it works:</strong> Create a session in BlueOps → install the A+ Publisher Chrome Extension →
            paste your API token (Settings → Integrations) → the extension will sync and execute drafts automatically.
          </div>

          <div className="flex flex-col items-center justify-center py-24 bg-bg-card border border-bg-input rounded-xl">
            <svg className="w-16 h-16 text-text-muted mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-xl font-bold text-text-main mb-2">Create a new A+ session</h3>
            <p className="text-text-muted mb-6">Set up a new session to start syncing A+ drafts via the extension.</p>
            <Link href="/aplus-publisher/new" className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-semibold transition-colors">
              Create Session
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
