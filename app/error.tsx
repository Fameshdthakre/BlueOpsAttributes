"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-lg shadow-sm text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-red-600">Something went wrong!</h2>
        <p className="text-[var(--text-secondary)] mb-6 text-sm">
          An unexpected error occurred. You can try recovering by clicking the button below, or return to the dashboard.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[var(--blue-600)] text-white rounded-md font-medium hover:bg-[var(--blue-700)] transition-colors"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-md font-medium hover:bg-[var(--border-color)] transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 p-4 bg-red-100 text-red-900 rounded text-xs text-left overflow-auto max-h-40 font-mono">
            {error.message}
          </div>
        )}
      </div>
    </div>
  );
}
