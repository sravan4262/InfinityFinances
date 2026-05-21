"use client";

import { create } from "zustand";

export type ApiErrorPayload = {
  status: number;
  code: string;
  message: string;
};

type ApiErrorState = {
  error: ApiErrorPayload | null;
  show: (error: ApiErrorPayload) => void;
  clear: () => void;
};

export const useApiErrorStore = create<ApiErrorState>((set) => ({
  error: null,
  show: (error) => set({ error }),
  clear: () => set({ error: null }),
}));
