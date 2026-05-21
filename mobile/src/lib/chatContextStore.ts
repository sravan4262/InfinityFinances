import { create } from "zustand";
import type { ChatArea } from "@/lib/api/chat";

// Mobile mirror of ui/lib/chatContextStore.ts. Screens publish their current
// state here so the single ChatLauncher in the root navigator can pick it
// up without re-mounting per-screen chat buttons.
interface ChatContextState {
  retirement: Record<string, unknown> | null;
  home: Record<string, unknown> | null;
  budget: Record<string, unknown> | null;

  setContext: (area: ChatArea, context: Record<string, unknown> | null) => void;
  clearContext: (area: ChatArea) => void;
  clearAll: () => void;
}

export const useChatContextStore = create<ChatContextState>((set) => ({
  retirement: null,
  home: null,
  budget: null,
  setContext: (area, context) => set({ [area]: context } as Partial<ChatContextState>),
  clearContext: (area) => set({ [area]: null } as Partial<ChatContextState>),
  clearAll: () => set({ retirement: null, home: null, budget: null }),
}));
