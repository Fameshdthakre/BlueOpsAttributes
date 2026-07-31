"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/app/components/PageHeader";
import { useParams } from "next/navigation";
import { Settings, Play, Image as ImageIcon, History, LayoutGrid, CheckCircle, AlertTriangle } from "lucide-react";

export default function ImageAuditorWorkspace() {
  const params = useParams();
  const projectId = params?.id as string;
  const [activeTab, setActiveTab] = useState<"golden_record" | "configure" | "runs" | "report">("golden_record");
  
  const [project, setProject] = useState<any>(null);
  const [goldenRecords, setGoldenRecords] = useState<any[]>([]);
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Image input
  const [newAsin, setNewAsin] = useState("");
  const [newSlot, setNewSlot] = useState("MAIN");
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projRes, grRes, repRes] = await Promise.all([
        fetch(`/api/image-audit/projects/${projectId}`),
        fetch(`/api/image-audit/projects/${projectId}/golden-records`),
        fetch(`/api/image-audit/projects/${projectId}/report`)
      ]);
      
      if (projRes.ok) setProject((await projRes.json()).project);
      if (grRes.ok) setGoldenRecords((await grRes.json()).records);
      if (repRes.ok) setReport((await repRes.json()).report);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addGoldenRecord = async () => {
    if (!newAsin || !newSlot || !newImageUrl) return alert("Fill in all fields");
    
    try {
      const res = await fetch(`/api/image-audit/projects/${projectId}/golden-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin: newAsin, slot: newSlot, image_url: newImageUrl })
      });
      if (res.ok) {
        setNewAsin("");
        setNewImageUrl("");
        fetchProjectData(); // Refresh records
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startRun = async () => {
    try {
      const res = await fetch(`/api/image-audit/projects/${projectId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        alert("Run queued successfully!");
        setActiveTab("runs");
      } else {
        const data = await res.json();
        alert(`Failed to start run: ${data.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to start run.");
    }
  };

  if (loading) return <div className="p-10 text-center text-text-muted">Loading Workspace...</div>;

  return (
    <div className="animate-in fade-in flex flex-col h-full bg-bg-main">
      <PageHeader
        title={project?.name || "Image Intelligence Workspace"}
        subtitle="Manage Golden Records, configure rules, and view Audit Reports."
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/dashboard" }, 
          { label: "Image Intelligence", href: "/image-auditor" },
          { label: "Workspace" }
        ]}
      />

      <div className="px-8 mt-2 flex justify-between items-end border-b border-bg-input">
        <div className="flex gap-2">
          {[
            { id: "golden_record", label: "Golden Records", icon: ImageIcon },
            { id: "configure", label: "Configure", icon: Settings },
            { id: "runs", label: "Run History", icon: History },
            { id: "report", label: "Audit Report", icon: LayoutGrid }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-main"
                }`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            )
          })}
        </div>
        
        <div className="pb-3">
            <button 
                onClick={startRun}
                className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md shadow-primary/20"
            >
                <Play size={16} /> Run Now
            </button>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full flex-1 overflow-y-auto">
        {activeTab === "golden_record" && (
            <div className="bg-bg-card border border-bg-input rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold">Golden Record Library</h3>
                        <p className="text-text-muted mt-1">Upload the source of truth images for your ASINs.</p>
                    </div>
                </div>

                <div className="mb-8 flex gap-4 p-4 border border-bg-input rounded-xl bg-bg-dark">
                    <input 
                        type="text" placeholder="ASIN" value={newAsin} onChange={(e) => setNewAsin(e.target.value)}
                        className="w-32 bg-bg-main border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none uppercase"
                    />
                    <select 
                        value={newSlot} onChange={(e) => setNewSlot(e.target.value)}
                        className="w-32 bg-bg-main border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none"
                    >
                        <option value="MAIN">MAIN</option>
                        <option value="PT01">PT01</option>
                        <option value="PT02">PT02</option>
                        <option value="PT03">PT03</option>
                        <option value="PT04">PT04</option>
                        <option value="PT05">PT05</option>
                        <option value="PT06">PT06</option>
                    </select>
                    <input 
                        type="text" placeholder="Image URL (Source of Truth)" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)}
                        className="flex-1 bg-bg-main border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none"
                    />
                    <button 
                        onClick={addGoldenRecord}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
                    >
                        Add Record
                    </button>
                </div>

                {goldenRecords.length === 0 ? (
                    <div className="p-12 border-2 border-dashed border-bg-input rounded-xl text-center">
                        <ImageIcon className="mx-auto text-text-muted mb-4" size={32} />
                        <p className="text-text-muted">No Golden Records added yet. Add your first image above.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {goldenRecords.map((item) => (
                            <div key={item.id} className="border border-bg-input rounded-xl overflow-hidden bg-bg-dark flex flex-col">
                                <div className="h-48 bg-white flex items-center justify-center p-2 relative group">
                                    <img src={item.image_url} alt={`${item.asin} ${item.slot}`} className="max-h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button className="text-white text-xs font-bold underline">Edit / Replace</button>
                                    </div>
                                </div>
                                <div className="p-4 flex justify-between items-center border-t border-bg-input">
                                    <span className="font-mono text-primary font-bold">{item.asin}</span>
                                    <span className="bg-bg-input text-xs px-2 py-1 rounded">{item.slot}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === "configure" && (
            <div className="bg-bg-card border border-bg-input rounded-xl p-8 space-y-8">
                <div>
                    <h3 className="text-xl font-bold mb-4">Project Configuration</h3>
                    <p className="text-text-muted mb-6">Set target marketplaces and AI match thresholds.</p>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-text-main mb-3">Target Marketplaces</label>
                    <div className="flex gap-4">
                        {["com", "co.uk", "de", "ca", "mx"].map(mp => (
                            <label key={mp} className="flex items-center gap-2 cursor-pointer bg-bg-dark px-4 py-2 rounded-lg border border-bg-input hover:border-primary/50 transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-bg-input text-primary focus:ring-primary focus:ring-offset-bg-dark bg-transparent"
                                    checked={project?.marketplaces?.includes(mp) || false}
                                    readOnly
                                />
                                <span className="text-text-main uppercase text-sm font-bold">{mp}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === "runs" && (
            <div className="bg-bg-card border border-bg-input rounded-xl p-8">
                <h3 className="text-xl font-bold mb-4">Run History</h3>
                <p className="text-text-muted mb-6">View all historical audit runs and their status.</p>
                {/* Runs list would go here */}
            </div>
        )}

        {activeTab === "report" && (
            <div className="bg-bg-card border border-bg-input rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold">Audit Report</h3>
                        <p className="text-text-muted mt-1">Side-by-side comparison of Golden Records vs Live Marketplace.</p>
                    </div>
                </div>
                
                {report.length === 0 ? (
                    <div className="p-12 border-2 border-dashed border-bg-input rounded-xl text-center">
                        <LayoutGrid className="mx-auto text-text-muted mb-4" size={32} />
                        <p className="text-text-muted">No audit results yet. Run a job to see data here.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {report.map((item, idx) => (
                            <div key={idx} className={`border rounded-xl overflow-hidden ${item.status === 'MATCH' ? 'border-green-500/30' : item.status === 'MISMATCH' ? 'border-status-error/30' : 'border-amber-500/30'}`}>
                                <div className={`px-6 py-3 flex justify-between items-center ${item.status === 'MATCH' ? 'bg-green-500/10' : item.status === 'MISMATCH' ? 'bg-status-error/10' : 'bg-amber-500/10'}`}>
                                    <div className="flex gap-4 items-center">
                                        <span className="font-mono font-bold text-lg">{item.asin}</span>
                                        <span className="bg-black/20 px-2 py-1 rounded text-xs font-bold">{item.slot}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.status === 'MATCH' ? <CheckCircle size={18} className="text-green-500" /> : <AlertTriangle size={18} className={item.status === 'MISMATCH' ? 'text-status-error' : 'text-amber-500'} />}
                                        <span className={`font-bold ${item.status === 'MATCH' ? 'text-green-500' : item.status === 'MISMATCH' ? 'text-status-error' : 'text-amber-500'}`}>
                                            {item.status} ({Math.round(item.similarity_score * 100)}%)
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 divide-x divide-bg-input bg-bg-dark">
                                    <div className="p-6 flex flex-col items-center">
                                        <div className="text-xs font-bold text-text-muted uppercase mb-4 tracking-wider">Golden Record</div>
                                        <div className="h-64 bg-white rounded flex items-center justify-center p-2 w-full">
                                            {item.golden_url ? <img src={item.golden_url} alt="Golden" className="max-h-full object-contain" /> : <span className="text-text-muted italic">Missing</span>}
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col items-center">
                                        <div className="text-xs font-bold text-text-muted uppercase mb-4 tracking-wider">Live Marketplace</div>
                                        <div className="h-64 bg-white rounded flex items-center justify-center p-2 w-full">
                                            {item.live_url ? <img src={item.live_url} alt="Live" className="max-h-full object-contain" /> : <span className="text-text-muted italic">Missing</span>}
                                        </div>
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
