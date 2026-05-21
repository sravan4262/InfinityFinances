import { useEffect, useRef, useState } from "react";
import { pollFeatureFlag, type FeatureFlagKey } from "@/lib/api/features";
import { useUser } from "@/features/auth/useUser";

interface FeatureFlagState {
  enabled: boolean;
  loading: boolean;
}

// Long-poll a server-driven feature flag (mobile twin of the web hook).
// Fail-closed: while loading or on error, `enabled` is false.
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
          backoffRef.current = 5_000;
        } catch (err) {
          if (cancelled) return;
          if (err instanceof Error && err.name === "AbortError") return;
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
  }, [key, user?.id, userLoading]);

  return { enabled, loading };
}
