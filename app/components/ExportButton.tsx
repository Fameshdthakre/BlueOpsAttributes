"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";

interface ExportButtonProps {
  endpoint: string; // e.g. "/api/listing-audit/sessions/123/report"
  filename: string;
  label?: string;
  className?: string;
}

export default function ExportButton({
  endpoint,
  filename,
  label = "Export CSV",
  className = "",
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const handleExport = async () => {
    if (!session?.user?.id) {
      alert("Not authenticated. Please sign in and try again.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(endpoint, {
        headers: {
          "x-user-id": session.user.id,
        },
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Export failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg bg-bg-card border border-bg-input text-text-muted hover:bg-bg-input hover:text-text-main disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors ${className}`}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
      )}
      {label}
    </button>
  );
}
