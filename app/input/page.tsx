"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function InputPage() {
  const router = useRouter();
  
  const [asinFile, setAsinFile] = useState<File | null>(null);
  const [validationFile, setValidationFile] = useState<File | null>(null);
  
  const [asinHeaders, setAsinHeaders] = useState<string[]>([]);
  const [validationHeaders, setValidationHeaders] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mappings
  const [asinCol, setAsinCol] = useState("");
  const [attrCol, setAttrCol] = useState("");
  const [ptypeCol, setPtypeCol] = useState("");
  const [brandCol, setBrandCol] = useState("");
  const [titleCol, setTitleCol] = useState("");
  
  const [valAttrCol, setValAttrCol] = useState("");
  const [valPtypeCol, setValPtypeCol] = useState("");
  const [valDdCol, setValDdCol] = useState("");

  const handleAsinUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const f = e.target.files[0];
    setAsinFile(f);
    try {
      const res = await api.uploadFile(f);
      setAsinHeaders(res.headers);
      
      // Auto-detect mappings
      const h_lower = res.headers.map((h: string) => h.toLowerCase());
      if (h_lower.includes("asin")) setAsinCol(res.headers[h_lower.indexOf("asin")]);
      if (h_lower.includes("attributeid")) setAttrCol(res.headers[h_lower.indexOf("attributeid")]);
      if (h_lower.includes("product type")) setPtypeCol(res.headers[h_lower.indexOf("product type")]);
      if (h_lower.includes("brand")) setBrandCol(res.headers[h_lower.indexOf("brand")]);
      if (h_lower.includes("title")) setTitleCol(res.headers[h_lower.indexOf("title")]);
      
      // Store raw data in session storage for the process page
      sessionStorage.setItem("blueops_jobs_raw", JSON.stringify(res.data));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleValidationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const f = e.target.files[0];
    setValidationFile(f);
    try {
      const res = await api.uploadFile(f); // Just to get headers for mapping
      setValidationHeaders(res.headers);
      
      const h_lower = res.headers.map((h: string) => h.toLowerCase());
      if (h_lower.includes("attributeid")) setValAttrCol(res.headers[h_lower.indexOf("attributeid")]);
      if (h_lower.includes("product type")) setValPtypeCol(res.headers[h_lower.indexOf("product type")]);
      if (h_lower.includes("allowed values")) setValDdCol(res.headers[h_lower.indexOf("allowed values")]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleContinue = async () => {
    if (!asinCol || !attrCol) {
      setError("Please map the required ASIN and Attribute columns.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Parse validation if provided
      if (validationFile && valAttrCol && valDdCol) {
        const valRes = await api.parseValidation(validationFile, valAttrCol, valPtypeCol, valDdCol);
        sessionStorage.setItem("blueops_validation_map", JSON.stringify(valRes.validation_map));
      } else {
        sessionStorage.setItem("blueops_validation_map", JSON.stringify({}));
      }
      
      // Save mappings
      sessionStorage.setItem("blueops_mappings", JSON.stringify({
        asinCol, attrCol, ptypeCol, brandCol, titleCol
      }));
      
      // Navigate to process page
      router.push('/process');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Input Data</h1>
          <p className="text-text-muted mt-2">Upload your ASIN extraction jobs and validation reference.</p>
        </div>
        <a 
          href={api.downloadTemplatesUrl()}
          className="bg-bg-input hover:bg-surface-2 text-accent px-4 py-2 rounded-lg font-medium border border-accent/20 hover:border-accent/50 transition-colors flex items-center gap-2"
        >
          <span>📥</span> Download Templates
        </a>
      </header>
      
      {error && (
        <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ASIN Card */}
        <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
          <h2 className="text-xl font-semibold mb-4 text-text-main flex items-center gap-2">
            <span className="text-primary">1</span> ASIN Job File
          </h2>
          
          <input 
            type="file" 
            accept=".xlsx, .xls"
            onChange={handleAsinUpload}
            className="block w-full text-sm text-text-muted
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-white
              hover:file:bg-primary-hover
              cursor-pointer mb-6"
          />
          
          {asinHeaders.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Column Mapping</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-text-main">ASIN Col *</label>
                  <select value={asinCol} onChange={e => setAsinCol(e.target.value)} className="w-full bg-bg-input border-none rounded p-2 text-text-main">
                    <option value="">-- Select --</option>
                    {asinHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-text-main">Attribute Col *</label>
                  <select value={attrCol} onChange={e => setAttrCol(e.target.value)} className="w-full bg-bg-input border-none rounded p-2 text-text-main">
                    <option value="">-- Select --</option>
                    {asinHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-text-main">Product Type</label>
                  <select value={ptypeCol} onChange={e => setPtypeCol(e.target.value)} className="w-full bg-bg-input border-none rounded p-2 text-text-main">
                    <option value="">-- Select --</option>
                    {asinHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-text-main">Brand</label>
                  <select value={brandCol} onChange={e => setBrandCol(e.target.value)} className="w-full bg-bg-input border-none rounded p-2 text-text-main">
                    <option value="">-- Select --</option>
                    {asinHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-text-main">Title</label>
                  <select value={titleCol} onChange={e => setTitleCol(e.target.value)} className="w-full bg-bg-input border-none rounded p-2 text-text-main">
                    <option value="">-- Select --</option>
                    {asinHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validation Card */}
        <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
          <h2 className="text-xl font-semibold mb-4 text-text-main flex items-center gap-2">
            <span className="text-accent">2</span> Validation Reference (Optional)
          </h2>
          
          <input 
            type="file" 
            accept=".xlsx, .xls"
            onChange={handleValidationUpload}
            className="block w-full text-sm text-text-muted
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-accent file:text-white
              hover:file:bg-accent/90
              cursor-pointer mb-6"
          />
          
          {validationHeaders.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Column Mapping</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-text-main">Attribute Col *</label>
                  <select value={valAttrCol} onChange={e => setValAttrCol(e.target.value)} className="w-full bg-bg-input border-none rounded p-2 text-text-main">
                    <option value="">-- Select --</option>
                    {validationHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-text-main">Dropdown Col *</label>
                  <select value={valDdCol} onChange={e => setValDdCol(e.target.value)} className="w-full bg-bg-input border-none rounded p-2 text-text-main">
                    <option value="">-- Select --</option>
                    {validationHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-text-main">Product Type</label>
                  <select value={valPtypeCol} onChange={e => setValPtypeCol(e.target.value)} className="w-full bg-bg-input border-none rounded p-2 text-text-main">
                    <option value="">-- Select --</option>
                    {validationHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <button 
          onClick={handleContinue}
          disabled={loading || !asinFile || !asinCol || !attrCol}
          className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? "Processing..." : "Next: Configure Processing"}
        </button>
      </div>
    </div>
  );
}
