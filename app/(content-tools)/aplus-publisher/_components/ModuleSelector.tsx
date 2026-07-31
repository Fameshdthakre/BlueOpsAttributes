"use client";

import React, { useState } from "react";
import { AplusModule, MODULE_REGISTRY } from "@/app/lib/aplus-types";

interface ModuleSelectorProps {
  selectedModules: string[];
  onChange: (moduleIds: string[]) => void;
  multiSelect?: boolean;
}

const CATEGORIES = [
  { id: "all", label: "All Modules" },
  { id: "text", label: "Text" },
  { id: "image_text", label: "Image & Text" },
  { id: "comparison", label: "Comparison" },
  { id: "specs", label: "Specs" },
  { id: "logo", label: "Logo" },
];

export default function ModuleSelector({
  selectedModules,
  onChange,
  multiSelect = true,
}: ModuleSelectorProps) {
  const [filter, setFilter] = useState<string>("all");

  const handleToggle = (id: string) => {
    if (multiSelect) {
      if (selectedModules.includes(id)) {
        onChange(selectedModules.filter((m) => m !== id));
      } else {
        if (selectedModules.length >= 5) {
          alert("Amazon allows a maximum of 5 modules per A+ draft.");
          return;
        }
        onChange([...selectedModules, id]);
      }
    } else {
      onChange([id]);
    }
  };

  const filteredModules = MODULE_REGISTRY.filter((mod) => {
    if (filter === "all") return true;
    return mod.category === filter;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Category Filter Tabs */}
      <div className="flex gap-2 pb-1 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors font-medium ${
              filter === cat.id
                ? "bg-primary text-white"
                : "bg-bg-card border border-bg-input text-text-muted hover:text-text-main hover:bg-bg-input"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Selection count */}
      {multiSelect && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {selectedModules.length}/5 modules selected
          </span>
          {selectedModules.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="text-xs text-status-error hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Module Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filteredModules.map((mod) => {
          const isSelected = selectedModules.includes(mod.id);
          return (
            <div
              key={mod.id}
              onClick={() => handleToggle(mod.id)}
              className={`relative flex flex-col items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                  : "border-bg-input bg-bg-card hover:border-primary/40"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              )}
              {mod.aiReady && (
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded text-[10px] font-bold uppercase tracking-wide">
                  AI
                </div>
              )}
              {/* Thumbnail preview */}
              <div className="w-full aspect-[3/1] bg-bg-dark rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-bg-input">
                <img
                  src={mod.thumbnail}
                  alt={mod.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div className="text-xs font-semibold text-text-main text-center leading-tight">
                {mod.shortName}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">{mod.id}</div>
            </div>
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-8 text-text-muted text-sm">
          No modules in this category.
        </div>
      )}
    </div>
  );
}
