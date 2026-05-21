import { supabase } from "@/lib/supabase/client";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type FeatureFlagKey = "chat";

export interface FeatureFlagResponse {
  key: FeatureFlagKey;
  enabled: boolean;
  updated_at: string;
}

// Mirrors ui/lib/api/features.ts. Returns null on a 204 (long-poll timeout).
export async function pollFeatureFlag(
  key: FeatureFlagKey,
  since: string | null,
  signal: AbortSignal
): Promise<FeatureFlagResponse | null> {
  if (!supabase) throw new Error("not authenticated");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not authenticated");

  const url = new URL(`${API_URL}/features/poll`);
  url.searchParams.set("key", key);
  if (since) url.searchParams.set("since", since);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`feature flag poll failed: ${res.status}`);
  return (await res.json()) as FeatureFlagResponse;
}
