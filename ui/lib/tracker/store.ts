"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SavingsCategory, MonthlyEntry } from "./types";

export const DEFAULT_CATEGORIES: SavingsCategory[] = [
  { id: "stocks",   label: "Stocks / Equity",  color: "oklch(0.68 0.15 195)" },
  { id: "sip",      label: "SIP / Mutual Funds",color: "oklch(0.70 0.18 200)" },
  { id: "401k",     label: "401k / EPF",        color: "oklch(0.65 0.20 150)" },
  { id: "ira",      label: "IRA / PPF",         color: "oklch(0.68 0.16 130)" },
  { id: "hsa",      label: "HSA",               color: "oklch(0.72 0.15 165)" },
  { id: "lic",      label: "LIC / Insurance",   color: "oklch(0.60 0.14 205)" },
  { id: "gold",     label: "Gold",              color: "oklch(0.76 0.155 75)" },
  { id: "fds",      label: "FDs / Bonds",       color: "oklch(0.64 0.13 50)" },
  { id: "savings",  label: "Savings / HYSA",    color: "oklch(0.70 0.12 230)" },
  { id: "chits",    label: "Chits / Others",    color: "oklch(0.58 0.10 215)" },
];

interface TrackerStore {
  categories: SavingsCategory[];
  entries: MonthlyEntry[];

  upsertEntry: (entry: MonthlyEntry) => void;
  addCategory: (cat: SavingsCategory) => void;
  removeCategory: (id: string) => void;
  getEntry: (month: string, categoryId: string) => MonthlyEntry | undefined;
  getMonthEntries: (month: string) => MonthlyEntry[];
  setCategories: (cats: SavingsCategory[]) => void;
  setEntries: (entries: MonthlyEntry[]) => void;
  reset: () => void;
}

export const useTrackerStore = create<TrackerStore>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      entries: [],

      upsertEntry: (entry) => {
        set((s) => {
          const idx = s.entries.findIndex(
            (e) => e.month === entry.month && e.categoryId === entry.categoryId
          );
          if (idx >= 0) {
            const next = [...s.entries];
            next[idx] = entry;
            return { entries: next };
          }
          return { entries: [...s.entries, entry] };
        });
      },

      addCategory: (cat) => {
        set((s) => ({ categories: [...s.categories, cat] }));
      },

      removeCategory: (id) => {
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          entries: s.entries.filter((e) => e.categoryId !== id),
        }));
      },

      getEntry: (month, categoryId) =>
        get().entries.find((e) => e.month === month && e.categoryId === categoryId),

      getMonthEntries: (month) =>
        get().entries.filter((e) => e.month === month),

      setCategories: (cats) => set({ categories: cats }),
      setEntries: (entries) => set({ entries }),
      reset: () => set({ categories: DEFAULT_CATEGORIES, entries: [] }),
    }),
    { name: "fire-tracker" }
  )
);
