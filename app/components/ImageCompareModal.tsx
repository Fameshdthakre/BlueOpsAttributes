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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-card rounded-2xl shadow-2xl border border-bg-input w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bg-input">
          <h2 className="text-xl font-bold text-text-main">Image Comparison</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-main hover:bg-bg-input w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 grid grid-cols-2 gap-8">
          {/* Base product column */}
          <div>
            <h3 className="text-base font-semibold mb-4 text-center text-text-main">
              Base Product
              <span className="ml-2 text-xs font-mono text-primary">{baseAsin}</span>
            </h3>
            <div className="flex flex-col gap-4">
              {baseImages.map((img, i) => (
                <div
                  key={i}
                  className="border border-bg-input rounded-xl p-2 bg-bg-dark relative overflow-hidden"
                >
                  <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-xs font-bold">
                    {i + 1}
                  </div>
                  <img
                    src={img}
                    alt={`Base image ${i + 1}`}
                    className="w-full h-auto object-contain"
                  />
                </div>
              ))}
              {baseImages.length === 0 && (
                <div className="text-center p-8 text-text-muted border-2 border-dashed border-bg-input rounded-xl">
                  No images found
                </div>
              )}
            </div>
          </div>

          {/* Competitor column */}
          <div>
            <h3 className="text-base font-semibold mb-4 text-center text-text-main">
              Competitor
              <span className="ml-2 text-xs font-mono text-accent">{compareAsin}</span>
            </h3>
            <div className="flex flex-col gap-4">
              {compareImages.map((img, i) => (
                <div
                  key={i}
                  className="border border-bg-input rounded-xl p-2 bg-bg-dark relative overflow-hidden"
                >
                  <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-xs font-bold">
                    {i + 1}
                  </div>
                  <img
                    src={img}
                    alt={`Compare image ${i + 1}`}
                    className="w-full h-auto object-contain"
                  />
                </div>
              ))}
              {compareImages.length === 0 && (
                <div className="text-center p-8 text-text-muted border-2 border-dashed border-bg-input rounded-xl">
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
