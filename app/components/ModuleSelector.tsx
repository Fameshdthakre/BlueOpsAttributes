"use client";

import React, { useState } from "react";
import { AplusModule, MODULE_REGISTRY } from "@/app/lib/aplus-types";

interface ModuleSelectorProps {
  selectedModules: string[];
  onChange: (moduleIds: string[]) => void;
  multiSelect?: boolean;
}

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
      {/* Filters */}
      <div className="flex gap-2 pb-2 overflow-x-auto">
        {["all", "text", "image_text", "comparison", "specs", "logo"].map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
                filter === cat
                  ? "bg-[var(--blue-500)] text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]"
              }`}
            >
              {cat === "all"
                ? "All Modules"
                : cat === "image_text"
                ? "Image & Text"
                : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          )
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredModules.map((mod) => {
          const isSelected = selectedModules.includes(mod.id);
          return (
            <div
              key={mod.id}
              onClick={() => handleToggle(mod.id)}
              className={`relative flex flex-col items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected
                  ? "border-[var(--blue-500)] bg-[var(--blue-500)]/5"
                  : "border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--blue-500)] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              )}
              {mod.aiReady && (
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded text-[10px] font-bold uppercase tracking-wide">
                  AI Ready
                </div>
              )}
              <div className="w-full aspect-[3/1] bg-[var(--bg-primary)] rounded mb-3 flex items-center justify-center overflow-hidden">
                <img
                  src={mod.thumbnail}
                  alt={mod.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlN2U3ZTciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=";
                  }}
                />
              </div>
              <div className="text-sm font-semibold text-center leading-tight">
                {mod.shortName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
