import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CategoryBudget, MoneyAccount, MoneyCategory, RecurrenceRule, Transaction } from "./types";
import { pendingOccurrences, todayYmd } from "./recurrence";
import { moneyApi } from "@/lib/api/money";

const PALETTE = [
  "#f94144",
  "#fa7c20",
  "#debb19",
  "#4cc157",
  "#00babb",
  "#00b3b5",
  "#12b2f4",
  "#d17465",
  "#8998b8",
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
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const isLocalId = (id: string) => !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(id);

interface Store {
  syncUserId: string | null;
  syncing: boolean;
  accounts: MoneyAccount[];
  categories: MoneyCategory[];
  transactions: Transaction[];
  recurrenceRules: RecurrenceRule[];
  budgets: CategoryBudget[];
  addTransaction: (tx: Omit<Transaction, "id">) => Transaction;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addRecurrenceRule: (rule: Omit<RecurrenceRule, "id">) => RecurrenceRule;
  updateRecurrenceRule: (id: string, patch: Partial<RecurrenceRule>) => void;
  deleteRecurrenceRule: (id: string, alsoDeleteGenerated?: boolean) => void;
  addCategory: (cat: Omit<MoneyCategory, "id" | "sortOrder">) => MoneyCategory;
  removeCategory: (id: string) => void;
  addAccount: (account: Omit<MoneyAccount, "id" | "sortOrder">) => MoneyAccount;
  removeAccount: (id: string) => void;
  setBudget: (month: string, categoryId: string, amount: number) => void;
  getBudget: (month: string, categoryId: string) => number;
  materializeRecurring: (asOfYmd?: string) => void;
  initSync: (userId: string) => Promise<void>;
  disconnectSync: () => void;
  resetAll: () => void;
}

export const useMoneyStore = create<Store>()(
  persist(
    (set, get) => ({
      syncUserId: null,
      syncing: false,
      accounts: DEFAULT_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      transactions: [],
      recurrenceRules: [],
      budgets: [],
      addTransaction: (tx) => {
        const localId = uid("tx");
        const created = { ...tx, id: localId };
        set((s) => ({ transactions: [...s.transactions, created] }));
        if (get().syncUserId) {
          moneyApi.createTransaction(tx).then((server) => set((s) => ({
            transactions: s.transactions.map((t) => t.id === localId ? server : t),
          }))).catch(() => {});
        }
        return created;
      },
      updateTransaction: (id, patch) => {
        set((s) => ({ transactions: s.transactions.map((t) => t.id === id ? { ...t, ...patch } : t) }));
        if (get().syncUserId && !isLocalId(id)) moneyApi.updateTransaction(id, patch).catch(() => {});
      },
      deleteTransaction: (id) => {
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
        if (get().syncUserId && !isLocalId(id)) moneyApi.deleteTransaction(id).catch(() => {});
      },
      addRecurrenceRule: (rule) => {
        const localId = uid("rule");
        const created = { ...rule, id: localId };
        set((s) => ({ recurrenceRules: [...s.recurrenceRules, created] }));
        get().materializeRecurring();
        if (get().syncUserId) {
          moneyApi.createRule(rule).then((server) => set((s) => ({
            recurrenceRules: s.recurrenceRules.map((r) => r.id === localId ? server : r),
            transactions: s.transactions.map((t) => t.recurrenceId === localId ? { ...t, recurrenceId: server.id } : t),
          }))).catch(() => {});
        }
        return created;
      },
      updateRecurrenceRule: (id, patch) => {
        set((s) => ({ recurrenceRules: s.recurrenceRules.map((r) => r.id === id ? { ...r, ...patch } : r) }));
      },
      deleteRecurrenceRule: (id, alsoDeleteGenerated = false) => {
        set((s) => ({
          recurrenceRules: s.recurrenceRules.filter((r) => r.id !== id),
          transactions: alsoDeleteGenerated
            ? s.transactions.filter((t) => t.recurrenceId !== id)
            : s.transactions.map((t) => t.recurrenceId === id ? { ...t, recurrenceId: undefined } : t),
        }));
        if (get().syncUserId && !isLocalId(id)) moneyApi.deleteRule(id).catch(() => {});
      },
      addCategory: (cat) => {
        const localId = uid("cat");
        const created = { ...cat, id: localId, sortOrder: get().categories.filter((category) => category.kind === cat.kind).length };
        set((s) => ({ categories: [...s.categories, created] }));
        if (get().syncUserId) {
          moneyApi.createCategory(cat.label, cat.color, cat.kind).then((server) => set((s) => ({
            categories: s.categories.map((category) => category.id === localId ? server : category),
            transactions: s.transactions.map((tx) => tx.categoryId === localId ? { ...tx, categoryId: server.id } : tx),
            recurrenceRules: s.recurrenceRules.map((rule) => rule.categoryId === localId ? { ...rule, categoryId: server.id } : rule),
            budgets: s.budgets.map((budget) => budget.categoryId === localId ? { ...budget, categoryId: server.id } : budget),
          }))).catch(() => {});
        }
        return created;
      },
      removeCategory: (id) => {
        set((s) => ({ categories: s.categories.filter((category) => category.id !== id) }));
        if (get().syncUserId && !isLocalId(id)) moneyApi.deleteCategory(id).catch(() => {});
      },
      addAccount: (account) => {
        const localId = uid("acct");
        const created = { ...account, id: localId, sortOrder: get().accounts.length };
        set((s) => ({ accounts: [...s.accounts, created] }));
        if (get().syncUserId) {
          moneyApi.createAccount(account.name, account.type).then((server) => set((s) => ({
            accounts: s.accounts.map((item) => item.id === localId ? server : item),
            transactions: s.transactions.map((tx) => tx.accountId === localId ? { ...tx, accountId: server.id } : tx),
            recurrenceRules: s.recurrenceRules.map((rule) => rule.accountId === localId ? { ...rule, accountId: server.id } : rule),
          }))).catch(() => {});
        }
        return created;
      },
      removeAccount: (id) => {
        set((s) => ({ accounts: s.accounts.filter((account) => account.id !== id) }));
        if (get().syncUserId && !isLocalId(id)) moneyApi.deleteAccount(id).catch(() => {});
      },
      setBudget: (month, categoryId, amount) => {
        set((s) => ({
          budgets: amount <= 0
            ? s.budgets.filter((b) => !(b.month === month && b.categoryId === categoryId))
            : [...s.budgets.filter((b) => !(b.month === month && b.categoryId === categoryId)), { month, categoryId, amount }],
        }));
        if (get().syncUserId && !isLocalId(categoryId)) moneyApi.setBudget(month, categoryId, amount).catch(() => {});
      },
      getBudget: (month, categoryId) => get().budgets.find((budget) => budget.month === month && budget.categoryId === categoryId)?.amount ?? 0,
      materializeRecurring: (asOfYmd) => {
        const asOf = asOfYmd ?? todayYmd();
        const { recurrenceRules, transactions } = get();
        const newTxs: Transaction[] = [];
        const nextRules = recurrenceRules.map((rule) => {
          const dates = pendingOccurrences(rule, asOf);
          dates.forEach((date) => newTxs.push({
            id: uid("tx"),
            date,
            kind: rule.kind,
            amount: rule.amount,
            categoryId: rule.categoryId,
            accountId: rule.accountId,
            note: rule.note,
            description: rule.description,
            recurrenceId: rule.id,
          }));
          return dates.length ? { ...rule, lastMaterializedThrough: dates[dates.length - 1] } : rule;
        });
        if (newTxs.length) set({ transactions: [...transactions, ...newTxs], recurrenceRules: nextRules });
      },
      initSync: async (userId) => {
        if (get().syncUserId === userId) return;
        set({ syncing: true });
        try {
          const server = await moneyApi.bootstrap();
          const hasServerData = server.transactions.length || server.accounts.length || server.categories.length;
          if (hasServerData) {
            set({ syncUserId: userId, accounts: server.accounts, categories: server.categories, transactions: server.transactions, recurrenceRules: server.rules, budgets: server.budgets });
            return;
          }
          const local = get();
          const hasLocalData = local.transactions.length || local.recurrenceRules.length || local.budgets.length || local.accounts.some((account) => !DEFAULT_ACCOUNTS.find((item) => item.id === account.id)) || local.categories.some((category) => !DEFAULT_CATEGORIES.find((item) => item.id === category.id));
          if (!hasLocalData) {
            set({ syncUserId: userId });
            return;
          }
          const accountIdMap = new Map<string, string>();
          const categoryIdMap = new Map<string, string>();
          for (const account of local.accounts) {
            const created = await moneyApi.createAccount(account.name, account.type);
            accountIdMap.set(account.id, created.id);
          }
          for (const category of local.categories) {
            const created = await moneyApi.createCategory(category.label, category.color, category.kind);
            categoryIdMap.set(category.id, created.id);
          }
          const imported = await moneyApi.importTransactions(local.transactions.map(({ id: _id, ...tx }) => ({
            ...tx,
            categoryId: categoryIdMap.get(tx.categoryId) ?? tx.categoryId,
            accountId: accountIdMap.get(tx.accountId) ?? tx.accountId,
          })).filter((tx) => !isLocalId(tx.categoryId) && !isLocalId(tx.accountId)));
          const rules: RecurrenceRule[] = [];
          for (const rule of local.recurrenceRules) {
            const categoryId = categoryIdMap.get(rule.categoryId) ?? rule.categoryId;
            const accountId = accountIdMap.get(rule.accountId) ?? rule.accountId;
            if (isLocalId(categoryId) || isLocalId(accountId)) continue;
            const { id: _id, lastMaterializedThrough: _lastMaterializedThrough, ...rulePayload } = rule;
            rules.push(await moneyApi.createRule({ ...rulePayload, categoryId, accountId }));
          }
          const budgets: CategoryBudget[] = [];
          for (const budget of local.budgets) {
            const categoryId = categoryIdMap.get(budget.categoryId) ?? budget.categoryId;
            if (isLocalId(categoryId)) continue;
            await moneyApi.setBudget(budget.month, categoryId, budget.amount);
            budgets.push({ ...budget, categoryId });
          }
          set({
            syncUserId: userId,
            accounts: local.accounts.map((account) => ({ ...account, id: accountIdMap.get(account.id) ?? account.id })),
            categories: local.categories.map((category) => ({ ...category, id: categoryIdMap.get(category.id) ?? category.id })),
            transactions: imported,
            recurrenceRules: rules,
            budgets
          });
        } finally {
          set({ syncing: false });
        }
      },
      disconnectSync: () => set({ syncUserId: null, accounts: DEFAULT_ACCOUNTS, categories: DEFAULT_CATEGORIES, transactions: [], recurrenceRules: [], budgets: [] }),
      resetAll: () => set({ accounts: DEFAULT_ACCOUNTS, categories: DEFAULT_CATEGORIES, transactions: [], recurrenceRules: [], budgets: [] }),
    }),
    {
      name: "fire-money",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ accounts, categories, transactions, recurrenceRules, budgets }) => ({ accounts, categories, transactions, recurrenceRules, budgets }),
    }
  )
);
