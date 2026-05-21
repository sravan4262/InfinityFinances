"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  MoneyAccount,
  MoneyCategory,
  Transaction,
  RecurrenceRule,
  CategoryBudget,
} from "./types";
import { pendingOccurrences, todayYmd } from "./recurrence";
import { moneyApi } from "@/lib/api/money";

const PALETTE = [
  "oklch(0.65 0.22 25)",
  "oklch(0.72 0.18 50)",
  "oklch(0.80 0.16 95)",
  "oklch(0.72 0.18 145)",
  "oklch(0.70 0.15 195)",
  "oklch(0.68 0.15 195)",
  "oklch(0.72 0.15 235)",
  "oklch(0.66 0.12 30)",
  "oklch(0.68 0.05 265)",
];

const DEFAULT_ACCOUNTS: MoneyAccount[] = [
  { id: "acct-cash", name: "Cash", type: "cash", sortOrder: 0 },
  { id: "acct-card", name: "Card", type: "card", sortOrder: 1 },
];

const DEFAULT_CATEGORIES: MoneyCategory[] = [
  { id: "cat-salary", label: "Salary", color: PALETTE[3], kind: "income", sortOrder: 0 },
  { id: "cat-bonus", label: "Bonus", color: PALETTE[4], kind: "income", sortOrder: 1 },
  { id: "cat-other-income", label: "Other Income", color: PALETTE[8], kind: "income", sortOrder: 2 },

  { id: "cat-utilities", label: "Utilities", color: PALETTE[0], kind: "expense", sortOrder: 0 },
  { id: "cat-travel", label: "Travel", color: PALETTE[1], kind: "expense", sortOrder: 1 },
  { id: "cat-auto", label: "Auto", color: PALETTE[2], kind: "expense", sortOrder: 2 },
  { id: "cat-dining", label: "Dining", color: PALETTE[6], kind: "expense", sortOrder: 3 },
  { id: "cat-coffee", label: "Coffee", color: PALETTE[7], kind: "expense", sortOrder: 4 },
  { id: "cat-subscriptions", label: "Subscriptions", color: PALETTE[5], kind: "expense", sortOrder: 5 },
  { id: "cat-shopping", label: "Shopping", color: PALETTE[4], kind: "expense", sortOrder: 6 },
  { id: "cat-other-expense", label: "Other", color: PALETTE[8], kind: "expense", sortOrder: 7 },
];

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const isLocalId = (id: string) => id.includes("-") && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(id);

interface MoneyStore {
  // ── Server sync state ─────────────────────────────────────────────────────
  syncUserId: string | null;
  syncing: boolean;

  // ── Domain ────────────────────────────────────────────────────────────────
  accounts: MoneyAccount[];
  categories: MoneyCategory[];
  transactions: Transaction[];
  recurrenceRules: RecurrenceRule[];
  budgets: CategoryBudget[];

