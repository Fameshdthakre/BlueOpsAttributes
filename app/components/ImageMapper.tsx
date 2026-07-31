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
      {/* Source Images Strip */}
      <div className="bg-bg-card p-4 rounded-xl border border-bg-input">
        <h3 className="font-semibold mb-3 text-text-main">
          Extracted Images for <span className="text-primary font-mono">{asin}</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {images.map((img, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={(e) => handleDragStart(e, img)}
              className="w-24 h-24 border border-bg-input rounded-lg p-1 cursor-grab active:cursor-grabbing bg-bg-dark hover:border-primary/50 transition-colors"
            >
              <img src={img} alt={`Img ${idx}`} className="w-full h-full object-contain pointer-events-none" />
            </div>
          ))}
          {images.length === 0 && (
            <div className="text-sm text-text-muted italic py-4">
              No images available.
            </div>
          )}
        </div>
      </div>

      {/* Drop Zone Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {slots.map((slot) => (
          <div
            key={slot.id}
            onDrop={(e) => handleDrop(e, slot.id)}
            onDragOver={handleDragOver}
            className={`flex flex-col border-2 border-dashed rounded-xl p-2 h-40 transition-colors ${
              mapping[slot.id]
                ? "border-primary bg-primary/5"
                : "border-bg-input bg-bg-card hover:border-primary/40"
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-text-muted">
                {slot.label}
              </span>
              {mapping[slot.id] && (
                <button
                  onClick={() => removeMapping(slot.id)}
                  className="text-status-error hover:text-red-400 text-xs font-bold transition-colors"
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
                <span className="text-text-muted text-xs text-center">
                  Drag image here
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {onSave && (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => onSave(mapping)}
            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors"
          >
            Save Mapping
          </button>
        </div>
      )}
    </div>
  );
}
