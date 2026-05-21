"use client";
import { formatCurrency } from "@/lib/utils";
import type { FireCurrency, RetirementSensitivityRow } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

interface Props {
  rows: RetirementSensitivityRow[];
  plannedRetirementAge: number;
  currency?: FireCurrency;
}

export function SensitivityTable({ rows, plannedRetirementAge, currency }: Props) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold">Retirement age sensitivity</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          How much corpus you need — and what you&apos;re on track for — at each retirement age.
          Monthly savings needed is from zero (standalone reference).
        </p>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-muted-foreground font-medium py-2 px-2">Retire at</th>
              <th className="text-right text-muted-foreground font-medium py-2 px-2">Corpus needed</th>
              <th className="text-right text-muted-foreground font-medium py-2 px-2">Projected</th>
              <th className="text-right text-muted-foreground font-medium py-2 px-2">Gap</th>
              <th className="text-right text-muted-foreground font-medium py-2 px-2">Mo. savings ref</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isPlanned = row.retirementAge === plannedRetirementAge;
              const surplus = row.shortfall <= 0;
              return (
                <tr
                  key={row.retirementAge}
                  className={cn(
                    "border-b border-border/40 transition-colors",
                    isPlanned
                      ? "bg-primary/10 border-primary/20"
                      : "hover:bg-muted/20"
                  )}
                >
                  <td className="py-2.5 px-2 font-medium">
                    <span className={cn(isPlanned && "text-primary font-bold")}>
                      Age {row.retirementAge}
                    </span>
                    {isPlanned && (
                      <span className="ml-1.5 text-[10px] bg-primary/20 text-primary px-1 py-0.5 rounded">
                        planned
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {formatCurrency(row.requiredCorpus, true, currency)}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {formatCurrency(row.projectedPortfolio, true, currency)}
                  </td>
                  <td className={cn(
                    "py-2.5 px-2 text-right tabular-nums font-medium",
                    surplus ? "text-success" : "text-warning"
                  )}>
                    {surplus ? "+" : "−"}
                    {formatCurrency(Math.abs(row.shortfall), true, currency)}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">
                    {row.monthlySavingsNeeded > 1e9
                      ? "—"
                      : formatCurrency(row.monthlySavingsNeeded, true, currency) + "/mo"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        All values in today&apos;s dollars. Corpus uses PV annuity formula.
        Gap = projected portfolio − required corpus (positive = surplus).
      </p>
    </div>
  );
}
