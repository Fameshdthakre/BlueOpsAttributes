"use client";

import { useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import { Upload, LayoutGrid, List, FileText, CheckCircle, Search } from "lucide-react";

export default function AplusPublisherWorkspace() {
  const [activeTab, setActiveTab] = useState<"library" | "queue" | "import">("library");
  
  return (
    <div className="animate-in fade-in flex flex-col h-full bg-bg-main">
      <PageHeader
        title="A+ Content Studio"
        subtitle="Manage A+ Content modules, import bulk data, and orchestrate publish queues."
        breadcrumbs={[{ label: "BlueOps Hub", href: "/dashboard" }, { label: "A+ Content Studio" }]}
      />

      <div className="px-8 mt-2 flex justify-between items-end border-b border-bg-input">
        <div className="flex gap-2">
          {[
            { id: "library", label: "Content Library", icon: LayoutGrid },
            { id: "import", label: "Excel Import", icon: Upload },
            { id: "queue", label: "Publish Queue", icon: List }
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
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full flex-1 overflow-y-auto">
        {activeTab === "library" && (
            <div className="bg-bg-card border border-bg-input rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold">Content Library</h3>
                        <p className="text-text-muted mt-1">Your saved A+ Content templates and modules.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search content..." 
                                className="bg-bg-dark border border-bg-input rounded-lg pl-10 pr-4 py-2 text-text-main focus:border-primary outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="border border-bg-input rounded-xl overflow-hidden bg-bg-dark hover:border-primary/50 transition-colors cursor-pointer group flex flex-col">
                            <div className="h-40 bg-bg-input flex items-center justify-center border-b border-bg-input">
                                <FileText className="text-text-muted group-hover:text-primary transition-colors" size={48} />
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-text-main group-hover:text-primary transition-colors">Premium Brand Story Template {i}</h4>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-xs text-text-muted">6 Modules</span>
                                    <span className="text-xs bg-bg-input px-2 py-1 rounded text-text-main">Global</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === "import" && (
            <div className="bg-bg-card border border-bg-input rounded-xl p-8 space-y-8">
                <div>
                    <h3 className="text-xl font-bold mb-4">Excel Bulk Import</h3>
                    <p className="text-text-muted mb-6">Import Excel files mapping ASINs to specific text strings and image URLs.</p>
                </div>

                <div className="border-2 border-dashed border-primary/50 rounded-xl p-16 text-center bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
                    <Upload className="mx-auto text-primary mb-4" size={48} />
                    <h4 className="text-lg font-bold text-text-main mb-2">Drag and drop your Excel file here</h4>
                    <p className="text-text-muted mb-6">Supports .xlsx and .csv files formatted for BlueOps A+ Studio</p>
                    <button className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-bold">
                        Browse Files
                    </button>
                </div>
                
                <div className="mt-8 border border-bg-input rounded-xl overflow-hidden">
                    <div className="bg-bg-dark p-4 border-b border-bg-input font-bold">
                        Data Preview (Example mapping)
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-bg-main border-b border-bg-input">
                                <th className="p-4 font-semibold text-text-muted text-sm">ASIN</th>
                                <th className="p-4 font-semibold text-text-muted text-sm">Template</th>
                                <th className="p-4 font-semibold text-text-muted text-sm">Module 1 Header</th>
                                <th className="p-4 font-semibold text-text-muted text-sm">Module 1 Image</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-bg-input text-sm">
                                <td className="p-4 font-mono">B08XXXXX</td>
                                <td className="p-4">Premium Brand Story Template 1</td>
                                <td className="p-4 line-clamp-1">Discover the new standard...</td>
                                <td className="p-4 text-primary">https://...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === "queue" && (
            <div className="bg-bg-card border border-bg-input rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold">Publish Queue</h3>
                        <p className="text-text-muted mt-1">Manage jobs orchestrated to the headless extension.</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="border border-green-500/30 rounded-xl overflow-hidden">
                        <div className="px-6 py-3 flex justify-between items-center bg-green-500/10">
                            <div className="flex gap-4 items-center">
                                <span className="font-bold text-lg">Batch Job #4092</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle size={18} className="text-green-500" />
                                <span className="font-bold text-green-500">Completed</span>
                            </div>
                        </div>
                        <div className="p-6 bg-bg-dark flex justify-between">
                            <div>
                                <div className="text-sm text-text-muted mb-1">Target Portal</div>
                                <div className="font-bold">Vendor Central (UK)</div>
                            </div>
                            <div>
                                <div className="text-sm text-text-muted mb-1">ASINs Processed</div>
                                <div className="font-bold">45 / 45</div>
                            </div>
                            <div>
                                <div className="text-sm text-text-muted mb-1">Completed At</div>
                                <div className="font-bold">Oct 24, 2:30 PM</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
