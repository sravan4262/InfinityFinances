import { apiFetch } from "./client";

export interface DbTrackerCategory {
  id: string;
  user_id: string;
  label: string;
  color: string;
  sort_order: number;
}

export interface DbTrackerEntry {
  id: string;
  user_id: string;
  month: string;
  category_id: string;
  planned: string | null;
  actual: string | null;
}

export const trackerApi = {
  getCategories: () => apiFetch<DbTrackerCategory[]>("/tracker/categories"),

  createCategory: (label: string, color: string) =>
    apiFetch<DbTrackerCategory>("/tracker/categories", {
      method: "POST",
      body: JSON.stringify({ label, color }),
    }),

  deleteCategory: (id: string) =>
    apiFetch<{ success: boolean }>(`/tracker/categories/${id}`, { method: "DELETE" }),

  getEntries: (month?: string) =>
    apiFetch<DbTrackerEntry[]>(month ? `/tracker/entries?month=${month}` : "/tracker/entries"),

  upsertEntries: (
    entries: { month: string; categoryId: string; planned?: number; actual?: number }[]
  ) =>
    apiFetch<DbTrackerEntry[]>("/tracker/entries", {
      method: "PUT",
      body: JSON.stringify(entries),
    }),
};
