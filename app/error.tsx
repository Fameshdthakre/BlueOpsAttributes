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
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-dark text-text-main px-4">
      <div className="bg-bg-card border border-bg-input p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-status-error/10 border border-status-error/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold mb-2 text-text-main">Something went wrong</h2>
        <p className="text-text-muted mb-8 text-sm leading-relaxed">
          An unexpected error occurred. You can try recovering below, or return to the dashboard.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-colors"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 border border-bg-input text-text-muted hover:bg-bg-input hover:text-text-main rounded-xl font-medium transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 p-4 bg-bg-dark border border-status-error/20 rounded-lg text-status-error/80 text-xs text-left overflow-auto max-h-40 font-mono">
            {error.message}
            {error.digest && <div className="mt-1 text-text-muted">Digest: {error.digest}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
