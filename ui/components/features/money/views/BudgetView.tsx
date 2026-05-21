"use client";
import { useMoneyStore } from "@/lib/money/store";
import { txInMonth, expenseByCategory, totalsByKind, monthLabel } from "@/lib/money/selectors";
import { formatCurrency } from "@/lib/utils";

interface Props {
  month: string;
}

export function BudgetView({ month }: Props) {
  const { transactions, categories, budgets, setBudget } = useMoneyStore();
  const monthTxs = txInMonth(transactions, month);
  const totals = totalsByKind(monthTxs);
  const breakdown = expenseByCategory(monthTxs, categories);
  const expenseCats = categories.filter((c) => c.kind === "expense");
  const spentByCat = new Map(breakdown.map((b) => [b.category.id, b.amount]));

  const totalBudget = budgets
    .filter((b) => b.month === month)
    .reduce((sum, b) => sum + b.amount, 0);
  const remaining = Math.max(0, totalBudget - totals.expense);
  const pct = totalBudget > 0 ? Math.min(100, (totals.expense / totalBudget) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Remaining ({monthLabel(month)})
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {formatCurrency(remaining)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Budget
            </div>
            <div className="text-sm font-medium tabular-nums">
              {formatCurrency(totalBudget)}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>Spent {formatCurrency(totals.expense)}</span>
            <span>{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background:
                  pct >= 100
                    ? "oklch(0.65 0.22 25)"
                    : pct >= 75
                    ? "oklch(0.72 0.18 50)"
                    : "oklch(0.68 0.15 195)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Per-category budgets */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_120px] items-center px-4 py-2.5 border-b border-border/30 text-[11px] text-muted-foreground uppercase tracking-wider">
          <span>Category</span>
          <span className="text-right">Spent</span>
          <span className="text-right">Budget</span>
        </div>
        {expenseCats.map((cat) => {
          const spent = spentByCat.get(cat.id) ?? 0;
          const cur = budgets.find((b) => b.month === month && b.categoryId === cat.id);
          const over = cur && cur.amount > 0 && spent > cur.amount;
          return (
            <div
              key={cat.id}
              className="grid grid-cols-[1fr_100px_120px] items-center px-4 py-2.5 border-b border-border/20 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: cat.color }}
                />
                <span className="text-sm truncate">{cat.label}</span>
              </div>
              <div
                className={`text-right text-sm tabular-nums ${
                  over ? "text-destructive font-medium" : ""
                }`}
              >
                {spent > 0 ? formatCurrency(spent) : "—"}
              </div>
              <div className="flex justify-end">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={cur?.amount || ""}
                    placeholder="0"
                    onChange={(e) =>
                      setBudget(month, cat.id, parseFloat(e.target.value) || 0)
                    }
                    className="w-24 text-right bg-transparent border border-border/30 rounded-md pl-5 pr-2 py-1 text-xs focus:outline-none focus:border-primary/60 tabular-nums"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
