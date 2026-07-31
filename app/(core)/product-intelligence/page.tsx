"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/app/components/PageHeader";
import Link from "next/link";
import { Plus, Settings, Play, Database, Link as LinkIcon, AlertTriangle } from "lucide-react";

export default function ProductIntelligenceDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [listingProjects, setListingProjects] = useState<any[]>([]);
  const [imageProjects, setImageProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Project Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedListingProject, setSelectedListingProject] = useState("");
  const [selectedImageProject, setSelectedImageProject] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, listRes, imgRes] = await Promise.all([
        fetch("/api/product-intelligence/projects"),
        fetch("/api/listing-scraper/projects"),
        fetch("/api/image-audit/projects")
      ]);
      
      if (prodRes.ok) setProjects((await prodRes.json()).projects);
      if (listRes.ok) setListingProjects((await listRes.json()).projects);
      if (imgRes.ok) setImageProjects((await imgRes.json()).projects);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newName) return alert("Please enter a name for the unified project");
    
    try {
      const res = await fetch("/api/product-intelligence/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newName,
          listing_project_id: selectedListingProject || null,
          image_project_id: selectedImageProject || null,
          webhook_url: webhookUrl || null
        })
      });
      
      if (res.ok) {
        setIsCreating(false);
        setNewName("");
        setSelectedListingProject("");
        setSelectedImageProject("");
        setWebhookUrl("");
        fetchData();
      }
    } catch (e) {
      console.error("Failed to create unified project", e);
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="Product Intelligence"
        subtitle="Unify your Listing and Image tracking into a single, proactive health dashboard."
        breadcrumbs={[{ label: "BlueOps Hub", href: "/dashboard" }, { label: "Product Intelligence" }]}
      />

      <div className="p-8 max-w-7xl mx-auto w-full flex-1">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-text-main">Unified Projects</h2>
            <p className="text-text-muted mt-1">Combine a Listing Scraper and Image Auditor project to see full ASIN health.</p>
          </div>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={20} /> New Unified Project
          </button>
        </div>

        {isCreating && (
          <div className="bg-bg-card border border-bg-input rounded-xl p-8 mb-8">
            <h3 className="text-xl font-bold mb-6">Create Unified Project</h3>
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-semibold mb-2">Project Name</label>
                <input 
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Q4 Global Brand Health"
                  className="w-full bg-bg-dark border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-primary">Link Listing Project</label>
                  <select 
                    value={selectedListingProject} onChange={e => setSelectedListingProject(e.target.value)}
                    className="w-full bg-bg-dark border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none"
                  >
                    <option value="">-- None --</option>
                    {listingProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-primary">Link Image Project</label>
                  <select 
                    value={selectedImageProject} onChange={e => setSelectedImageProject(e.target.value)}
                    className="w-full bg-bg-dark border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none"
                  >
                    <option value="">-- None --</option>
                    {imageProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  Alert Webhook URL (Slack/Teams)
                </label>
                <input 
                  type="text" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full bg-bg-dark border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none"
                />
                <p className="text-xs text-text-muted mt-2">We'll send a POST request here automatically if a Listing diff or Image mismatch is detected.</p>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsCreating(false)} className="px-6 py-3 font-semibold text-text-muted hover:text-text-main transition-colors">Cancel</button>
                <button onClick={createProject} className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-bold transition-all">Create Project</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-text-muted">Loading projects...</div>
        ) : projects.length === 0 && !isCreating ? (
          <div className="bg-bg-card border border-dashed border-bg-input rounded-2xl p-16 text-center">
            <Database className="mx-auto text-text-muted mb-4" size={48} />
            <h3 className="text-xl font-bold text-text-main mb-2">No Unified Projects Yet</h3>
            <p className="text-text-muted max-w-md mx-auto mb-6">
              Link your Listing Scraper and Image Auditor projects together to create a master health dashboard for your catalogue.
            </p>
            <button onClick={() => setIsCreating(true)} className="bg-bg-input hover:bg-bg-dark text-text-main px-6 py-2 rounded-lg font-medium transition-colors">
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(p => (
              <Link href={`/product-intelligence/${p.id}`} key={p.id}>
                <div className="bg-bg-card border border-bg-input hover:border-primary/50 transition-all rounded-xl p-6 group cursor-pointer h-full flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-text-main group-hover:text-primary transition-colors">{p.name}</h3>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon size={14} className="text-text-muted" />
                      <span className="text-text-muted">Listing:</span>
                      <span className="font-semibold">{p.listing_project_name || "None"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon size={14} className="text-text-muted" />
                      <span className="text-text-muted">Image:</span>
                      <span className="font-semibold">{p.image_project_name || "None"}</span>
                    </div>
                    {p.webhook_url && (
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span className="text-amber-500 font-semibold text-xs uppercase tracking-wider">Alerts Active</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-bg-input flex justify-end items-center text-sm">
                    <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">Open Dashboard &rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
