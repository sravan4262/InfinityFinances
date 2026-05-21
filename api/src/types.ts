export type AppVariables = {
  userId: string;
  user: { id: string };
};

export interface DbPlan {
  id: string;
  user_id: string;
  name: string;
  inputs: unknown;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

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

export interface DbHomeCalcProfile {
  id: string;
  user_id: string;
  name: string;
  break_even: unknown;
  mortgage: unknown;
  affordability: unknown;
  created_at: string;
  updated_at: string;
}

// ── Budget Calc ──────────────────────────────────────────────────────────────
export type AccountType = "cash" | "card" | "bank";
export type TxKind = "income" | "expense";
export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export interface DbBudgetAccount {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  sort_order: number;
  created_at: string;
}

export interface DbBudgetCategory {
  id: string;
  user_id: string;
  label: string;
  color: string;
  kind: TxKind;
  sort_order: number;
}

export interface DbBudgetTransaction {
  id: string;
  user_id: string;
  date: string;
  kind: TxKind;
  amount: string;
  category_id: string;
  account_id: string;
  note: string | null;
  description: string | null;
  recurrence_id: string | null;
  created_at: string;
}

export interface DbBudgetRecurrenceRule {
  id: string;
  user_id: string;
  kind: TxKind;
  amount: string;
  category_id: string;
  account_id: string;
  note: string | null;
  description: string | null;
  start_date: string;
  end_date: string | null;
  frequency: Frequency;
  interval: number;
  last_materialized_through: string | null;
}

export interface DbBudgetMonthlyBudget {
  user_id: string;
  month: string; // 'YYYY-MM'
  category_id: string;
  amount: string;
}

// ── Chat ─────────────────────────────────────────────────────────────────────
export type ChatArea = "retirement" | "home" | "budget";

export interface DbChatSession {
  id: string;
  user_id: string;
  area: ChatArea;
  created_at: string;
}

export interface DbChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  extracted_inputs: unknown;
  created_at: string;
}
