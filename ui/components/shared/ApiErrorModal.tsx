"use client";

import { AlertTriangle, X } from "lucide-react";
import { useApiErrorStore } from "@/lib/api/errorStore";

const titleByCode: Record<string, string> = {
  BAD_REQUEST: "Request error",
  UNAUTHORIZED: "Session expired",
  FORBIDDEN: "Access denied",
  NOT_FOUND: "Not found",
  RATE_LIMITED: "Slow down",
  CONFLICT: "Conflict",
  SERVICE_UNAVAILABLE: "Service unavailable",
  INTERNAL_ERROR: "Something went wrong",
  NETWORK_ERROR: "Connection problem",
};

export function ApiErrorModal() {
  const { error, clear } = useApiErrorStore();
  if (!error) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="mt-0.5 rounded-full bg-destructive/15 p-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold">{titleByCode[error.code] ?? "Request failed"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">Error {error.status} · {error.code}</p>
            </div>
          </div>
          <button type="button" onClick={clear} className="text-muted-foreground hover:text-foreground" aria-label="Close error dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <button type="button" onClick={clear} className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
          OK
        </button>
      </div>
    </div>
  );
}
