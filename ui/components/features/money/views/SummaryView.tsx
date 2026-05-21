"use client";
import { Download } from "lucide-react";
import { useMoneyStore } from "@/lib/money/store";
import { txInMonth, totalsByKind, monthLabel } from "@/lib/money/selectors";
import { formatCurrency } from "@/lib/utils";
import { toCsv, downloadCsv } from "@/lib/money/csv";

interface Props {
  month: string;
}

export function SummaryView({ month }: Props) {
  const { transactions, categories, accounts, budgets } = useMoneyStore();
  const monthTxs = txInMonth(transactions, month);
  const totals = totalsByKind(monthTxs);

  const accountTotals = accounts.map((a) => {
    const txs = monthTxs.filter((t) => t.accountId === a.id);
    const t = totalsByKind(txs);
    return { account: a, ...t };
  });

  const totalBudget = budgets
    .filter((b) => b.month === month)
    .reduce((sum, b) => sum + b.amount, 0);
  const pct = totalBudget > 0 ? Math.min(100, (totals.expense / totalBudget) * 100) : 0;

  const handleExport = () => {
    const csv = toCsv(monthTxs, categories, accounts);
    downloadCsv(`money-${month}.csv`, csv);
  };

  return (
    <div className="space-y-4">
      {/* Accounts breakdown */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/30">
          <div className="text-sm font-semibold">Accounts</div>
        </div>
        <div>
          {accountTotals.map(({ account, income, expense }) => (
            <div
              key={account.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2.5 border-b border-border/20 last:border-0"
            >
              <div className="text-sm">
                <span className="text-muted-foreground">Exp. ({account.name})</span>
              </div>
              <div className="text-xs tabular-nums text-success">
                {income > 0 ? `+${formatCurrency(income)}` : ""}
              </div>
              <div className="text-sm tabular-nums">{formatCurrency(expense)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Budget summary */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm font-semibold">Budget</div>
            <div className="text-[11px] text-muted-foreground">{monthLabel(month)}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Total</div>
            <div className="text-sm tabular-nums font-medium">
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

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={monthTxs.length === 0}
        className="w-full glass rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-sm hover:bg-muted/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        Export {monthLabel(month)} to CSV
      </button>
    </div>
  );
}
