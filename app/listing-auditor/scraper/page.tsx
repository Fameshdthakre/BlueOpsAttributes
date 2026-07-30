"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/components/PageHeader";

const MARKETPLACES = [
  "Amazon.com", "Amazon.co.uk", "Amazon.de", "Amazon.fr", "Amazon.it",
  "Amazon.es", "Amazon.ca", "Amazon.com.mx", "Amazon.in", "Amazon.co.jp",
  "Amazon.com.au", "Amazon.ae", "Amazon.sa", "Amazon.sg", "Amazon.nl",
  "Amazon.se", "Amazon.pl", "Amazon.eg", "Amazon.com.tr",
];

export default function ListingAuditorScraperPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [marketplace, setMarketplace] = useState("Amazon.com");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Session name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/listing-audit/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "" },
        body: JSON.stringify({ name, marketplace, mode: "Scraper" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      router.push(`/history/listing-audit/${data.session_id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="New Scraper Session"
        subtitle="Create a session to collect scraped listing data via the Chrome extension."
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/dashboard" },
          { label: "Listing Auditor", href: "/listing-auditor" },
          { label: "Scraper" },
        ]}
      />

      <div className="p-8 max-w-2xl mx-auto w-full flex-1">
        <div className="bg-bg-card border border-bg-input rounded-xl p-8 space-y-6">
          {error && (
            <div className="p-3 bg-status-error/10 border border-status-error/20 text-status-error rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm text-text-muted mb-2">Session Name</label>
            <input
              type="text"
              placeholder="e.g., Competitor ASIN Scrape July 2026"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-bg-dark border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-2">Target Marketplace</label>
            <select
              value={marketplace}
              onChange={e => setMarketplace(e.target.value)}
              className="w-full bg-bg-input border-none rounded-lg p-3 text-text-main"
            >
              {MARKETPLACES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="p-4 bg-bg-dark border border-bg-input rounded-lg text-xs text-text-muted space-y-1.5">
            <p className="font-semibold text-text-main mb-2">How to Use the Extension</p>
            <p>1. Install the Listing Auditor Chrome Extension.</p>
            <p>2. Copy your API token from Settings → Integrations.</p>
            <p>3. Paste the token in the extension's options page.</p>
            <p>4. Navigate to the Amazon marketplace and browse ASINs or search results.</p>
            <p>5. Click the extension icon → select this session → click "Start Scraping".</p>
            <p>6. Scraped data appears in real-time on this session's history page.</p>
          </div>

          <div className="flex gap-4 pt-2">
            <Link href="/listing-auditor" className="flex-1 text-center px-5 py-3 bg-bg-dark border border-bg-input rounded-lg font-semibold text-text-main hover:bg-bg-input transition-colors">
              Cancel
            </Link>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating..." : "Create Session"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
