"use client";

import React, { useState, useEffect } from "react";

interface ColumnMapperProps {
  headers: string[];
  targetFields: string[];
  onMappingComplete: (mapping: Record<string, string>) => void;
  initialMapping?: Record<string, string>;
}

export default function ColumnMapper({
  headers,
  targetFields,
  onMappingComplete,
  initialMapping,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialMapping) {
      setMapping(initialMapping);
    } else {
      // Auto-map based on exact/lowercase matches
      const initial: Record<string, string> = {};
      headers.forEach((h) => {
        const lowerH = h.toLowerCase().trim();
        const match = targetFields.find(
          (t) => t.toLowerCase() === lowerH || lowerH.includes(t.toLowerCase())
        );
        if (match && !Object.values(initial).includes(match)) {
          initial[match] = h;
        }
      });
      setMapping(initial);
    }
  }, [headers, targetFields, initialMapping]);

  const handleSelect = (targetField: string, header: string) => {
    setMapping((prev) => ({
      ...prev,
      [targetField]: header,
    }));
  };

  const handleApply = () => {
    onMappingComplete(mapping);
  };

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-bg-card border border-bg-input rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-main">Map Columns to Target Fields</h3>
          {mappedCount > 0 && (
            <span className="text-xs text-status-success font-semibold">
              {mappedCount}/{targetFields.length} mapped
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {targetFields.map((field) => (
            <div key={field} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted capitalize">
                {field.replace(/_/g, " ")}
              </label>
              <select
                value={mapping[field] || ""}
                onChange={(e) => handleSelect(field, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-bg-input bg-bg-dark rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              >
                <option value="">— Ignore —</option>
                {headers.map((h, i) => (
                  <option key={i} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-5">
          <button
            onClick={handleApply}
            className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
          >
            Confirm Mapping
          </button>
        </div>
      </div>
    </div>
  );
}
