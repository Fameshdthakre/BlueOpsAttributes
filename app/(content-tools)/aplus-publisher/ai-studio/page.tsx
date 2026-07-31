"use client";

import React, { useState } from "react";
import Link from "next/link";
import { getToken } from "@/app/lib/api";
import ModuleSelector from "../_components/ModuleSelector";

export default function AIStudioPage() {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [productData, setProductData] = useState<string>('{\n  "ASIN": "B012345678",\n  "Title": "Example Product",\n  "Bullets": ["Feature 1", "Feature 2"],\n  "Description": "Long description...",\n  "Specifications": "Size: Large\\nColor: Red"\n}');
  const [strategy, setStrategy] = useState("balanced");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (selectedModules.length !== 1) {
      alert("Please select exactly one module.");
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(productData);
    } catch (e) {
      alert("Invalid JSON for Product Data");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const token = await getToken();
      const res = await fetch("/api/aplus/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "X-BlueOps-Token": token }),
        },
        body: JSON.stringify({
          module_id: selectedModules[0],
          product_data: parsedData,
          strategy: selectedModules[0] === "module-5" ? strategy : undefined
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              AI Content Studio
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Generate elite, high-converting A+ Content copy automatically.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/aplus-publisher"
            className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          >
            Back
          </Link>
          <button
            onClick={handleGenerate}
            disabled={loading || selectedModules.length !== 1}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-[var(--brand-purple)] text-white hover:bg-[#7e22ce] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            Generate Copy
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-[#1a1d21] p-6 rounded-lg border border-[var(--border-color)]">
              <h2 className="text-lg font-semibold mb-4">1. Select Target Module</h2>
              <ModuleSelector
                selectedModules={selectedModules}
                onChange={(ids) => setSelectedModules(ids.slice(-1))}
                multiSelect={true}
              />
            </div>

            <div className="bg-white dark:bg-[#1a1d21] p-6 rounded-lg border border-[var(--border-color)] flex flex-col gap-4">
              <h2 className="text-lg font-semibold">2. Input Product Data</h2>
              <p className="text-sm text-[var(--text-secondary)] -mt-2">
                Paste raw product JSON here. If you selected Comparison Chart (module-5), provide an array of objects.
              </p>
              
              {selectedModules[0] === "module-5" && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Comparison Strategy</label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="w-full p-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--brand-purple)]"
                  >
                    <option value="balanced">Balanced (Default)</option>
                    <option value="premium">Premium Justification</option>
                    <option value="technical">Technical Details</option>
                    <option value="usability">Lifestyle & Usability</option>
                  </select>
                </div>
              )}

              <textarea
                value={productData}
                onChange={(e) => setProductData(e.target.value)}
                rows={12}
                className="w-full p-4 font-mono text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--brand-purple)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-[#1a1d21] p-6 rounded-lg border border-[var(--border-color)] h-full flex flex-col">
              <h2 className="text-lg font-semibold mb-4">Output</h2>
              {error && (
                <div className="p-4 mb-4 text-sm text-red-800 bg-red-100 rounded-lg">
                  {error}
                </div>
              )}
              {result ? (
                <pre className="flex-1 p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md overflow-auto text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-md text-[var(--text-muted)]">
                  Click Generate to see the result
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
