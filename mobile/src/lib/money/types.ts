export type TxKind = "income" | "expense";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type AccountType = "cash" | "card" | "bank";

export interface MoneyAccount {
  id: string;
  name: string;
  type: AccountType;
  sortOrder: number;
}

export interface MoneyCategory {
  id: string;
  label: string;
  color: string;
  kind: TxKind;
  sortOrder: number;
}

export interface Transaction {
  id: string;
  date: string;
  kind: TxKind;
  amount: number;
  categoryId: string;
  accountId: string;
  note?: string;
  description?: string;
  recurrenceId?: string;
}

export interface RecurrenceRule {
  id: string;
  kind: TxKind;
  amount: number;
  categoryId: string;
  accountId: string;
  note?: string;
  description?: string;
  startDate: string;
  frequency: RecurrenceFrequency;
  interval: number;
  endDate?: string;
  lastMaterializedThrough?: string;
}

export interface CategoryBudget {
  month: string;
  categoryId: string;
  amount: number;
}
