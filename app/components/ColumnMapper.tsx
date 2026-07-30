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

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-4">Map Columns to Target Fields</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {targetFields.map((field) => (
            <div key={field} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--text-secondary)] capitalize">
                {field.replace(/_/g, " ")}
              </label>
              <select
                value={mapping[field] || ""}
                onChange={(e) => handleSelect(field, e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--blue-500)]"
              >
                <option value="">-- Ignore --</option>
                {headers.map((h, i) => (
                  <option key={i} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium bg-[var(--blue-600)] text-white rounded-md hover:bg-[var(--blue-700)] transition-colors"
          >
            Confirm Mapping
          </button>
        </div>
      </div>
    </div>
  );
}
