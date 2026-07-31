"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/components/PageHeader";
import FeatureHistory from "@/app/components/FeatureHistory";

export default function ImageAuditorPage() {
  const [activeTab, setActiveTab] = useState<"process" | "history">("process");

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
          <FeatureHistory toolType="image_audit" />
        </div>
      )}

      {activeTab === "process" && (
        <div className="p-8 max-w-6xl mx-auto w-full flex-1 space-y-6 overflow-y-auto">
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-sm text-purple-300">
            <strong>How it works:</strong> Create a session → install the Image Auditor Chrome Extension →
            paste your API token in the extension options → navigate to VC/SC to start the audit.
            Results sync automatically to BlueOps.
          </div>

          <div className="flex flex-col items-center justify-center py-24 bg-bg-card border border-bg-input rounded-xl">
            <svg className="w-16 h-16 text-text-muted mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-bold text-text-main mb-2">Create a new audit session</h3>
            <p className="text-text-muted mb-6">Connect the extension and start the audit to see results here.</p>
            <Link href="/image-auditor/new" className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-semibold transition-colors">
              Create Session
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
