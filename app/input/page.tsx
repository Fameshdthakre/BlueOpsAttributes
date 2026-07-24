"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useApp } from '@/lib/AppContext';

const findHeader = (headersLower: string[], ...keywords: string[]) => {
  return headersLower.find(h => keywords.some(k => h.includes(k)));
};

export default function InputPage() {
  const router = useRouter();
  
  const [asinFile, setAsinFile] = useState<File | null>(null);
  const [validationFile, setValidationFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    asinHeaders, setAsinHeaders,
    validationHeaders, setValidationHeaders,
    mappings, setMappings,
    valMappings, setValMappings,
    setJobsAndMap
  } = useApp();
  
  const { asinCol, attrCol, ptypeCol, brandCol, titleCol } = mappings;
  const { valAttrCol, valPtypeCol, valDdCol } = valMappings;

  const handleAsinUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const f = e.target.files[0];
    setAsinFile(f);
    try {
      const res = await api.uploadFile(f);
      setAsinHeaders(res.headers);
      
      // Auto-detect mappings
      const h_lower = res.headers.map((h: string) => h.toLowerCase());
      
      const asinMatch = findHeader(h_lower, "asin");
      const attrMatch = findHeader(h_lower, "attribute");
      const ptypeMatch = findHeader(h_lower, "product type", "producttype");
      const brandMatch = findHeader(h_lower, "brand");
      const titleMatch = findHeader(h_lower, "title", "name");
      
      setMappings({
        asinCol: asinMatch ? res.headers[h_lower.indexOf(asinMatch)] : "",
        attrCol: attrMatch ? res.headers[h_lower.indexOf(attrMatch)] : "",
        ptypeCol: ptypeMatch ? res.headers[h_lower.indexOf(ptypeMatch)] : "",
        brandCol: brandMatch ? res.headers[h_lower.indexOf(brandMatch)] : "",
        titleCol: titleMatch ? res.headers[h_lower.indexOf(titleMatch)] : ""
      });
      
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
      
      const valAttrMatch = findHeader(h_lower, "attribute");
      const valPtypeMatch = findHeader(h_lower, "product type", "producttype");
      const valDdMatch = findHeader(h_lower, "allowed values", "dropdown");
      
      setValMappings({
        valAttrCol: valAttrMatch ? res.headers[h_lower.indexOf(valAttrMatch)] : "",
        valPtypeCol: valPtypeMatch ? res.headers[h_lower.indexOf(valPtypeMatch)] : "",
        valDdCol: valDdMatch ? res.headers[h_lower.indexOf(valDdMatch)] : ""
      });
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
      let validationMapToUse = {};
      
      // Parse validation if provided
      if (validationFile && valAttrCol && valDdCol) {
        const valRes = await api.parseValidation(validationFile, valAttrCol, valPtypeCol, valDdCol);
        validationMapToUse = valRes.validation_map;
      }
      
      // Generate Jobs locally
      const rawData = JSON.parse(sessionStorage.getItem("blueops_jobs_raw") || "[]");
      const jobMap: Record<string, any> = {};
      
      rawData.forEach((row: any) => {
        const asin = row[asinCol];
        const attr = row[attrCol];
        if (!asin || !attr) return;
        
        if (!jobMap[asin]) {
          jobMap[asin] = {
            asin,
            attributes: [],
            product_type: ptypeCol ? row[ptypeCol] : "",
            brand: brandCol ? row[brandCol] : "",
            title: titleCol ? row[titleCol] : "",
            extra_data: row
          };
        }
        const attrs = attr.split("|").map((a: string) => a.trim()).filter(Boolean);
        
        attrs.forEach((a: string) => {
          if (!jobMap[asin].attributes.includes(a)) {
            jobMap[asin].attributes.push(a);
          }
        });
      });
      
      setJobsAndMap(Object.values(jobMap), validationMapToUse);
      
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
              <div className="bg-bg-dark rounded-lg overflow-x-auto w-full border border-bg-input">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-bg-input/50 text-text-muted">
                    <tr>
                      <th className="p-3 font-semibold w-1/3">Data Field</th>
                      <th className="p-3 font-semibold">Excel Column</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bg-input">
                    <tr>
                      <td className="p-3 text-text-main font-medium flex items-center gap-2">ASIN <span className="text-status-error text-xs">*</span></td>
                      <td className="p-2">
                        <select value={asinCol} onChange={e => setMappings({...mappings, asinCol: e.target.value})} className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all">
                          <option value="">-- Select --</option>
                          {asinHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 text-text-main font-medium flex items-center gap-2">Attribute <span className="text-status-error text-xs">*</span></td>
                      <td className="p-2">
                        <select value={attrCol} onChange={e => setMappings({...mappings, attrCol: e.target.value})} className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all">
                          <option value="">-- Select --</option>
                          {asinHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 text-text-muted">Product Type</td>
                      <td className="p-2">
                        <select value={ptypeCol} onChange={e => setMappings({...mappings, ptypeCol: e.target.value})} className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all">
                          <option value="">-- Select --</option>
                          {asinHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 text-text-muted">Brand</td>
                      <td className="p-2">
                        <select value={brandCol} onChange={e => setMappings({...mappings, brandCol: e.target.value})} className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all">
                          <option value="">-- Select --</option>
                          {asinHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 text-text-muted">Title</td>
                      <td className="p-2">
                        <select value={titleCol} onChange={e => setMappings({...mappings, titleCol: e.target.value})} className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-primary transition-all">
                          <option value="">-- Select --</option>
                          {asinHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Validation Card */}
        <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
          <h2 className="text-xl font-semibold mb-4 text-text-main flex items-center gap-2">
            <span className="text-accent">2</span> Validation Reference
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
              <div className="bg-bg-dark rounded-lg overflow-x-auto w-full border border-bg-input">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-bg-input/50 text-text-muted">
                    <tr>
                      <th className="p-3 font-semibold w-1/3">Data Field</th>
                      <th className="p-3 font-semibold">Excel Column</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bg-input">
                    <tr>
                      <td className="p-3 text-text-main font-medium flex items-center gap-2">Attribute <span className="text-status-error text-xs">*</span></td>
                      <td className="p-2">
                        <select value={valAttrCol} onChange={e => setValMappings({...valMappings, valAttrCol: e.target.value})} className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-accent transition-all">
                          <option value="">-- Select --</option>
                          {validationHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 text-text-main font-medium flex items-center gap-2">Dropdown <span className="text-status-error text-xs">*</span></td>
                      <td className="p-2">
                        <select value={valDdCol} onChange={e => setValMappings({...valMappings, valDdCol: e.target.value})} className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-accent transition-all">
                          <option value="">-- Select --</option>
                          {validationHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 text-text-muted">Product Type</td>
                      <td className="p-2">
                        <select value={valPtypeCol} onChange={e => setValMappings({...valMappings, valPtypeCol: e.target.value})} className="w-full bg-bg-card border-none rounded p-2 text-text-main outline-none focus:ring-1 focus:ring-accent transition-all">
                          <option value="">-- Select --</option>
                          {validationHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <button 
          onClick={handleContinue}
          disabled={loading || asinHeaders.length === 0 || !asinCol || !attrCol}
          className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? "Processing..." : "Next: Configure Processing"}
        </button>
      </div>
    </div>
  );
}
