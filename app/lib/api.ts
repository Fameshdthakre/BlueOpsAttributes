import {
  Job,
  ProcessResult,
  SessionResult,
  DetailedSessionResult,
} from "./types";

import { getSession } from "next-auth/react";

// Helper to get user ID from session
const getUserId = async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }
  return session.user.id;
};

// Wrapper for fetch to inject user_id header
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set("x-user-id", await getUserId());

  return fetch(url, {
    cache: 'no-store',
    ...options,
    headers,
  });
};

export const api = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetchWithAuth("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  parseValidation: async (
    file: File,
    attributeCol: string,
    productTypeCol: string,
    dropdownCol: string,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("attribute_col", attributeCol);
    formData.append("product_type_col", productTypeCol);
    formData.append("dropdown_col", dropdownCol);
    const res = await fetchWithAuth("/api/parse_validation", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  buildJobs: async (payload: any) => {
    const res = await fetchWithAuth("/api/build_jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getDashboardStats: async () => {
    const res = await fetchWithAuth("/api/dashboard/stats", {
      method: "GET",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  createSession: async (inputFile: string) => {
    const res = await fetchWithAuth("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input_file: inputFile }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  updateSession: async (sessionId: string, status: string) => {
    const res = await fetchWithAuth("/api/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, status }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  processAsin: async (
    sessionId: string,
    job: Job,
    validationMap: any,
  ): Promise<ProcessResult> => {
    const res = await fetchWithAuth("/api/process_asin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        asin: job.asin,
        attributes: job.attributes,
        product_type: job.product_type,
        brand: job.brand,
        title: job.title,
        barcode: job.barcode,
        description: job.description,
        validation_map: validationMap,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getSessions: async (): Promise<{ sessions: SessionResult[] }> => {
    const res = await fetchWithAuth("/api/history");
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  deleteSessions: async (sessionIds?: string[], clearAll: boolean = false) => {
    const res = await fetchWithAuth("/api/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_ids: sessionIds, clear_all: clearAll }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getSessionDetails: async (
    sessionId: string,
  ): Promise<DetailedSessionResult> => {
    const res = await fetchWithAuth(`/api/history?session_id=${sessionId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getSettings: async () => {
    const res = await fetchWithAuth("/api/settings");
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  saveSettings: async (config: any) => {
    const res = await fetchWithAuth("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  testConnection: async (provider: string, apiKey: string, model: string) => {
    const res = await fetchWithAuth("/api/test_connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_name: provider, api_key: apiKey, model }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  exportSessionUrl: async (sessionId: string, format: "long" | "wide" = "long") => {
    return `/api/export?session_id=${sessionId}&user_id=${await getUserId()}&format=${format}`;
  },

  downloadTemplatesUrl: () => {
    return `/api/templates`;
  },

  updateResult: async (payload: any) => {
    const res = await fetchWithAuth("/api/update_result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
