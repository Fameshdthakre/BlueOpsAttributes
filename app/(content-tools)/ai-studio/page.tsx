"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getToken } from "@/app/lib/api";
import ModuleSelector from "@/app/(content-tools)/aplus-publisher/_components/ModuleSelector";
import PageHeader from "@/app/components/PageHeader";

type Tab = "text" | "image" | "history";

export default function AIStudioPage() {
  const [activeTab, setActiveTab] = useState<Tab>("text");

  // Text Gen State
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [productData, setProductData] = useState<string>('{\n  "ASIN": "B012345678",\n  "Title": "Example Product",\n  "Bullets": ["Feature 1", "Feature 2"],\n  "Description": "Long description...",\n  "Specifications": "Size: Large\\nColor: Red"\n}');
  const [strategy, setStrategy] = useState("balanced");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Image Gen State
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<any>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // History State
  const [historyImages, setHistoryImages] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- Handlers ---

  const handleGenerateText = async () => {
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

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setGeneratingImage(true);
    setImageError(null);
    setGeneratedImage(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/aplus/ai/images/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "X-BlueOps-Token": token }),
        },
        body: JSON.stringify({ prompt: imagePrompt }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setGeneratedImage(data);
    } catch (err: any) {
      setImageError(err.message);
    } finally {
      setGeneratingImage(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/aplus/ai/images", {
        headers: { ...(token && { "X-BlueOps-Token": token }) },
      });
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setHistoryImages(data.images || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="AI Content Studio"
        subtitle="Generate elite A+ Content copy and stunning product lifestyle images."
        breadcrumbs={[{ label: "BlueOps Hub", href: "/dashboard" }, { label: "AI Studio" }]}
      >
        <div className="flex items-center gap-2 text-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span className="text-sm font-bold">AI Powered</span>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex border-b border-bg-input px-8 mt-2">
        <button
          onClick={() => setActiveTab("text")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "text"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          Text Copy
        </button>
        <button
          onClick={() => setActiveTab("image")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "image"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          Image Generation
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          Image History
        </button>
      </div>

      <div className="flex-1 overflow-auto p-8">
        
        {/* TEXT COPY TAB */}
        {activeTab === "text" && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
            <div className="flex flex-col gap-6">
              <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
                <h2 className="text-lg font-semibold text-text-main mb-4">1. Select Target Module</h2>
                <ModuleSelector selectedModules={selectedModules} onChange={(ids: string[]) => setSelectedModules(ids.slice(-1))} multiSelect={true} />
              </div>
              <div className="bg-bg-card p-6 rounded-xl border border-bg-input flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-text-main">2. Input Product Data</h2>
                {selectedModules[0] === "module-5" && (
                  <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="p-3 bg-bg-dark border border-bg-input rounded-lg text-text-main focus:outline-none focus:border-primary">
                    <option value="balanced">Balanced (Default)</option>
                    <option value="premium">Premium Justification</option>
                  </select>
                )}
                <textarea value={productData} onChange={(e) => setProductData(e.target.value)} rows={10} className="w-full p-4 font-mono text-sm bg-bg-dark border border-bg-input rounded-lg text-text-main focus:outline-none focus:border-primary" />
                <button onClick={handleGenerateText} disabled={loading || selectedModules.length !== 1} className="py-3 mt-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold disabled:opacity-50 transition-colors">
                  {loading ? "Generating..." : "Generate Copy"}
                </button>
              </div>
            </div>
            <div className="bg-bg-card p-6 rounded-xl border border-bg-input flex flex-col">
              <h2 className="text-lg font-semibold text-text-main mb-4">Output</h2>
              {error && <div className="p-4 mb-4 text-sm text-status-error bg-status-error/10 border border-status-error/20 rounded-lg">{error}</div>}
              {result ? (
                <pre className="flex-1 p-4 bg-bg-dark border border-bg-input rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap text-text-main">{JSON.stringify(result, null, 2)}</pre>
              ) : (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-bg-input rounded-lg text-text-muted">Select module and generate</div>
              )}
            </div>
          </div>
        )}

        {/* IMAGE GENERATION TAB */}
        {activeTab === "image" && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <div className="bg-bg-card p-8 rounded-xl border border-bg-input space-y-4">
              <h2 className="text-2xl font-bold text-text-main">Generate Product Lifestyle Imagery</h2>
              <p className="text-text-muted">Powered by OpenAI DALL-E 3 & Google Imagen</p>
              
              <textarea
                placeholder="A high-quality lifestyle shot of a modern coffee machine sitting on a sleek kitchen counter, morning sunlight streaming through a window..."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={4}
                className="w-full p-4 text-lg bg-bg-dark border border-bg-input rounded-xl text-text-main focus:outline-none focus:border-primary transition-all"
              />
              
              <button
                onClick={handleGenerateImage}
                disabled={generatingImage || !imagePrompt}
                className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-3"
              >
                {generatingImage ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating Magic...</>
                ) : "Generate Image"}
              </button>
            </div>

            {imageError && (
              <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-xl">
                <strong>Error:</strong> {imageError}
              </div>
            )}

            {generatedImage && (
              <div className="bg-bg-card p-8 rounded-xl border border-bg-input flex flex-col items-center">
                <img src={generatedImage.image_url} alt="Generated" className="max-w-full rounded-xl shadow-2xl" />
                <div className="mt-4 p-4 bg-bg-dark border border-bg-input rounded-xl w-full text-sm text-text-muted">
                  <strong className="text-text-main">Prompt:</strong> {generatedImage.prompt}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="max-w-7xl mx-auto animate-in fade-in">
            {loadingHistory ? (
              <div className="flex justify-center p-12"><span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
            ) : historyImages.length === 0 ? (
              <div className="text-center p-24 text-text-muted border-2 border-dashed border-bg-input rounded-xl">
                No generated images yet. Try creating some in the Image Generation tab!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {historyImages.map(img => (
                  <div key={img.id} className="bg-bg-card border border-bg-input rounded-xl overflow-hidden group">
                    <div className="aspect-square w-full overflow-hidden bg-black/10">
                      <img src={img.image_url} alt="History" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-medium text-text-main line-clamp-2" title={img.prompt}>{img.prompt}</p>
                      <div className="flex justify-between items-center mt-3 text-xs text-text-muted font-mono uppercase">
                        <span>{new Date(img.created_at).toLocaleDateString()}</span>
                        <span className="px-2 py-0.5 bg-bg-dark rounded border border-bg-input">{img.provider}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
