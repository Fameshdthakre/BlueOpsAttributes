"use client";

import React from "react";
import Link from "next/link";
import JobStatusBadge from "./JobStatusBadge";
import ExportButton from "./ExportButton";

interface SessionCardProps {
  id: string;
  name: string;
  marketplace?: string;
  status: string;
  createdAt: string;
  itemCount: number;
  type: "aplus" | "image-audit" | "listing-audit";
}

export default function SessionCard({
  id,
  name,
  marketplace,
  status,
  createdAt,
  itemCount,
  type,
}: SessionCardProps) {
  const getLinks = () => {
    switch (type) {
      case "aplus":
        return {
          view: `/history/aplus/${id}`,
        };
      case "image-audit":
        return {
          view: `/history/image-audit/${id}`,
          exportUrl: `/api/image-audit/sessions/${id}/report`,
        };
      case "listing-audit":
        return {
          view: `/history/listing-audit/${id}`,
          exportUrl: `/api/listing-audit/sessions/${id}/report`,
        };
    }
  };

  const links = getLinks();
  const date = new Date(createdAt).toLocaleString();

  return (
    <div className="bg-bg-card rounded-xl border border-bg-input p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/30 transition-colors">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <Link
            href={links.view}
            className="font-semibold text-text-main hover:text-primary transition-colors"
          >
            {name}
          </Link>
          <JobStatusBadge status={status} />
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span
            title="Session ID"
            className="font-mono bg-bg-dark px-1.5 py-0.5 rounded border border-bg-input"
          >
            {id.substring(0, 8)}
          </span>
          <span>{date}</span>
          {marketplace && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
              {marketplace}
            </span>
          )}
          <span>{itemCount} items</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0">
        <Link
          href={links.view}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-bg-dark border border-bg-input hover:bg-bg-input text-text-muted hover:text-text-main transition-colors"
        >
          View Details
        </Link>
        {links.exportUrl && (
          <ExportButton
            endpoint={links.exportUrl}
            filename={`${type}_${id.substring(0, 8)}.csv`}
          />
        )}
      </div>
    </div>
  );
}
