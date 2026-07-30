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
    { domain: "amazon.com", name: "US (.com)" },
    { domain: "amazon.co.uk", name: "UK (.co.uk)" },
    { domain: "amazon.ca", name: "Canada (.ca)" },
    { domain: "amazon.de", name: "Germany (.de)" },
    { domain: "amazon.fr", name: "France (.fr)" },
    { domain: "amazon.it", name: "Italy (.it)" },
    { domain: "amazon.es", name: "Spain (.es)" },
    { domain: "amazon.co.jp", name: "Japan (.co.jp)" },
    { domain: "amazon.com.au", name: "Australia (.com.au)" },
    { domain: "amazon.in", name: "India (.in)" },
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--blue-500)] disabled:opacity-50"
    >
      {marketplaces.map((mp) => (
        <option key={mp.domain} value={mp.domain}>
          {mp.name}
        </option>
      ))}
    </select>
  );
}
