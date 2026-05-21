import { apiFetch } from "./client";
import { supabase } from "@/lib/supabase/client";
import { useApiErrorStore } from "./errorStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type ChatArea = "retirement" | "home" | "budget";

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  extracted_inputs: Record<string, unknown> | null;
  created_at: string;
}

export interface ChatHistory {
  sessionId: string | null;
  messages: ChatMessage[];
}

// One-shot intent signal from the server — tells the client whether the
// user just asked to compute ("calculate"), provided/changed data
// ("update"), or did neither ("none"). Not persisted to chat.messages.
export type ChatAction = "calculate" | "update" | "none";

export interface ChatReply {
  reply: string;
  extracted: Record<string, unknown>;
  action: ChatAction;
}

export class ChatRateLimitedError extends Error {
  readonly retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "ChatRateLimitedError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function sendMessage(
  area: ChatArea,
  message: string,
  context?: unknown
): Promise<ChatReply> {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = data.session?.access_token;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/chat/${area}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, context }),
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

  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      retryAfterSeconds?: number;
    };
    const retryAfterSeconds = Math.max(1, Math.floor(body.retryAfterSeconds ?? 30));
    throw new ChatRateLimitedError(
      body.error?.message ?? "Too many messages — please slow down.",
      retryAfterSeconds
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string } | string;
    };
    const code =
      typeof body.error === "object" && body.error?.code ? body.error.code : `HTTP_${res.status}`;
    const message =
      typeof body.error === "object" && body.error?.message
        ? body.error.message
        : typeof body.error === "string"
          ? body.error
          : `Request failed with status ${res.status}.`;
    if (res.status !== 503) {
      useApiErrorStore.getState().show({ status: res.status, code, message });
    }
    throw new Error(message);
  }

  return (await res.json()) as ChatReply;
}

export const chatApi = {
  history: (area: ChatArea) => apiFetch<ChatHistory>(`/chat/${area}`),
  send: sendMessage,
  clear: (area: ChatArea) =>
    apiFetch<{ success: boolean }>(`/chat/${area}`, { method: "DELETE" }),
};
