"use client";

import { useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import FeatureHistory from "@/app/components/FeatureHistory";
import { api } from "@/app/lib/api";

const MARKETPLACES = [
  { label: "amazon.com (US)", value: "com" },
  { label: "amazon.co.uk (UK)", value: "co.uk" },
  { label: "amazon.de (Germany)", value: "de" },
];

export default function ListingAuditorPage() {
  const [activeTab, setActiveTab] = useState<"process" | "history">("process");
  
  // Headless Extension State
  const [name, setName] = useState("");
  const [portal, setPortal] = useState("vendor");
  const [domain, setDomain] = useState("com");
  const [url, setUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTask = async () => {
    if (!name.trim()) return setError("Session name is required.");
    if (!url.trim()) return setError("Target Amazon URL is required.");
    setError(null);
    setRunning(true);

    try {
      // 1. Automatically create the session in the backend
      const res = await fetch("/api/listing-audit/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "" },
        body: JSON.stringify({ name, portal, domain, mode: "Scrape" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const sessionId = data.session_id;

      // 2. Command the Headless Chrome Extension to begin the scrape task
      window.postMessage(
        {
          source: "BLUEOPS_WEB_APP",
          type: "START_TASK",
          taskDetails: {
            taskType: "listing_audit",
            sessionId: sessionId,
            url: url
          },
        },
        window.location.origin
      );

      // Listen for acknowledgement from extension
      const listener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.source === "BLUEOPS_EXTENSION" && event.data?.type === "TASK_ACK") {
          console.log("Extension acknowledged task:", event.data.payload);
          window.removeEventListener("message", listener);
          // Auto-switch to history tab so the user can watch results flow in!
          setActiveTab("history");
          setRunning(false);
        }
      };
      window.addEventListener("message", listener);

      // Fallback timeout in case extension isn't installed or fails to reply
      setTimeout(() => {
        window.removeEventListener("message", listener);
        setRunning(false);
        setError("Extension did not respond. Is the BlueOps Chrome Extension installed and enabled?");
      }, 3000);

    } catch (err: any) {
      setError(err.message);
      setRunning(false);
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="Listing Auditor"
        subtitle="Scrape and audit Amazon listing data at scale."
        breadcrumbs={[{ label: "BlueOps Hub", href: "/dashboard" }, { label: "Listing Auditor" }]}
      />

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
          New Scraper Session
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          Dashboard & History
        </button>
      </div>

      {activeTab === "history" && (
        <div className="p-8 max-w-6xl mx-auto w-full flex-1 overflow-y-auto">
          <FeatureHistory toolType="listing_audit" />
        </div>
      )}

      {activeTab === "process" && (
        <div className="p-8 max-w-2xl mx-auto w-full flex-1 space-y-6 overflow-y-auto">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-300">
            <strong>Headless Automation Active:</strong> Enter your target URL below. The BlueOps Chrome Extension will automatically open Amazon in the background and pipe listings directly into your History Dashboard. You do not need to click anything in the extension.
          </div>

          <div className="bg-bg-card border border-bg-input rounded-xl p-8 space-y-6">
            {error && (
              <div className="p-3 bg-status-error/10 border border-status-error/20 text-status-error rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm text-text-muted mb-2">Session Name</label>
              <input
                type="text"
                placeholder="e.g., Q3 Catalogue Scrape"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-bg-dark border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-text-muted mb-2">Target Amazon URL</label>
              <input
                type="text"
                placeholder="e.g., https://vendorcentral.amazon.co.uk/catalogue/..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full bg-bg-dark border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-muted mb-2">Portal</label>
                <select value={portal} onChange={e => setPortal(e.target.value)} className="w-full bg-bg-input border-none rounded-lg p-3 text-text-main">
                  <option value="vendor">Vendor Central</option>
                  <option value="seller">Seller Central</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">Marketplace</label>
                <select value={domain} onChange={e => setDomain(e.target.value)} className="w-full bg-bg-input border-none rounded-lg p-3 text-text-main">
                  {MARKETPLACES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={startTask}
              disabled={running}
              className="w-full mt-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
            >
              {running ? "Sending Command to Extension..." : "Start Headless Scrape"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
