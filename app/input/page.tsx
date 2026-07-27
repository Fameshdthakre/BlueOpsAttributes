"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { useApp } from '@/app/lib/AppContext';
import PageHeader from '@/app/components/PageHeader';

const findHeader = (headersLower: string[], ...keywords: string[]) => {
  return headersLower.find(h => keywords.some(k => h.includes(k)));
};

export default function InputPage() {
  const router = useRouter();
  
  const [asinFile, setAsinFile] = useState<File | null>(null);
  const [validationFile, setValidationFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKeys, setHasApiKeys] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSettings = async () => {
      try {
        const conf = await api.getSettings();
        const hasKey = 
          (conf.providers?.OpenAI?.api_key) || 
          (conf.providers?.Gemini?.api_key) || 
          (conf.providers?.Claude?.api_key);
        setHasApiKeys(!!hasKey);
      } catch (err) {
        // If settings fail to load, default to true to not block the user unexpectedly
        setHasApiKeys(true);
      }
    };
    checkSettings();
  }, []);
  
  const {
    asinHeaders, setAsinHeaders,
    validationHeaders, setValidationHeaders,
    mappings, setMappings,
    valMappings, setValMappings,
    setJobsAndMap,
    enableLogs, setEnableLogs
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
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader 
        title="Input Data" 
        subtitle="Upload your ASIN extraction jobs and validation reference."
        breadcrumbs={[{ label: 'BlueOps Hub', href: '/' }, { label: 'Input' }]}
      >
        <a 
          href={api.downloadTemplatesUrl()}
          id="tour-templates"
          className="bg-bg-input hover:bg-surface-2 text-accent px-4 py-2 rounded-lg font-medium border border-accent/20 hover:border-accent/50 transition-colors flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Templates
        </a>
      </PageHeader>
      
      <div className="p-8 max-w-6xl mx-auto space-y-8 w-full overflow-y-auto flex-1">
      
      {error && (
        <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-lg">
          {error}
        </div>
      )}

      {hasApiKeys === false && (
        <div className="p-4 bg-status-warning/10 border border-status-warning/20 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-status-warning">
            <div className="text-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-status-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold">Missing AI Provider API Key</h3>
              <p className="text-sm opacity-90">You must add at least one API Key (OpenAI or Gemini) before you can process ASINs.</p>
            </div>
          </div>
          <Link href="/settings" className="bg-status-warning hover:bg-status-warning/80 text-bg-dark px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap text-center flex items-center gap-2">
            <span>Go to Settings</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ASIN Card */}
        <div className="bg-bg-card p-6 rounded-xl border border-bg-input" id="tour-asin-upload">
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
        <div className="bg-bg-card p-6 rounded-xl border border-bg-input" id="tour-validation-upload">
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
      
      <div className="flex justify-between items-center pt-4 border-t border-bg-input">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-main">
          <input 
            type="checkbox" 
            checked={enableLogs}
            onChange={(e) => setEnableLogs(e.target.checked)}
            className="w-4 h-4 accent-primary rounded border-bg-input bg-bg-dark"
          />
          Enable Live UI Logs
          <span className="text-xs text-text-muted font-normal ml-2">(Disable to save memory during massive batches)</span>
        </label>
        
        <button 
          onClick={handleContinue}
          disabled={loading || asinHeaders.length === 0 || !asinCol || !attrCol || hasApiKeys === false}
          className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? "Processing..." : "Next: Configure Processing"}
        </button>
      </div>
      </div>
    </div>
  );
}
