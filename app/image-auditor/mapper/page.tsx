"use client";

import React, { useState } from "react";
import Link from "next/link";
import ImageMapper from "@/app/components/ImageMapper";

export default function StandaloneMapperPage() {
  const [asin, setAsin] = useState("");
  const [images, setImages] = useState<string[]>([
    "https://m.media-amazon.com/images/I/71z78p8vOUL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71Y8KIf69gL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71mF+U7HWeL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81hH052N0wL._AC_SL1500_.jpg",
  ]);
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Standalone Image Mapper
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Visually map scraped product images to Amazon standard slots.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/image-auditor"
            className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="bg-white dark:bg-[#1a1d21] p-6 rounded-lg border border-[var(--border-color)] flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Load ASIN Data</h2>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter ASIN..."
                value={asin}
                onChange={(e) => setAsin(e.target.value)}
                className="flex-1 max-w-sm px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--blue-500)]"
              />
              <button
                onClick={() => {
                  if (!asin) alert("Enter ASIN first");
                  else setShowDemo(true);
                }}
                className="px-4 py-2 bg-[var(--blue-600)] text-white rounded-md font-medium hover:bg-[var(--blue-700)] transition-colors"
              >
                Load Images
              </button>
            </div>
          </div>

          {showDemo && (
            <div className="bg-white dark:bg-[#1a1d21] p-6 rounded-lg border border-[var(--border-color)]">
              <ImageMapper
                asin={asin}
                images={images}
                onSave={(mapped) => alert(`Saved mapping: ${JSON.stringify(mapped, null, 2)}`)}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
