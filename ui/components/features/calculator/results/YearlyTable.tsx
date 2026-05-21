"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { FireCurrency, YearlyRow } from "@/lib/engine/types";
import { formatCurrency } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface YearlyTableProps {
  rows: YearlyRow[];
  fireAge: number | null;
  currency?: FireCurrency;
}

export function YearlyTable({ rows, fireAge, currency }: YearlyTableProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
      className="glass rounded-2xl overflow-hidden"
    >
      <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold">Year-by-year projection</p>
        <p className="text-xs text-muted-foreground">{rows.length} years</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-card px-3 sm:px-4 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Age
              </th>
              <th className="hidden sm:table-cell px-3 sm:px-4 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wide">
                Year
              </th>
              <th className="px-3 sm:px-4 py-2.5 text-right font-medium text-muted-foreground uppercase tracking-wide">
                Portfolio
              </th>
              <th className="px-3 sm:px-4 py-2.5 text-right font-medium text-muted-foreground uppercase tracking-wide">
                Savings
              </th>
              <th className="hidden md:table-cell px-3 sm:px-4 py-2.5 text-right font-medium text-muted-foreground uppercase tracking-wide">
                Spending
              </th>
              <th className="px-3 sm:px-4 py-2.5 text-right font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Gap
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.age}
                className={cn(
                  "border-b border-border/40 transition-colors",
                  row.isFire && row.age === fireAge && "bg-primary/10",
                  row.isRetired && !row.isFire && "bg-muted/10",
                  !row.isRetired && "hover:bg-muted/10"
                )}
              >
                {/* Sticky age cell */}
                <td className="sticky left-0 z-10 bg-inherit px-3 sm:px-4 py-2.5 font-medium whitespace-nowrap">
                  <span>{row.age}</span>
                  {row.age === fireAge && (
                    <span className="ml-1.5 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                      🔥
                    </span>
                  )}
                </td>
                <td className="hidden sm:table-cell px-3 sm:px-4 py-2.5 text-muted-foreground tabular-nums">
                  {row.year}
                </td>
                <td className="px-3 sm:px-4 py-2.5 text-right font-medium tabular-nums">
                  <span className={row.portfolio <= 0 ? "text-destructive" : "text-foreground"}>
                    {formatCurrency(row.portfolio, true, currency)}
                  </span>
                </td>
                <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums text-success">
                  {row.annualSavings > 0 ? `+${formatCurrency(row.annualSavings, true, currency)}` : "—"}
                </td>
                <td className="hidden md:table-cell px-3 sm:px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {formatCurrency(row.annualSpending, true, currency)}
                </td>
                <td className={cn(
                  "px-3 sm:px-4 py-2.5 text-right tabular-nums font-medium",
                  row.fireGap >= 0 ? "text-success" : "text-muted-foreground"
                )}>
                  {row.fireGap >= 0 ? "✓" : formatCurrency(row.fireGap, true, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 10 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border"
        >
          {expanded ? (
            <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" /> Show all {rows.length} years</>
          )}
        </button>
      )}
    </motion.div>
  );
}
