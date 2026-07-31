"use client";

import React, { useState, useRef } from "react";

interface AsinUploaderProps {
  onAsinsLoaded: (asins: string[]) => void;
  disabled?: boolean;
}

export default function AsinUploader({ onAsinsLoaded, disabled }: AsinUploaderProps) {
  const [text, setText] = useState("");
  const [count, setCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAsins = (raw: string) => {
    const list = raw
      .split(/[\s,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 5 && s.length < 15);
    const unique = Array.from(new Set(list));
    setCount(unique.length);
    onAsinsLoaded(unique);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setCount(0); // reset count when text changes
  };

  const handleApplyText = () => {
    processAsins(text);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
      const txt = await file.text();
      setText(txt);
      processAsins(txt);
    } else {
      alert("Unsupported file format. Please upload .csv or .txt");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-text-main">
          Paste ASINs
          <span className="ml-1 text-text-muted font-normal">(comma or newline separated)</span>
        </label>
        <textarea
          value={text}
          onChange={handleTextChange}
          disabled={disabled}
          placeholder={"B012345678\nB087654321"}
          className="w-full h-32 p-3 font-mono text-sm border border-bg-input bg-bg-dark rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 resize-y placeholder:text-text-muted transition-colors"
        />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">or</span>
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
              className="px-3 py-1.5 text-sm font-medium border border-bg-input bg-bg-card rounded-lg hover:bg-bg-input text-text-muted hover:text-text-main disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload CSV/TXT
            </button>
            {count > 0 && (
              <span className="text-xs text-status-success font-semibold">
                {count} ASINs loaded
              </span>
            )}
          </div>
          <button
            onClick={handleApplyText}
            disabled={disabled || !text.trim()}
            className="px-4 py-1.5 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            Load ASINs
          </button>
        </div>
      </div>
    </div>
  );
}
