import { Job, ProcessResult, SessionResult, DetailedSessionResult } from './types';

// Helper to get or create a unique device ID
const getDeviceId = () => {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem('blueops_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('blueops_device_id', deviceId);
  }
  return deviceId;
};

// Wrapper for fetch to inject device_id header
const fetchWithDevice = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set('x-device-id', getDeviceId());
  
  return fetch(url, {
    ...options,
    headers
  });
};

export const api = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetchWithDevice('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  parseValidation: async (file: File, attributeCol: string, productTypeCol: string, dropdownCol: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('attribute_col', attributeCol);
    formData.append('product_type_col', productTypeCol);
    formData.append('dropdown_col', dropdownCol);
    const res = await fetchWithDevice('/api/parse_validation', { method: 'POST', body: formData });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  createSession: async (inputFile: string) => {
    const res = await fetchWithDevice('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_file: inputFile })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  updateSession: async (sessionId: string, status: string) => {
    const res = await fetchWithDevice('/api/session', {
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
    const res = await fetchWithDevice('/api/process_asin', {
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
    const res = await fetchWithDevice('/api/history');
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  deleteSessions: async (sessionIds?: string[], clearAll: boolean = false) => {
    const res = await fetchWithDevice('/api/history', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_ids: sessionIds, clear_all: clearAll })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getSessionDetails: async (sessionId: string): Promise<DetailedSessionResult> => {
    const res = await fetchWithDevice(`/api/history?session_id=${sessionId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getSettings: async () => {
    const res = await fetchWithDevice('/api/settings');
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  saveSettings: async (config: any) => {
    const res = await fetchWithDevice('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  testConnection: async (provider: string, apiKey: string, model: string) => {
    const res = await fetchWithDevice('/api/test_connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_name: provider, api_key: apiKey, model })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  
  exportSessionUrl: (sessionId: string) => {
    return `/api/export?session_id=${sessionId}&device_id=${getDeviceId()}`;
  },
  
  downloadTemplatesUrl: () => {
    return `/api/templates`;
  }
};
