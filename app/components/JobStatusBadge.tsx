import React from "react";

interface JobStatusBadgeProps {
  status: string;
}

export default function JobStatusBadge({ status }: JobStatusBadgeProps) {
  let color = "bg-gray-100 text-gray-800 border-gray-200";
  let label = status.toUpperCase();

  switch (status.toLowerCase()) {
    case "pending":
      color = "bg-yellow-100 text-yellow-800 border-yellow-200";
      break;
    case "processing":
      color = "bg-blue-100 text-blue-800 border-blue-200";
      break;
    case "completed":
      color = "bg-green-100 text-green-800 border-green-200";
      break;
    case "failed":
      color = "bg-red-100 text-red-800 border-red-200";
      break;
    case "partially_completed":
      color = "bg-orange-100 text-orange-800 border-orange-200";
      label = "PARTIAL";
      break;
  }

  return (
    <span
      className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${color} whitespace-nowrap`}
    >
      {label}
    </span>
  );
}
