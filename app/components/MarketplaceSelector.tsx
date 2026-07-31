"use client";

import React from "react";

interface MarketplaceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function MarketplaceSelector({
  value,
  onChange,
  disabled = false,
}: MarketplaceSelectorProps) {
  const marketplaces = [
    { domain: "amazon.com", name: "🇺🇸  US (amazon.com)" },
    { domain: "amazon.co.uk", name: "🇬🇧  UK (amazon.co.uk)" },
    { domain: "amazon.ca", name: "🇨🇦  Canada (amazon.ca)" },
    { domain: "amazon.de", name: "🇩🇪  Germany (amazon.de)" },
    { domain: "amazon.fr", name: "🇫🇷  France (amazon.fr)" },
    { domain: "amazon.it", name: "🇮🇹  Italy (amazon.it)" },
    { domain: "amazon.es", name: "🇪🇸  Spain (amazon.es)" },
    { domain: "amazon.co.jp", name: "🇯🇵  Japan (amazon.co.jp)" },
    { domain: "amazon.com.au", name: "🇦🇺  Australia (amazon.com.au)" },
    { domain: "amazon.in", name: "🇮🇳  India (amazon.in)" },
    { domain: "amazon.com.mx", name: "🇲🇽  Mexico (amazon.com.mx)" },
    { domain: "amazon.ae", name: "🇦🇪  UAE (amazon.ae)" },
    { domain: "amazon.sa", name: "🇸🇦  Saudi Arabia (amazon.sa)" },
    { domain: "amazon.nl", name: "🇳🇱  Netherlands (amazon.nl)" },
    { domain: "amazon.se", name: "🇸🇪  Sweden (amazon.se)" },
    { domain: "amazon.pl", name: "🇵🇱  Poland (amazon.pl)" },
    { domain: "amazon.sg", name: "🇸🇬  Singapore (amazon.sg)" },
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2.5 border border-bg-input bg-bg-dark rounded-lg text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 transition-colors"
    >
      {marketplaces.map((mp) => (
        <option key={mp.domain} value={mp.domain}>
          {mp.name}
        </option>
      ))}
    </select>
  );
}
