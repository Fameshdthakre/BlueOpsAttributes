"use client";

import React, { useState, useRef } from "react";

interface AsinUploaderProps {
  onAsinsLoaded: (asins: string[]) => void;
  disabled?: boolean;
}

export default function AsinUploader({ onAsinsLoaded, disabled }: AsinUploaderProps) {
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAsins = (raw: string) => {
    const list = raw
      .split(/[\s,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 5 && s.length < 15);
    const unique = Array.from(new Set(list));
    onAsinsLoaded(unique);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleApplyText = () => {
    processAsins(text);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
      const txt = await file.text();
      processAsins(txt);
    } else {
      alert("Unsupported file format. Please upload .csv or .txt");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-[var(--text-primary)]">
          Paste ASINs (Comma or newline separated)
        </label>
        <textarea
          value={text}
          onChange={handleTextChange}
          disabled={disabled}
          placeholder="B012345678&#10;B087654321"
          className="w-full h-32 p-3 font-mono text-sm border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--blue-500)] disabled:opacity-50 resize-y"
        />
        <div className="flex justify-between items-center mt-1">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)]">Or</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              onChange={handleFileUpload}
              disabled={disabled}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="px-3 py-1.5 text-sm font-medium border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded hover:bg-[var(--border-color)] disabled:opacity-50 transition-colors"
            >
              Upload CSV/TXT
            </button>
          </div>
          <button
            onClick={handleApplyText}
            disabled={disabled || !text.trim()}
            className="px-4 py-1.5 text-sm font-medium bg-[var(--blue-600)] text-white rounded hover:bg-[var(--blue-700)] disabled:opacity-50 transition-colors"
          >
            Load ASINs
          </button>
        </div>
      </div>
    </div>
  );
}
