import { supabase } from "@/lib/supabase/client";
import { useApiErrorStore } from "./errorStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export async function getAccessToken() {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  return data.session?.access_token ?? null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    const error = {
      status: 0,
      code: "NETWORK_ERROR",
      message: "Could not reach the server. Check your connection and try again.",
    };
    useApiErrorStore.getState().show(error);
    throw new Error(error.message);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string } | string;
    };
    const code = typeof body.error === "object" && body.error?.code ? body.error.code : `HTTP_${res.status}`;
    const message =
      typeof body.error === "object" && body.error?.message
        ? body.error.message
        : typeof body.error === "string"
          ? body.error
          : `Request failed with status ${res.status}.`;
    useApiErrorStore.getState().show({ status: res.status, code, message });
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
