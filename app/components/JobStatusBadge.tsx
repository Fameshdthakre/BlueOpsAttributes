import React from "react";

interface JobStatusBadgeProps {
  status: string;
}

export default function JobStatusBadge({ status }: JobStatusBadgeProps) {
  let classes = "text-text-muted bg-bg-input border-bg-input";
  let label = status;

  switch (status.toLowerCase()) {
    case "pending":
      classes = "text-status-warning bg-status-warning/10 border-status-warning/20";
      label = "Pending";
      break;
    case "processing":
      classes = "text-blue-400 bg-blue-500/10 border-blue-500/20";
      label = "Processing";
      break;
    case "completed":
      classes = "text-status-success bg-status-success/10 border-status-success/20";
      label = "Completed";
      break;
    case "failed":
      classes = "text-status-error bg-status-error/10 border-status-error/20";
      label = "Failed";
      break;
    case "partially_completed":
      classes = "text-orange-400 bg-orange-500/10 border-orange-500/20";
      label = "Partial";
      break;
    case "running":
      classes = "text-blue-400 bg-blue-500/10 border-blue-500/20";
      label = "Running";
      break;
    case "paused":
      classes = "text-status-warning bg-status-warning/10 border-status-warning/20";
      label = "Paused";
      break;
  }

  return (
    <span
      className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${classes} whitespace-nowrap`}
    >
      {label}
    </span>
  );
}
