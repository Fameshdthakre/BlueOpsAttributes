"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/app/components/PageHeader";
import { useParams } from "next/navigation";
import { Settings, Play, Database, History, LayoutGrid, List } from "lucide-react";

export default function ListingScraperWorkspace() {
  const params = useParams();
  const projectId = params?.id as string;
  const [activeTab, setActiveTab] = useState<"catalogue" | "configure" | "runs" | "report">("catalogue");
  
  const [project, setProject] = useState<any>(null);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New ASIN input
  const [newAsins, setNewAsins] = useState("");

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projRes, catRes, repRes] = await Promise.all([
        fetch(`/api/listing-scrape/projects/${projectId}`),
        fetch(`/api/listing-scrape/projects/${projectId}/catalogue`),
        fetch(`/api/listing-scrape/projects/${projectId}/report`)
      ]);
      
      if (projRes.ok) setProject((await projRes.json()).project);
      if (catRes.ok) setCatalogue((await catRes.json()).catalogue);
      if (repRes.ok) setReport((await repRes.json()).report);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addAsins = async () => {
    const asins = newAsins.split(/[\s,]+/).filter(Boolean);
    if (!asins.length) return;
    
    try {
      const res = await fetch(`/api/listing-scrape/projects/${projectId}/catalogue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asins })
      });
      if (res.ok) {
        setNewAsins("");
        fetchProjectData(); // Refresh catalogue
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startRun = async () => {
    // Call the new job engine to start a run for this project
    try {
      const res = await fetch(`/api/listing-scrape/projects/${projectId}/run`, {
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
        title={project?.name || "Project Workspace"}
        subtitle="Manage this catalogue, configure scraping rules, and track historical runs."
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/dashboard" }, 
          { label: "Listing Intelligence", href: "/listing-scraper" },
          { label: "Workspace" }
        ]}
      />

      <div className="px-8 mt-2 flex justify-between items-end border-b border-bg-input">
        <div className="flex gap-2">
          {[
            { id: "catalogue", label: "Catalogue", icon: Database },
            { id: "configure", label: "Configure", icon: Settings },
            { id: "runs", label: "Run History", icon: History },
            { id: "report", label: "Delta Report", icon: LayoutGrid }
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
        {activeTab === "catalogue" && (
            <div className="bg-bg-card border border-bg-input rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold">ASIN Catalogue</h3>
                        <p className="text-text-muted mt-1">Manage the list of ASINs you want to track in this project.</p>
                    </div>
                </div>

                <div className="mb-8 flex gap-4">
                    <input 
                        type="text" 
                        placeholder="Enter ASINs separated by comma or space..." 
                        value={newAsins}
                        onChange={(e) => setNewAsins(e.target.value)}
                        className="flex-1 bg-bg-dark border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none"
                    />
                    <button 
                        onClick={addAsins}
                        className="bg-bg-input hover:bg-bg-dark text-text-main px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        Add ASINs
                    </button>
                </div>

                {catalogue.length === 0 ? (
                    <div className="p-12 border-2 border-dashed border-bg-input rounded-xl text-center">
                        <Database className="mx-auto text-text-muted mb-4" size={32} />
                        <p className="text-text-muted">No ASINs added yet. Add some above to start tracking.</p>
                    </div>
                ) : (
                    <div className="overflow-hidden border border-bg-input rounded-xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-bg-dark border-b border-bg-input">
                                    <th className="p-4 font-semibold text-text-muted text-sm">ASIN</th>
                                    <th className="p-4 font-semibold text-text-muted text-sm">Tags</th>
                                    <th className="p-4 font-semibold text-text-muted text-sm">Added</th>
                                </tr>
                            </thead>
                            <tbody>
                                {catalogue.map((item) => (
                                    <tr key={item.id} className="border-b border-bg-input last:border-0 hover:bg-bg-main/50 transition-colors">
                                        <td className="p-4 font-mono text-primary">{item.asin}</td>
                                        <td className="p-4">
                                            {item.tags?.length ? (
                                                item.tags.map((t: string) => <span key={t} className="bg-bg-dark text-xs px-2 py-1 rounded mr-2">{t}</span>)
                                            ) : (
                                                <span className="text-text-muted text-sm italic">None</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-text-muted text-sm">
                                            {new Date(item.added_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}

        {activeTab === "configure" && (
            <div className="bg-bg-card border border-bg-input rounded-xl p-8 space-y-8">
                <div>
                    <h3 className="text-xl font-bold mb-4">Project Configuration</h3>
                    <p className="text-text-muted mb-6">Set target marketplaces and attributes to track for this catalogue.</p>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-text-main mb-3">Target Marketplaces</label>
                    <div className="flex gap-4">
                        {["com", "co.uk", "de", "ca", "mx", "fr", "it", "es"].map(mp => (
                            <label key={mp} className="flex items-center gap-2 cursor-pointer bg-bg-dark px-4 py-2 rounded-lg border border-bg-input hover:border-primary/50 transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-bg-input text-primary focus:ring-primary focus:ring-offset-bg-dark bg-transparent"
                                    checked={project?.marketplaces?.includes(mp) || false}
                                    onChange={async (e) => {
                                        const isChecked = e.target.checked;
                                        let updated = project?.marketplaces || [];
                                        if (isChecked && !updated.includes(mp)) updated = [...updated, mp];
                                        if (!isChecked) updated = updated.filter((m: string) => m !== mp);
                                        
                                        // Optimistic update
                                        setProject({...project, marketplaces: updated});
                                        // Save
                                        fetch(`/api/listing-scrape/projects/${projectId}`, {
                                            method: "PUT",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ marketplaces: updated })
                                        });
                                    }}
                                />
                                <span className="text-text-main uppercase text-sm font-bold">{mp}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-text-main mb-3">Attributes to Track</label>
                    <div className="grid grid-cols-2 gap-3 max-w-2xl">
                        {["Title", "Price", "Brand", "Bullets", "Description", "Main Images"].map(attr => (
                            <div key={attr} className="flex items-center gap-3 p-3 bg-bg-dark border border-bg-input rounded-lg">
                                <input type="checkbox" checked={true} readOnly className="rounded border-bg-input text-primary bg-transparent" />
                                <span className="text-sm">{attr}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-text-muted text-xs mt-3">Currently all standard listing attributes are tracked automatically on every run.</p>
                </div>
            </div>
        )}

        {activeTab === "runs" && (
            <div className="bg-bg-card border border-bg-input rounded-xl p-8">
                <h3 className="text-xl font-bold mb-4">Run History</h3>
                <p className="text-text-muted mb-6">View all historical scraping runs and their status.</p>
                {/* Runs list connected to SSE would go here */}
            </div>
        )}

        {activeTab === "report" && (
            <div className="bg-bg-card border border-bg-input rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold">Delta Report</h3>
                        <p className="text-text-muted mt-1">Track changes in titles, bullets, and prices over time.</p>
                    </div>
                </div>
                
                {report.length === 0 ? (
                    <div className="p-12 border-2 border-dashed border-bg-input rounded-xl text-center">
                        <LayoutGrid className="mx-auto text-text-muted mb-4" size={32} />
                        <p className="text-text-muted">No scrape results yet. Run a job to see data here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {report.map((item, idx) => (
                            <div key={idx} className={`border rounded-xl p-6 ${item.change_detected ? 'border-amber-500/30 bg-amber-500/5' : 'border-bg-input bg-bg-dark'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-mono text-primary font-bold text-lg">{item.asin}</h4>
                                        <div className="text-xs text-text-muted mt-1">Last Updated: {new Date(item.last_updated).toLocaleString()}</div>
                                    </div>
                                    {item.change_detected && (
                                        <span className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                            Change Detected
                                        </span>
                                    )}
                                </div>
                                
                                {item.scraped_data && (
                                    <div className="grid grid-cols-2 gap-6 mt-4 border-t border-bg-input pt-4">
                                        <div>
                                            <div className="text-xs font-bold text-text-muted uppercase mb-1">Title</div>
                                            <div className="text-sm line-clamp-2">{item.scraped_data.title || "N/A"}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-text-muted uppercase mb-1">Price</div>
                                            <div className="text-sm">{item.scraped_data.price || "N/A"}</div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs font-bold text-text-muted uppercase mb-1">Brand</div>
                                            <div className="text-sm">{item.scraped_data.brand || "N/A"}</div>
                                        </div>
                                    </div>
                                )}
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
