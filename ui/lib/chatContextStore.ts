"use client";
import { create } from "zustand";
import type { ChatArea } from "@/lib/api/chat";

// Pages publish their current context here so the single ChatLauncher mounted
// in the root layout can pick it up. Without this, each calculator page would
// need to mount its own chat button to wire context, which is exactly the
// pattern the chat implementation guide asked us to move away from.
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
