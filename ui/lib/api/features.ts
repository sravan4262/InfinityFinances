import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type FeatureFlagKey = "chat";

export interface FeatureFlagResponse {
  key: FeatureFlagKey;
  enabled: boolean;
  updated_at: string;
}

// Bypasses the shared apiFetch on purpose: a 204 (long-poll timeout) is the
// normal idle path, and we don't want to surface those as errors in the
// global API error modal.
export async function pollFeatureFlag(
  key: FeatureFlagKey,
  since: string | null,
  signal: AbortSignal
): Promise<FeatureFlagResponse | null> {
  const supabase = createClient();
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