  // ── Mutations ─────────────────────────────────────────────────────────────
  addTransaction: (tx: Omit<Transaction, "id">) => Transaction;
  updateTransaction: (id: string, partial: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  addRecurrenceRule: (rule: Omit<RecurrenceRule, "id">) => RecurrenceRule;
  updateRecurrenceRule: (id: string, partial: Partial<RecurrenceRule>) => void;
  deleteRecurrenceRule: (id: string, alsoDeleteGenerated?: boolean) => void;

  addCategory: (cat: Omit<MoneyCategory, "id" | "sortOrder">) => MoneyCategory;
  removeCategory: (id: string) => void;

  addAccount: (acct: Omit<MoneyAccount, "id" | "sortOrder">) => MoneyAccount;
  removeAccount: (id: string) => void;

  setBudget: (month: string, categoryId: string, amount: number) => void;
  getBudget: (month: string, categoryId: string) => number;

  materializeRecurring: (asOfYmd?: string) => void;

  // ── Sync lifecycle ────────────────────────────────────────────────────────
  initSync: (userId: string) => Promise<void>;
  disconnectSync: () => void;
  resetAll: () => void;
}

// Replace an entity's id everywhere it's referenced (transactions point to categories/accounts).
function rewireId<T extends { id: string }>(items: T[], oldId: string, newId: string): T[] {
  return items.map((i) => (i.id === oldId ? { ...i, id: newId } : i));
}

export const useMoneyStore = create<MoneyStore>()(
  persist(
    (set, get) => ({
      syncUserId: null,
      syncing: false,

      accounts: DEFAULT_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      transactions: [],
      recurrenceRules: [],
      budgets: [],

      // ── Transactions ──────────────────────────────────────────────────────
      addTransaction: (tx) => {
        const localId = uid("tx");
        const created: Transaction = { ...tx, id: localId };
        set((s) => ({ transactions: [...s.transactions, created] }));

        if (get().syncUserId) {
          moneyApi
            .createTransaction(tx)
            .then((server) => {
              set((s) => ({
                transactions: s.transactions.map((t) => (t.id === localId ? server : t)),
              }));
            })
            .catch(() => {});
        }
        return created;
      },

      updateTransaction: (id, partial) => {
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...partial } : t)),
        }));
        if (get().syncUserId && !isLocalId(id)) {
          moneyApi.updateTransaction(id, partial).catch(() => {});
        }
      },

      deleteTransaction: (id) => {
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
        if (get().syncUserId && !isLocalId(id)) {
          moneyApi.deleteTransaction(id).catch(() => {});
        }
      },

      // ── Recurrence rules ──────────────────────────────────────────────────
      addRecurrenceRule: (rule) => {
        const localId = uid("rule");
        const created: RecurrenceRule = { ...rule, id: localId };
        set((s) => ({ recurrenceRules: [...s.recurrenceRules, created] }));
        get().materializeRecurring();

        if (get().syncUserId) {
          moneyApi
            .createRule(rule)
            .then((server) => {
              set((s) => ({
                recurrenceRules: s.recurrenceRules.map((r) => (r.id === localId ? server : r)),
                transactions: s.transactions.map((t) =>
                  t.recurrenceId === localId ? { ...t, recurrenceId: server.id } : t
                ),
              }));
            })
            .catch(() => {});
        }
        return created;
      },

      updateRecurrenceRule: (id, partial) => {
        set((s) => ({
          recurrenceRules: s.recurrenceRules.map((r) => (r.id === id ? { ...r, ...partial } : r)),
        }));
        // Server doesn't yet expose update for rules — full re-create flow only in v1.
      },

      deleteRecurrenceRule: (id, alsoDeleteGenerated = false) => {
        set((s) => ({
          recurrenceRules: s.recurrenceRules.filter((r) => r.id !== id),
          transactions: alsoDeleteGenerated
            ? s.transactions.filter((t) => t.recurrenceId !== id)
            : s.transactions.map((t) =>
                t.recurrenceId === id ? { ...t, recurrenceId: undefined } : t
              ),
        }));
        if (get().syncUserId && !isLocalId(id)) {
          moneyApi.deleteRule(id).catch(() => {});
        }
      },

      // ── Categories ────────────────────────────────────────────────────────
      addCategory: (cat) => {
        const sortOrder = get().categories.filter((c) => c.kind === cat.kind).length;
        const localId = uid("cat");
        const created: MoneyCategory = { ...cat, id: localId, sortOrder };
        set((s) => ({ categories: [...s.categories, created] }));

        if (get().syncUserId) {
          moneyApi
            .createCategory(cat.label, cat.color, cat.kind)
            .then((server) => {
              set((s) => ({
                categories: s.categories.map((c) => (c.id === localId ? server : c)),
                transactions: rewireId(s.transactions, localId, server.id) // unlikely but safe
                  .map((t) => (t.categoryId === localId ? { ...t, categoryId: server.id } : t)),
                recurrenceRules: s.recurrenceRules.map((r) =>
                  r.categoryId === localId ? { ...r, categoryId: server.id } : r
                ),
                budgets: s.budgets.map((b) =>
                  b.categoryId === localId ? { ...b, categoryId: server.id } : b
                ),
              }));
            })
            .catch(() => {});
        }
        return created;
      },

      removeCategory: (id) => {
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
        if (get().syncUserId && !isLocalId(id)) {
          moneyApi.deleteCategory(id).catch(() => {});
        }
      },

      // ── Accounts ──────────────────────────────────────────────────────────
      addAccount: (acct) => {
        const localId = uid("acct");
        const created: MoneyAccount = { ...acct, id: localId, sortOrder: get().accounts.length };
        set((s) => ({ accounts: [...s.accounts, created] }));

        if (get().syncUserId) {
          moneyApi
            .createAccount(acct.name, acct.type)
            .then((server) => {
              set((s) => ({
                accounts: s.accounts.map((a) => (a.id === localId ? server : a)),
                transactions: s.transactions.map((t) =>
                  t.accountId === localId ? { ...t, accountId: server.id } : t
                ),
                recurrenceRules: s.recurrenceRules.map((r) =>
                  r.accountId === localId ? { ...r, accountId: server.id } : r
                ),
              }));
            })
            .catch(() => {});
        }
        return created;
      },

      removeAccount: (id) => {
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
        if (get().syncUserId && !isLocalId(id)) {
          moneyApi.deleteAccount(id).catch(() => {});
        }
      },

      // ── Budgets ───────────────────────────────────────────────────────────
      setBudget: (month, categoryId, amount) => {
        set((s) => {
          if (amount <= 0) {
            return {
              budgets: s.budgets.filter((b) => !(b.month === month && b.categoryId === categoryId)),
            };
          }
          const idx = s.budgets.findIndex(
            (b) => b.month === month && b.categoryId === categoryId
          );
          if (idx >= 0) {
            const next = [...s.budgets];
            next[idx] = { month, categoryId, amount };
            return { budgets: next };
          }
          return { budgets: [...s.budgets, { month, categoryId, amount }] };
        });
        if (get().syncUserId && !isLocalId(categoryId)) {
          moneyApi.setBudget(month, categoryId, amount).catch(() => {});
        }
      },

      getBudget: (month, categoryId) =>
        get().budgets.find((b) => b.month === month && b.categoryId === categoryId)?.amount ?? 0,

      // ── Recurring materialization (still local; server cron deferred) ────
      materializeRecurring: (asOfYmd) => {
        const asOf = asOfYmd ?? todayYmd();
        const { recurrenceRules, transactions } = get();
        const newTxs: Transaction[] = [];
        const updatedRules: RecurrenceRule[] = [];
        let anyChanges = false;

        for (const rule of recurrenceRules) {
          const dates = pendingOccurrences(rule, asOf);
          if (dates.length === 0) {
            updatedRules.push(rule);
            continue;
          }
          anyChanges = true;
          for (const date of dates) {
            newTxs.push({
              id: uid("tx"),
              date,
              kind: rule.kind,
              amount: rule.amount,
              categoryId: rule.categoryId,
              accountId: rule.accountId,
              note: rule.note,
              description: rule.description,
              recurrenceId: rule.id,
            });
          }
          updatedRules.push({
            ...rule,
            lastMaterializedThrough: dates[dates.length - 1],
          });
        }

        if (!anyChanges) return;
        set({
          transactions: [...transactions, ...newTxs],
          recurrenceRules: updatedRules,
        });
      },

      resetAll: () =>
        set({
          accounts: DEFAULT_ACCOUNTS,
          categories: DEFAULT_CATEGORIES,
          transactions: [],
          recurrenceRules: [],
          budgets: [],
        }),

      // ── Sync lifecycle ────────────────────────────────────────────────────
      initSync: async (userId) => {
        if (get().syncUserId === userId) return;
        set({ syncing: true });

        try {
          const server = await moneyApi.bootstrap();
          const serverHasData =
            server.transactions.length > 0 ||
            server.accounts.length > 0 ||
            server.categories.length > 0;

          if (serverHasData) {
            // Hydrate local from server (server is source of truth)
            set({
              syncUserId: userId,
              accounts: server.accounts,
              categories: server.categories,
              transactions: server.transactions,
              recurrenceRules: server.rules,
              budgets: server.budgets,
            });
          } else {
            // First-login migration: push local data to the server
            const local = get();
            const userHasLocalData =
              local.transactions.length > 0 ||
              local.recurrenceRules.length > 0 ||
              local.budgets.length > 0 ||
              local.accounts.some((a) => !DEFAULT_ACCOUNTS.find((d) => d.id === a.id)) ||
              local.categories.some((c) => !DEFAULT_CATEGORIES.find((d) => d.id === c.id));

            if (!userHasLocalData) {
              set({ syncUserId: userId });
            } else {
              // Step 1: create all custom categories + accounts (servers assign new UUIDs).
              const accountIdMap = new Map<string, string>();
              const categoryIdMap = new Map<string, string>();

              for (const acct of local.accounts) {
                const created = await moneyApi.createAccount(acct.name, acct.type);
                accountIdMap.set(acct.id, created.id);
              }
              for (const cat of local.categories) {
                const created = await moneyApi.createCategory(cat.label, cat.color, cat.kind);
                categoryIdMap.set(cat.id, created.id);
              }

              // Step 2: bulk-import transactions with remapped ids.
              const txsToImport = local.transactions
                .map((t) => ({
                  date: t.date,
                  kind: t.kind,
                  amount: t.amount,
                  categoryId: categoryIdMap.get(t.categoryId) ?? t.categoryId,
                  accountId: accountIdMap.get(t.accountId) ?? t.accountId,
                  note: t.note,
                  description: t.description,
                }))
                .filter((t) => !isLocalId(t.categoryId) && !isLocalId(t.accountId));

              const importedTxs = txsToImport.length > 0
                ? await moneyApi.importTransactions(txsToImport)
                : [];

              // Step 3: re-import recurring rules.
              const rules: RecurrenceRule[] = [];
              for (const r of local.recurrenceRules) {
                const remappedCat = categoryIdMap.get(r.categoryId) ?? r.categoryId;
                const remappedAcct = accountIdMap.get(r.accountId) ?? r.accountId;
                if (isLocalId(remappedCat) || isLocalId(remappedAcct)) continue;
                const server = await moneyApi.createRule({
                  kind: r.kind,
                  amount: r.amount,
                  categoryId: remappedCat,
                  accountId: remappedAcct,
                  note: r.note,
                  description: r.description,
                  startDate: r.startDate,
                  endDate: r.endDate,
                  frequency: r.frequency,
                  interval: r.interval,
                });
                rules.push(server);
              }

              // Step 4: re-import budgets.
              const budgets: CategoryBudget[] = [];
              for (const b of local.budgets) {
                const remappedCat = categoryIdMap.get(b.categoryId) ?? b.categoryId;
                if (isLocalId(remappedCat)) continue;
                await moneyApi.setBudget(b.month, remappedCat, b.amount);
                budgets.push({ month: b.month, categoryId: remappedCat, amount: b.amount });
              }

              // Replace local state with the now-synced versions.
              set({
                syncUserId: userId,
                accounts: [...accountIdMap.entries()].map(([, newId]) => {
                  const acct = local.accounts.find((a) => accountIdMap.get(a.id) === newId)!;
                  return { ...acct, id: newId };
                }),
                categories: [...categoryIdMap.entries()].map(([, newId]) => {
                  const cat = local.categories.find((c) => categoryIdMap.get(c.id) === newId)!;
                  return { ...cat, id: newId };
                }),
                transactions: importedTxs,
                recurrenceRules: rules,
                budgets,
              });
            }
          }
        } catch (e) {
          console.error("[money] sync failed", e);
          // Keep local state — user can retry next session.
        } finally {
          set({ syncing: false });
        }
      },

      disconnectSync: () => {
        set({
          syncUserId: null,
          accounts: DEFAULT_ACCOUNTS,
          categories: DEFAULT_CATEGORIES,
          transactions: [],
          recurrenceRules: [],
          budgets: [],
        });
      },
    }),
    {
      name: "fire-money",
      version: 2,
      // Don't persist sync session info — re-derive from auth on each load.
      partialize: (s) => ({
        accounts: s.accounts,
        categories: s.categories,
        transactions: s.transactions,
        recurrenceRules: s.recurrenceRules,
        budgets: s.budgets,
      }),
    }
  )
);
