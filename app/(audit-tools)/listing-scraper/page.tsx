"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/app/components/PageHeader";
import Link from "next/link";
import { Plus, Settings, Play, Database } from "lucide-react";

export default function ListingScraperDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/listing-scrape/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/listing-scrape/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, marketplaces: ["com"] })
      });
      if (res.ok) {
        setIsCreating(false);
        setNewName("");
        fetchProjects();
      }
    } catch (e) {
      console.error("Failed to create project", e);
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="Listing Intelligence"
        subtitle="Manage persistent ASIN catalogues and track marketplace changes over time."
        breadcrumbs={[{ label: "BlueOps Hub", href: "/dashboard" }, { label: "Listing Intelligence" }]}
      />

      <div className="p-8 max-w-7xl mx-auto w-full flex-1">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-text-main">Your Projects</h2>
            <p className="text-text-muted mt-1">Organize your catalogues by brand, category, or region.</p>
          </div>
          <button 
            onClick={createProject}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={20} /> New Project
          </button>
        </div>

        {isCreating && (
          <div className="bg-bg-card border border-bg-input rounded-xl p-8 mb-8 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-xl font-bold mb-6 text-text-main">Create Listing Project</h3>
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-semibold mb-2 text-text-main">Project Name</label>
                <input 
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Q3 ASIN Catalogue"
                  className="w-full bg-bg-dark border border-bg-input rounded-lg p-3 text-text-main focus:border-primary outline-none"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsCreating(false)} className="px-6 py-3 font-semibold text-text-muted hover:text-text-main transition-colors">Cancel</button>
                <button onClick={createProject} className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-primary/20">Create Project</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-text-muted">Loading projects...</div>
        ) : projects.length === 0 && !isCreating ? (
          <div className="bg-bg-card border border-dashed border-bg-input rounded-2xl p-16 text-center">
            <Database className="mx-auto text-text-muted mb-4" size={48} />
            <h3 className="text-xl font-bold text-text-main mb-2">No Projects Yet</h3>
            <p className="text-text-muted max-w-md mx-auto mb-6">
              Create your first project to start tracking your ASIN catalogue against live Amazon data.
            </p>
            <button onClick={() => setIsCreating(true)} className="bg-bg-input hover:bg-bg-dark text-text-main px-6 py-2 rounded-lg font-medium transition-colors">
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(p => (
              <Link href={`/listing-scraper/${p.id}`} key={p.id}>
                <div className="bg-bg-card border border-bg-input hover:border-primary/50 transition-all rounded-xl p-6 group cursor-pointer h-full flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-text-main group-hover:text-primary transition-colors">{p.name}</h3>
                    <div className="bg-bg-input text-xs text-text-muted px-2 py-1 rounded uppercase font-bold">
                      {p.marketplaces.join(", ")}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm text-text-muted">
                      Created: {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-bg-input flex justify-between items-center text-sm">
                    <span className="text-text-muted flex items-center gap-1"><Settings size={14} /> Configure</span>
                    <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">Open Workspace &rarr;</span>
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
