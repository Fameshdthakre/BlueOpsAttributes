"use client";

import React from "react";

interface ImageCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseImages: string[];
  compareImages: string[];
  baseAsin: string;
  compareAsin: string;
}

export default function ImageCompareModal({
  isOpen,
  onClose,
  baseImages,
  compareImages,
  baseAsin,
  compareAsin,
}: ImageCompareModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl border border-[var(--border-color)] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-bold">Image Comparison</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-center">
              Base Product ({baseAsin})
            </h3>
            <div className="flex flex-col gap-4">
              {baseImages.map((img, i) => (
                <div key={i} className="border border-[var(--border-color)] rounded-md p-2 bg-[var(--bg-secondary)] relative">
                  <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    {i + 1}
                  </div>
                  <img src={img} alt={`Base image ${i + 1}`} className="w-full h-auto object-contain" />
                </div>
              ))}
              {baseImages.length === 0 && (
                <div className="text-center p-8 text-[var(--text-secondary)] border-2 border-dashed border-[var(--border-color)] rounded-md">
                  No images found
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-center">
              Competitor ({compareAsin})
            </h3>
            <div className="flex flex-col gap-4">
              {compareImages.map((img, i) => (
                <div key={i} className="border border-[var(--border-color)] rounded-md p-2 bg-[var(--bg-secondary)] relative">
                  <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    {i + 1}
                  </div>
                  <img src={img} alt={`Compare image ${i + 1}`} className="w-full h-auto object-contain" />
                </div>
              ))}
              {compareImages.length === 0 && (
                <div className="text-center p-8 text-[var(--text-secondary)] border-2 border-dashed border-[var(--border-color)] rounded-md">
                  No images found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
