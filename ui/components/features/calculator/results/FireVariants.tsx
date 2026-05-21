"use client";
import { motion } from "framer-motion";
import type { FireCurrency, FireResults } from "@/lib/engine/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface FireVariantsProps {
  results: FireResults;
  currentAge: number;
  realAnnualReturn: number; // needed for free-coast projection
  currency?: FireCurrency;
}

const STANDARD_VARIANTS = [
  {
    key: "lean",
    label: "Lean FIRE",
    emoji: "🥗",
    description: "Frugal, minimal lifestyle",
    color: "text-success",
    border: "border-success/30",
    bg: "bg-success/5",
  },
  {
    key: "standard",
    label: "Standard FIRE",
    emoji: "🔥",
    description: "Current spending level",
    color: "text-primary",
    border: "border-primary/40",
    bg: "bg-primary/5",
    highlight: true,
  },
  {
    key: "fat",
    label: "Fat FIRE",
    emoji: "💎",
    description: "Generous, luxurious retirement",
    color: "text-gold",
    border: "border-gold/30",
    bg: "bg-gold/5",
  },
  {
    key: "barista",
    label: "Barista FIRE",
    emoji: "☕",
    description: "Semi-retire — part-time income covers ~40%",
    color: "text-orange-400",
    border: "border-orange-400/30",
    bg: "bg-orange-400/5",
  },
];

export function FireVariants({ results, currentAge, realAnnualReturn, currency }: FireVariantsProps) {
  const coastProgress = results.coastFireNumber > 0
    ? Math.min(1, (results.yearlyRows[0]?.portfolio ?? 0) / results.coastFireNumber)
    : 0;

  // Free-coast projection: if user stops contributing today, portfolio at retirementAge
  // We approximate using the initial portfolio from yearlyRows[0]
  // Actually we can use coastFireAchievedAge from results

  // "Years until coast" — find from yearly rows the first year where cumulative
  // portfolio without savings reaches coastFireNumber. Approximate by linear search.
  let yearsUntilCoast: number | null = null;
  if (results.coastFireAchievedAge === null) {
    for (const row of results.yearlyRows) {
      if (!row.isRetired && row.portfolio >= results.coastFireNumber) {
        yearsUntilCoast = row.age - currentAge;
        break;
      }
    }
  }

  const getFireNumber = (key: string) => {
    switch (key) {
      case "lean": return results.leanFireNumber;
      case "fat": return results.fatFireNumber;
      case "barista": return results.baristaFireNumber;
      default: return results.fireNumber;
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold">FIRE variants</p>

      {/* 2×2 grid on mobile, 4-col row on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STANDARD_VARIANTS.map(({ key, label, emoji, description, color, border, bg, highlight }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.08, duration: 0.35 }}
            className={cn(
              "rounded-xl border p-3.5",
              border, bg,
              highlight && "glow-primary"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{emoji}</span>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className={cn("text-lg font-bold tabular-nums leading-tight", color)}>
              {formatCurrency(getFireNumber(key), true, currency)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{description}</p>
          </motion.div>
        ))}
      </div>

      {/* Barista explanation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85 }}
        className="rounded-xl border border-border bg-muted/10 px-4 py-3 text-xs text-muted-foreground"
      >
        <span className="text-foreground font-medium">Barista FIRE</span> — semi-retire with part-time work covering ~40% of expenses.
        Your portfolio only needs to fund the remaining 60%, so the target is{" "}
        <span className="text-foreground font-medium">{formatCurrency(results.baristaFireNumber, true, currency)}</span> vs the full{" "}
        <span className="text-foreground font-medium">{formatCurrency(results.fireNumber, true, currency)}</span>.
      </motion.div>

      {/* Coast FIRE — improved */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="rounded-xl border border-border bg-muted/15 p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🏄</span>
              <p className="text-sm font-semibold">Coast FIRE</p>
            </div>
            {results.coastFireAchievedAge !== null ? (
              <>
                <p className="text-xs text-success font-medium">
                  You could have coasted since age {results.coastFireAchievedAge}!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Stop all contributions now — compounding alone will grow your portfolio
                  to your FIRE number by age {results.yearlyRows.find(r => r.isRetired)?.age ?? "retirement"}.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Target:{" "}
                  <span className="text-foreground font-medium">
                    {formatCurrency(results.coastFireNumber, true, currency)}
                  </span>
                  {yearsUntilCoast !== null && (
                    <span className="ml-2 text-primary">
                      ~{yearsUntilCoast} yr{yearsUntilCoast !== 1 ? "s" : ""} away
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Reach this and you can stop contributing — compounding handles the rest.
                </p>
              </>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className={cn(
              "text-lg font-bold tabular-nums",
              coastProgress >= 1 ? "text-success" : coastProgress >= 0.7 ? "text-gold" : "text-primary"
            )}>
              {Math.min(100, Math.round(coastProgress * 100))}%
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: coastProgress >= 1
                  ? "oklch(0.65 0.18 150)"
                  : coastProgress >= 0.7
                  ? "oklch(0.76 0.155 75)"
                  : "oklch(0.68 0.15 195)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, coastProgress * 100)}%` }}
              transition={{ duration: 1, delay: 1, ease: "easeOut" }}
            />
          </div>
          {results.coastFireAchievedAge === null && (
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{formatCurrency(results.yearlyRows[0]?.portfolio ?? 0, true, currency)} today</span>
              <span>{formatCurrency(results.coastFireNumber, true, currency)} coast target</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
