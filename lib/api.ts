import { Job, ProcessResult, SessionResult, DetailedSessionResult } from './types';

export const api = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  parseValidation: async (file: File, attributeCol: string, productTypeCol: string, dropdownCol: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('attribute_col', attributeCol);
    formData.append('product_type_col', productTypeCol);
    formData.append('dropdown_col', dropdownCol);
    const res = await fetch('/api/parse_validation', { method: 'POST', body: formData });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  createSession: async (inputFile: string) => {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_file: inputFile })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  updateSession: async (sessionId: string, status: string) => {
    const res = await fetch('/api/session', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, status })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  processAsin: async (
    sessionId: string, 
    job: Job, 
    validationMap: any
  ): Promise<ProcessResult> => {
    const res = await fetch('/api/process_asin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        asin: job.asin,
        attributes: job.attributes,
        product_type: job.product_type,
        brand: job.brand,
        title: job.title,
        validation_map: validationMap
      })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getSessions: async (): Promise<{sessions: SessionResult[]}> => {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getSessionDetails: async (sessionId: string): Promise<DetailedSessionResult> => {
    const res = await fetch(`/api/history?session_id=${sessionId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getSettings: async () => {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  saveSettings: async (config: any) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  testConnection: async (provider: string, apiKey: string, model: string) => {
    const res = await fetch('/api/test_connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_name: provider, api_key: apiKey, model })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  
  exportSessionUrl: (sessionId: string) => {
    return `/api/export?session_id=${sessionId}`;
  },
  
  downloadTemplatesUrl: () => {
    return `/api/templates`;
  }
};
