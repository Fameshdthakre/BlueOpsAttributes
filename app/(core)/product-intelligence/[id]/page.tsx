"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/app/components/PageHeader";
import { useParams } from "next/navigation";
import { CheckCircle, AlertTriangle, Info, Clock, AlertOctagon } from "lucide-react";

export default function ProductIntelligenceWorkspace() {
  const params = useParams();
  const projectId = params?.id as string;
  
  const [project, setProject] = useState<any>(null);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projRes, healthRes] = await Promise.all([
        fetch(`/api/product-intelligence/projects/${projectId}`),
        fetch(`/api/product-intelligence/projects/${projectId}/health`)
      ]);
      
      if (projRes.ok) setProject((await projRes.json()).project);
      if (healthRes.ok) setHealthData((await healthRes.json()).health);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-text-muted">Loading Workspace...</div>;

  return (
    <div className="animate-in fade-in flex flex-col h-full bg-bg-main">
      <PageHeader
        title={project?.name || "Product Intelligence"}
        subtitle="Unified health view of your ASINs across Listing attributes and Images."
        breadcrumbs={[
          { label: "BlueOps Hub", href: "/dashboard" }, 
          { label: "Product Intelligence", href: "/product-intelligence" },
          { label: "Health Dashboard" }
        ]}
      />

      <div className="p-8 max-w-[90rem] mx-auto w-full flex-1 overflow-y-auto">
        <div className="bg-bg-card border border-bg-input rounded-xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-bold">Catalogue Health Grid</h3>
                    <p className="text-text-muted mt-1">Aggregated data from linked Listing and Image projects.</p>
                </div>
                
                <div className="flex gap-4">
                    <div className="bg-bg-dark border border-bg-input rounded-lg p-3 flex gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <CheckCircle size={16} className="text-green-500" /> <span className="text-text-main font-semibold">Matched/Ok</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-500" /> <span className="text-text-main font-semibold">Changed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <AlertOctagon size={16} className="text-status-error" /> <span className="text-text-main font-semibold">Mismatch</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-text-muted" /> <span className="text-text-main font-semibold">Pending/No Data</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {healthData.length === 0 ? (
                <div className="p-16 border-2 border-dashed border-bg-input rounded-xl text-center">
                    <Info className="mx-auto text-text-muted mb-4" size={32} />
                    <p className="text-text-muted">No health data available. Ensure your linked Listing and Image projects have completed runs.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-bg-dark border-y border-bg-input">
                                <th className="p-4 font-bold text-text-muted text-xs uppercase tracking-wider w-1/4">ASIN</th>
                                <th className="p-4 font-bold text-text-muted text-xs uppercase tracking-wider text-center border-l border-bg-input w-1/4">Listing Status</th>
                                <th className="p-4 font-bold text-text-muted text-xs uppercase tracking-wider text-center border-l border-bg-input w-1/4">Image Status</th>
                                <th className="p-4 font-bold text-text-muted text-xs uppercase tracking-wider text-center border-l border-bg-input w-1/4">Overall Health</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-bg-input">
                            {healthData.map((item, idx) => {
                                const listingIcon = item.listing_status === 'ok' ? <CheckCircle className="text-green-500 mx-auto" /> 
                                                : item.listing_status === 'changed' ? <AlertTriangle className="text-amber-500 mx-auto" />
                                                : <Clock className="text-text-muted mx-auto" />;
                                                
                                const imageIcon = item.image_status === 'ok' ? <CheckCircle className="text-green-500 mx-auto" /> 
                                                : item.image_status === 'mismatch' ? <AlertOctagon className="text-status-error mx-auto" />
                                                : <Clock className="text-text-muted mx-auto" />;
                                                
                                const hasError = item.listing_status === 'changed' || item.image_status === 'mismatch';
                                
                                return (
                                    <tr key={idx} className="hover:bg-bg-dark/50 transition-colors">
                                        <td className="p-4 font-mono font-bold text-lg">{item.asin}</td>
                                        <td className="p-4 text-center border-l border-bg-input">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                {listingIcon}
                                                <span className="text-[10px] font-bold uppercase text-text-muted mt-1">{item.listing_status}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center border-l border-bg-input">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                {imageIcon}
                                                <span className="text-[10px] font-bold uppercase text-text-muted mt-1">{item.image_status}</span>
                                                {item.mismatches?.length > 0 && (
                                                    <div className="text-[10px] text-status-error bg-status-error/10 px-2 py-0.5 rounded mt-1">
                                                        {item.mismatches.map((m: any) => m.slot).join(', ')} failed
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center border-l border-bg-input">
                                            {hasError ? (
                                                <div className="bg-status-error/10 text-status-error border border-status-error/20 px-3 py-1.5 rounded inline-flex font-bold items-center gap-2">
                                                    Action Required
                                                </div>
                                            ) : (
                                                <div className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1.5 rounded inline-flex font-bold items-center gap-2">
                                                    Healthy
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
