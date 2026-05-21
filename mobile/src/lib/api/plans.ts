import { apiFetch, getAccessToken } from "./client";
import type { FireInputs } from "@/lib/engine/types";

function normalizePlanName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export interface SavedPlan {
  id: string;
  userId: string;
  name: string;
  inputs: FireInputs;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export const plansApi = {
  isAuthenticated: async () => Boolean(await getAccessToken()),

  list: () => apiFetch<SavedPlan[]>("/plans"),

  get: (id: string) => apiFetch<SavedPlan>(`/plans/${id}`),

  create: (name: string, inputs: FireInputs) =>
    apiFetch<SavedPlan>("/plans", {
      method: "POST",
      body: JSON.stringify({ name: normalizePlanName(name), inputs }),
    }),

  update: (id: string, patch: Partial<Pick<SavedPlan, "name" | "inputs" | "isPublic">>) =>
    apiFetch<SavedPlan>(`/plans/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...patch,
        ...(patch.name !== undefined ? { name: normalizePlanName(patch.name) } : {}),
      }),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/plans/${id}`, { method: "DELETE" }),
};
