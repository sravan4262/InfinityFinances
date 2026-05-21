import { apiFetch } from "./client";
import type {
  MoneyAccount,
  MoneyCategory,
  Transaction,
  RecurrenceRule,
  CategoryBudget,
  TxKind,
  AccountType,
  RecurrenceFrequency,
} from "@/lib/money/types";

// Server row shapes (snake_case from Postgres)
interface DbAccount {
  id: string;
  name: string;
  type: AccountType;
  sort_order: number;
}
interface DbCategory {
  id: string;
  label: string;
  color: string;
  kind: TxKind;
  sort_order: number;
}
interface DbTransaction {
  id: string;
  date: string;
  kind: TxKind;
  amount: string;
  category_id: string;
  account_id: string;
  note: string | null;
  description: string | null;
  recurrence_id: string | null;
}
interface DbRecurrenceRule {
  id: string;
  kind: TxKind;
  amount: string;
  category_id: string;
  account_id: string;
  note: string | null;
  description: string | null;
  start_date: string;
  end_date: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  last_materialized_through: string | null;
}
interface DbMonthlyBudget {
  month: string;
  category_id: string;
  amount: string;
}

interface BootstrapResponse {
  accounts: DbAccount[];
  categories: DbCategory[];
  transactions: DbTransaction[];
  rules: DbRecurrenceRule[];
  budgets: DbMonthlyBudget[];
}

// ── Mappers (snake_case → camelCase, numeric strings → numbers) ─────────────
const toAccount = (r: DbAccount): MoneyAccount => ({
  id: r.id,
  name: r.name,
  type: r.type,
  sortOrder: r.sort_order,
});

const toCategory = (r: DbCategory): MoneyCategory => ({
  id: r.id,
  label: r.label,
  color: r.color,
  kind: r.kind,
  sortOrder: r.sort_order,
});

const toTransaction = (r: DbTransaction): Transaction => ({
  id: r.id,
  date: r.date,
  kind: r.kind,
  amount: Number(r.amount),
  categoryId: r.category_id,
  accountId: r.account_id,
  note: r.note ?? undefined,
  description: r.description ?? undefined,
  recurrenceId: r.recurrence_id ?? undefined,
});

const toRecurrenceRule = (r: DbRecurrenceRule): RecurrenceRule => ({
  id: r.id,
  kind: r.kind,
  amount: Number(r.amount),
  categoryId: r.category_id,
  accountId: r.account_id,
  note: r.note ?? undefined,
  description: r.description ?? undefined,
  startDate: r.start_date,
  endDate: r.end_date ?? undefined,
  frequency: r.frequency,
  interval: r.interval,
  lastMaterializedThrough: r.last_materialized_through ?? undefined,
});

const toBudget = (r: DbMonthlyBudget): CategoryBudget => ({
  month: r.month,
  categoryId: r.category_id,
  amount: Number(r.amount),
});

export interface MoneyBootstrap {
  accounts: MoneyAccount[];
  categories: MoneyCategory[];
  transactions: Transaction[];
  rules: RecurrenceRule[];
  budgets: CategoryBudget[];
}

export const moneyApi = {
  bootstrap: async (): Promise<MoneyBootstrap> => {
    const data = await apiFetch<BootstrapResponse>("/money/bootstrap");
    return {
      accounts: data.accounts.map(toAccount),
      categories: data.categories.map(toCategory),
      transactions: data.transactions.map(toTransaction),
      rules: data.rules.map(toRecurrenceRule),
      budgets: data.budgets.map(toBudget),
    };
  },

  // Accounts
  createAccount: async (name: string, type: AccountType): Promise<MoneyAccount> =>
    toAccount(
      await apiFetch<DbAccount>("/money/accounts", {
        method: "POST",
        body: JSON.stringify({ name, type }),
      })
    ),
  deleteAccount: (id: string) =>
    apiFetch<{ success: boolean }>(`/money/accounts/${id}`, { method: "DELETE" }),

  // Categories
  createCategory: async (label: string, color: string, kind: TxKind): Promise<MoneyCategory> =>
    toCategory(
      await apiFetch<DbCategory>("/money/categories", {
        method: "POST",
        body: JSON.stringify({ label, color, kind }),
      })
    ),
  deleteCategory: (id: string) =>
    apiFetch<{ success: boolean }>(`/money/categories/${id}`, { method: "DELETE" }),

  // Transactions
  createTransaction: async (tx: Omit<Transaction, "id">): Promise<Transaction> =>
    toTransaction(
      await apiFetch<DbTransaction>("/money/transactions", {
        method: "POST",
        body: JSON.stringify(tx),
      })
    ),
  updateTransaction: async (id: string, patch: Partial<Omit<Transaction, "id">>): Promise<Transaction> =>
    toTransaction(
      await apiFetch<DbTransaction>(`/money/transactions/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      })
    ),
  deleteTransaction: (id: string) =>
    apiFetch<{ success: boolean }>(`/money/transactions/${id}`, { method: "DELETE" }),

  // Bulk import — used for local→server migration on first login
  importTransactions: async (txs: Omit<Transaction, "id">[]): Promise<Transaction[]> => {
    const created = await apiFetch<DbTransaction[]>("/money/transactions/batch", {
      method: "POST",
      body: JSON.stringify(txs),
    });
    return created.map(toTransaction);
  },

  // Recurrence rules
  createRule: async (rule: Omit<RecurrenceRule, "id" | "lastMaterializedThrough">): Promise<RecurrenceRule> =>
    toRecurrenceRule(
      await apiFetch<DbRecurrenceRule>("/money/recurrence-rules", {
        method: "POST",
        body: JSON.stringify(rule),
      })
    ),
  deleteRule: (id: string) =>
    apiFetch<{ success: boolean }>(`/money/recurrence-rules/${id}`, { method: "DELETE" }),

  // Monthly budgets — amount=0 deletes
  setBudget: (month: string, categoryId: string, amount: number) =>
    apiFetch<DbMonthlyBudget | { success: boolean; deleted: true }>("/money/budgets", {
      method: "PUT",
      body: JSON.stringify({ month, categoryId, amount }),
    }),
};
