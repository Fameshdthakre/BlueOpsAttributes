"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/components/PageHeader";

const MARKETPLACES = [
  { label: "amazon.com (US)", value: "com" },
  { label: "amazon.co.uk (UK)", value: "co.uk" },
  { label: "amazon.de (Germany)", value: "de" },
  { label: "amazon.fr (France)", value: "fr" },
  { label: "amazon.it (Italy)", value: "it" },
  { label: "amazon.es (Spain)", value: "es" },
  { label: "amazon.ca (Canada)", value: "ca" },
  { label: "amazon.in (India)", value: "in" },
  { label: "amazon.co.jp (Japan)", value: "co.jp" },
  { label: "amazon.com.au (Australia)", value: "com.au" },
];

export default function NewImageAuditPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [portal, setPortal] = useState("vendor");
  const [domain, setDomain] = useState("com");
  const [mode, setMode] = useState("Audit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Session name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/image-audit/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "" },
        body: JSON.stringify({ name, portal, domain, mode }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      router.push(`/history/image-audit/${data.session_id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="New Image Audit Session"
        subtitle="Set up a session for comparing portal vs. PDP images."
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/dashboard" },
          { label: "Image Auditor", href: "/image-auditor" },
          { label: "New Session" },
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
              placeholder="e.g., VC UK Image Audit July 2026"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-bg-dark border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-text-muted mb-2">Portal</label>
              <select
                value={portal}
                onChange={e => setPortal(e.target.value)}
                className="w-full bg-bg-input border-none rounded-lg p-3 text-text-main"
              >
                <option value="vendor">Vendor Central</option>
                <option value="seller">Seller Central</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-2">Marketplace</label>
              <select
                value={domain}
                onChange={e => setDomain(e.target.value)}
                className="w-full bg-bg-input border-none rounded-lg p-3 text-text-main"
              >
                {MARKETPLACES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-2">Mode</label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value)}
                className="w-full bg-bg-input border-none rounded-lg p-3 text-text-main"
              >
                <option value="Audit">Audit</option>
                <option value="Mapper">Image Mapper</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-bg-dark border border-bg-input rounded-lg text-xs text-text-muted space-y-1.5">
            <p className="font-semibold text-text-main mb-2">Setup Guide</p>
            <p>1. Install the Image Auditor Chrome Extension.</p>
            <p>2. Copy your API token from Settings → Integrations.</p>
            <p>3. Paste the token in the extension options.</p>
            <p>4. Navigate to the VC/SC catalogue or product page.</p>
            <p>5. Click the extension icon to start auditing — results appear here.</p>
          </div>

          <div className="flex gap-4 pt-2">
            <Link href="/image-auditor" className="flex-1 text-center px-5 py-3 bg-bg-dark border border-bg-input rounded-lg font-semibold text-text-main hover:bg-bg-input transition-colors">
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
