import type { Transaction, MoneyCategory } from "./types";
import { parseYmd, toYmd } from "./recurrence";

export function ymdToMonth(ymd: string): string {
  return ymd.slice(0, 7);
}

export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, "0")}`,
  };
}

export function txInRange(txs: Transaction[], from: string, to: string): Transaction[] {
  return txs.filter((t) => t.date >= from && t.date <= to);
}

export function txInMonth(txs: Transaction[], month: string): Transaction[] {
  const { from, to } = monthRange(month);
  return txInRange(txs, from, to);
}

export function totalsByKind(txs: Transaction[]): { income: number; expense: number } {
  return txs.reduce(
    (acc, t) => {
      acc[t.kind] += t.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );
}

export function groupByDate(txs: Transaction[]): { date: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const list = map.get(t.date) ?? [];
    list.push(t);
    map.set(t.date, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a > b ? -1 : a < b ? 1 : 0))
    .map(([date, items]) => ({ date, items }));
}

export function expenseByCategory(
  txs: Transaction[],
  categories: MoneyCategory[]
): { category: MoneyCategory; amount: number }[] {
  const totals = new Map<string, number>();
  for (const t of txs) {
    if (t.kind !== "expense") continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([id, amount]) => {
      const cat = categories.find((c) => c.id === id);
      return {
        category:
          cat ?? {
            id,
            label: "Unknown",
            color: "oklch(0.6 0 0)",
            kind: "expense" as const,
            sortOrder: 999,
          },
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export function noteCounts(
  txs: Transaction[]
): { note: string; count: number; amount: number }[] {
  const map = new Map<string, { count: number; amount: number }>();
  for (const t of txs) {
    if (!t.note) continue;
    const cur = map.get(t.note) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += t.amount;
    map.set(t.note, cur);
  }
  return [...map.entries()]
    .map(([note, v]) => ({ note, ...v }))
    .sort((a, b) => b.count - a.count || b.amount - a.amount);
}

export function formatYmdLong(ymd: string): { day: string; weekday: string } {
  const d = parseYmd(ymd);
  return {
    day: String(d.getDate()).padStart(2, "0"),
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

export function buildCalendarGrid(
  month: string
): { ymd: string; inMonth: boolean; dow: number }[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const dow = (first.getDay() + 6) % 7;
  const start = new Date(y, m - 1, 1 - dow);
  const cells: { ymd: string; inMonth: boolean; dow: number }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      ymd: toYmd(d),
      inMonth: d.getMonth() === m - 1,
      dow: i % 7,
    });
  }
  return cells;
}

export function buildWeeklyBreakdown(
  month: string
): { from: string; to: string; label: string }[] {
  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0);

  const firstDow = (monthStart.getDay() + 6) % 7;
  const firstMonday = new Date(monthStart);
  firstMonday.setDate(monthStart.getDate() - firstDow);

  const weeks: { from: string; to: string; label: string }[] = [];
  const cursor = new Date(firstMonday);
  while (cursor.getTime() <= monthEnd.getTime()) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(cursor.getDate() + 6);
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    weeks.push({
      from: toYmd(cursor),
      to: toYmd(weekEnd),
      label: `${fmt(cursor)} ~ ${fmt(weekEnd)}`,
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks.reverse();
}

export function monthsInYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function shortMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}
