import type { FireCurrency, MonteCarloPercentileRow } from "@/lib/engine/types";
import { PortfolioAreaChart } from "./PortfolioAreaChart";

export function MonteCarloFanChart({
  rows,
  fireNumber,
  retirementAge,
  currency,
  height = 220,
  compact = false
}: {
  rows: MonteCarloPercentileRow[];
  fireNumber: number;
  retirementAge: number;
  currency?: FireCurrency;
  height?: number;
  compact?: boolean;
}) {
  return (
    <PortfolioAreaChart
      rows={rows.map((row) => ({
        age: row.age,
        year: new Date().getFullYear() + row.age - rows[0].age,
        portfolio: row.p50,
        annualSavings: 0,
        annualSpending: 0,
        netWithdrawal: 0,
        educationExpense: 0,
        otherIncome: 0,
        realReturn: 0,
        isRetired: false,
        isFire: false,
        fireGap: 0
      }))}
      monteCarloRows={rows}
      fireNumber={fireNumber}
      retirementAge={retirementAge}
      currency={currency}
      height={height}
      showWhatIf={false}
      showMonteCarlo
      compact={compact}
    />
  );
}
