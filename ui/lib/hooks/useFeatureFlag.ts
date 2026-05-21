"use client";
import { useEffect, useRef, useState } from "react";
import { pollFeatureFlag, type FeatureFlagKey } from "@/lib/api/features";
import { useUser } from "@/lib/hooks/useUser";

interface FeatureFlagState {
  enabled: boolean;
  loading: boolean;
}

// Long-poll a server-driven feature flag. Fail-closed: while loading or on
// error, `enabled` is false so callers can hide the gated surface.
//
// Contract:
//   - On mount: GET /features/poll?key=<key> with no `since`.
//     `loading: true`, `enabled: false` until the first response lands.
//   - On 200: update state, reconnect immediately with the new `updated_at`
//     as `since`.
//   - On 204: reconnect immediately with the same `since`.
//   - On error: exponential back-off 5s → 60s. Keep last known `enabled` so
//     a network blip doesn't flap the UI.
//   - On sign-out or unmount: abort the in-flight request.
export function useFeatureFlag(key: FeatureFlagKey): FeatureFlagState {
  const { user, loading: userLoading } = useUser();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const sinceRef = useRef<string | null>(null);
  const backoffRef = useRef(5_000);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setEnabled(false);
      setLoading(false);
      sinceRef.current = null;
      backoffRef.current = 5_000;
      return;
    }

    let cancelled = false;
    let controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const loop = async () => {
      while (!cancelled) {
        controller = new AbortController();
        try {
          const res = await pollFeatureFlag(key, sinceRef.current, controller.signal);
          if (cancelled) return;
          if (res) {
            sinceRef.current = res.updated_at;
            setEnabled(res.enabled);
            setLoading(false);
          }
          backoffRef.current = 5_000; // reset on any success (200 or 204)
        } catch (err) {
          if (cancelled) return;
          // Aborted means we deliberately tore the loop down.
          if (err instanceof DOMException && err.name === "AbortError") return;
          // Network or auth error — keep last known `enabled`, back off and retry.
          setLoading(false);
          const wait = backoffRef.current;
          backoffRef.current = Math.min(backoffRef.current * 2, 60_000);
          await new Promise<void>((resolve) => {
            retryTimer = setTimeout(resolve, wait);
          });
          if (cancelled) return;
        }
      }
    };

    void loop();

    return () => {
      cancelled = true;
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user?.id, userLoading]);

  return { enabled, loading };
}
