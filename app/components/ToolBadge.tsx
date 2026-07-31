import React from "react";

export type ToolType = "attr_master" | "aplus" | "image_audit" | "listing_scrape";

interface ToolBadgeProps {
  tool: ToolType;
}

export default function ToolBadge({ tool }: ToolBadgeProps) {
  const config = {
    attr_master: {
      label: "Attribute Master",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    aplus: {
      label: "A+ Publisher",
      color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    },
    image_audit: {
      label: "Image Auditor",
      color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    },
    listing_scrape: {
      label: "Listing Scraper",
      color: "bg-green-500/10 text-green-400 border-green-500/20",
    },
  };

  const { label, color } = config[tool] || { label: tool, color: "bg-gray-500/10 text-gray-400 border-gray-500/20" };

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${color}`}>
      {label}
    </span>
  );
}
