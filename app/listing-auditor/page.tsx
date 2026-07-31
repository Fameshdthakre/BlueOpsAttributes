"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/components/PageHeader";
import FeatureHistory from "@/app/components/FeatureHistory";

export default function ListingAuditorPage() {
  const [activeTab, setActiveTab] = useState<"process" | "history">("process");

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
          <FeatureHistory toolType="listing_audit" />
        </div>
      )}

      {activeTab === "process" && (
        <div className="p-8 max-w-6xl mx-auto w-full flex-1 space-y-6 overflow-y-auto">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-300">
            <strong>Scraper Mode (v1):</strong> Install the Listing Auditor Chrome Extension → paste your API token →
            navigate to any Amazon catalogue or search page → click &quot;Scrape&quot; and results will appear here in real-time.
            Catalogue Auditor (AI-powered comparison) is coming in v2.
          </div>

          <div className="flex flex-col items-center justify-center py-24 bg-bg-card border border-bg-input rounded-xl">
            <svg className="w-16 h-16 text-text-muted mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-xl font-bold text-text-main mb-2">Create a new scraper session</h3>
            <p className="text-text-muted mb-6">Connect the extension and start scraping to see results here.</p>
            <Link href="/listing-auditor/scraper" className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-semibold transition-colors">
              New Scraper Session
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
