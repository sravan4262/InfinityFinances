import type { MoneyAccount, MoneyCategory, Transaction } from "./types";

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(transactions: Transaction[], categories: MoneyCategory[], accounts: MoneyAccount[]) {
  const categoryMap = new Map(categories.map((category) => [category.id, category.label]));
  const accountMap = new Map(accounts.map((account) => [account.id, account.name]));
  const rows = [["Date", "Kind", "Amount", "Category", "Account", "Note", "Description"]];
  for (const transaction of [...transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([
      transaction.date,
      transaction.kind,
      String(transaction.amount),
      categoryMap.get(transaction.categoryId) ?? "",
      accountMap.get(transaction.accountId) ?? "",
      transaction.note ?? "",
      transaction.description ?? ""
    ]);
  }
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}
