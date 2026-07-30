"use client";

import React, { useState } from "react";
import Link from "next/link";
import { getToken } from "@/app/lib/api";
import ModuleSelector from "@/app/components/ModuleSelector";

export default function TemplatesPage() {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (selectedModules.length === 0) {
      alert("Please select at least one module.");
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch("/api/aplus/template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "X-BlueOps-Token": token }),
        },
        body: JSON.stringify({ module_ids: selectedModules }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "APlus_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Failed to download template: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Template Builder
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Select up to 5 Amazon A+ modules to generate a dynamic Excel
              template.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/aplus-publisher"
            className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          >
            Cancel
          </Link>
          <button
            onClick={handleDownload}
            disabled={loading || selectedModules.length === 0}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-[var(--blue-600)] text-white hover:bg-[var(--blue-700)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            Download Template
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-1">
              Select Modules ({selectedModules.length}/5)
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              The order you select modules does not strictly matter for the
              Excel file, but we recommend matching your desired Amazon layout.
            </p>
          </div>

          <div className="bg-white dark:bg-[#1a1d21] p-6 rounded-lg border border-[var(--border-color)]">
            <ModuleSelector
              selectedModules={selectedModules}
              onChange={setSelectedModules}
              multiSelect={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
