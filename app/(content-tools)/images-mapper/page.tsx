"use client";

import React, { useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/components/PageHeader";
import ImageMapper from "@/app/(audit-tools)/image-auditor/_components/ImageMapper";

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
    <div className="animate-in fade-in flex flex-col h-full">
      <PageHeader
        title="Images Mapper"
        subtitle="Visually map scraped product images to Amazon standard slots."
        breadcrumbs={[{ label: "BlueOps Hub", href: "/dashboard" }, { label: "Images Mapper" }]}
      >
        <div className="flex items-center gap-2 text-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-sm font-bold">Mapping Tool</span>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="bg-bg-card p-6 rounded-xl border border-bg-input flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-text-main">Load ASIN Data</h2>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter ASIN..."
                value={asin}
                onChange={(e) => setAsin(e.target.value)}
                className="flex-1 max-w-sm px-4 py-3 border border-bg-input bg-bg-dark rounded-lg text-text-main focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={() => {
                  if (!asin) alert("Enter ASIN first");
                  else setShowDemo(true);
                }}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold transition-colors"
              >
                Load Images
              </button>
            </div>
          </div>

          {showDemo && (
            <div className="bg-bg-card p-6 rounded-xl border border-bg-input">
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
