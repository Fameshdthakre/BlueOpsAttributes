"use client";

import React, { useState } from "react";

interface ImageMapperProps {
  asin: string;
  images: string[];
  onSave?: (mappedData: any) => void;
}

export default function ImageMapper({ asin, images, onSave }: ImageMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const slots = [
    { id: "main", label: "Main Image" },
    { id: "pt01", label: "PT01 (Angle 1)" },
    { id: "pt02", label: "PT02 (Angle 2)" },
    { id: "pt03", label: "PT03 (Lifestyle)" },
    { id: "pt04", label: "PT04 (Features)" },
    { id: "pt05", label: "PT05 (Scale/Size)" },
    { id: "pt06", label: "PT06 (Packaging)" },
  ];

  const handleDragStart = (e: React.DragEvent, imgUrl: string) => {
    e.dataTransfer.setData("text/plain", imgUrl);
  };

  const handleDrop = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    const imgUrl = e.dataTransfer.getData("text/plain");
    if (imgUrl) {
      setMapping((prev) => ({ ...prev, [slotId]: imgUrl }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeMapping = (slotId: string) => {
    setMapping((prev) => {
      const newMap = { ...prev };
      delete newMap[slotId];
      return newMap;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white dark:bg-[#1a1d21] p-4 rounded-lg border border-[var(--border-color)]">
        <h3 className="font-semibold mb-3">Extracted Images for {asin}</h3>
        <div className="flex flex-wrap gap-2">
          {images.map((img, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={(e) => handleDragStart(e, img)}
              className="w-24 h-24 border border-[var(--border-color)] rounded-md p-1 cursor-grab active:cursor-grabbing bg-[var(--bg-secondary)] hover:border-[var(--blue-500)]"
            >
              <img src={img} alt={`Img ${idx}`} className="w-full h-full object-contain pointer-events-none" />
            </div>
          ))}
          {images.length === 0 && (
            <div className="text-sm text-[var(--text-secondary)] italic">
              No images available.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {slots.map((slot) => (
          <div
            key={slot.id}
            onDrop={(e) => handleDrop(e, slot.id)}
            onDragOver={handleDragOver}
            className={`flex flex-col border-2 border-dashed rounded-lg p-2 h-40 transition-colors ${
              mapping[slot.id]
                ? "border-[var(--blue-500)] bg-[var(--blue-500)]/5"
                : "border-[var(--border-color)] bg-[var(--bg-secondary)]"
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {slot.label}
              </span>
              {mapping[slot.id] && (
                <button
                  onClick={() => removeMapping(slot.id)}
                  className="text-red-500 hover:text-red-700 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
              {mapping[slot.id] ? (
                <img
                  src={mapping[slot.id]}
                  alt={slot.label}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-[var(--text-muted)] text-sm">
                  Drag image here
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {onSave && (
        <div className="flex justify-end mt-4">
          <button
            onClick={() => onSave(mapping)}
            className="px-4 py-2 bg-[var(--blue-600)] text-white font-medium rounded-md hover:bg-[var(--blue-700)] transition-colors"
          >
            Save Mapping
          </button>
        </div>
      )}
    </div>
  );
}
