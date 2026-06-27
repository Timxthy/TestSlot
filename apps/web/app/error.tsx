"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/lib/analytics/client";

/**
 * App-wide error boundary. Catches render/runtime errors in any route segment,
 * shows a calm recovery screen instead of a blank crash, and reports the error
 * to analytics (best-effort, message-only) so the error rate is observable.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="card max-w-md p-8 text-center">
        <h1 className="text-2xl text-ink">Something went wrong</h1>
        <p className="mt-3 text-sm text-slate-600">
          Sorry — that didn’t load. You can try again, or head back to your
          dashboard. Your data is safe and nothing was lost.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-secondary">
            Back to home
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-4 text-xs text-slate-400">Reference: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
