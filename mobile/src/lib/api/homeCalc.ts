import { apiFetch } from "./client";
import type { BreakEvenInputs, MortgageInputs, AffordabilityInputs } from "@/features/home-calc/types";

export interface HomeCalcProfile {
  id: string;
  user_id: string;
  name: string;
  break_even: BreakEvenInputs | null;
  mortgage: MortgageInputs | null;
  affordability: AffordabilityInputs | null;
  created_at: string;
  updated_at: string;
}

export const homeCalcApi = {
  list: () => apiFetch<HomeCalcProfile[]>("/home-calc"),

  get: (id: string) => apiFetch<HomeCalcProfile>(`/home-calc/${id}`),

  create: (name: string, inputs: Omit<HomeCalcProfile, "id" | "user_id" | "name" | "created_at" | "updated_at">) =>
    apiFetch<HomeCalcProfile>("/home-calc", {
      method: "POST",
      body: JSON.stringify({ name, ...inputs }),
    }),

  update: (
    id: string,
    patch: Partial<{
      name: string;
      breakEven: BreakEvenInputs;
      mortgage: MortgageInputs;
      affordability: AffordabilityInputs;
    }>
  ) =>
    apiFetch<HomeCalcProfile>(`/home-calc/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/home-calc/${id}`, { method: "DELETE" }),
};
