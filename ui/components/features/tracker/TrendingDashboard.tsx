"use client";
import { useMemo } from "react";
import { useTrackerStore } from "@/lib/tracker/store";
import { useFireStore, currentMonthStr } from "@/lib/store";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function parseYM(m: string): { year: number; month: number } {
  const [y, mo] = m.split("-").map(Number);
  return { year: y, month: mo };
}

function addMonths(m: string, n: number): string {
  const { year, month } = parseYM(m);
  const d = new Date(year, month - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthsBetween(a: string, b: string): number {
  const pa = parseYM(a);
  const pb = parseYM(b);
  return (pb.year - pa.year) * 12 + (pb.month - pa.month);
}

function fmtMonth(m: string): string {
  const { year, month } = parseYM(m);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

interface ChartPoint {
  label: string;
  planned: number;
  actual?: number;
  projected?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 text-xs space-y-1.5 shadow-xl">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-6">
          <span className="text-muted-foreground capitalize">{p.name}</span>
          <span className="font-medium" style={{ color: p.color }}>
            {formatCurrency(p.value, true)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendingDashboard() {
  const { entries, categories } = useTrackerStore();
  const { inputs, results } = useFireStore();

  const { chartData, projectedFIREAge, plannedFIREAge, categoryDeviations } =
    useMemo(() => {
      if (!results)
        return {
          chartData: [] as ChartPoint[],
          projectedFIREAge: null as number | null,
          plannedFIREAge: null as number | null,
          categoryDeviations: [] as { id: string; label: string; color: string; dev: number; devPct: number }[],
        };

      // --- monthly real return from inputs ---
      const annualReal =
        inputs.expectedReturn - inputs.inflationRate;
      const monthlyReal = Math.pow(1 + annualReal, 1 / 12) - 1;

      // --- Sort distinct months from entries ---
      const monthSet = new Set(entries.map((e) => e.month));
      const sortedMonths = Array.from(monthSet).sort();

      if (sortedMonths.length === 0)
        return {
          chartData: [],
          projectedFIREAge: null,
          plannedFIREAge: results.fireAge,
          categoryDeviations: [],
        };

      const startMonth = sortedMonths[0];
      const latestMonth = sortedMonths[sortedMonths.length - 1];

      // --- Build planned NW path starting from currentPortfolio ---
      // planned path grows initial portfolio by real monthly return + adds (afterTaxIncome - currentSpending)/12 each month
      const baseMonthlySavings = (inputs.afterTaxIncome - inputs.currentSpending) / 12;
      const plannedPoints: { month: string; nw: number }[] = [];
      let plannedNW = inputs.currentPortfolio;
      const totalMonths = monthsBetween(startMonth, latestMonth) + 1;

      for (let i = 0; i < totalMonths; i++) {
        const m = addMonths(startMonth, i);
        plannedNW = plannedNW * (1 + monthlyReal) + baseMonthlySavings;
        plannedPoints.push({ month: m, nw: plannedNW });
      }

      // --- Build actual NW path ---
      let actualNW = inputs.currentPortfolio;
      const actualPoints: { month: string; nw: number }[] = [];
      for (const m of sortedMonths) {
        const monthEntries = entries.filter((e) => e.month === m);
        const totalActual = monthEntries.reduce((s, e) => s + e.actual, 0);
        actualNW = actualNW * (1 + monthlyReal) + totalActual;
        actualPoints.push({ month: m, nw: actualNW });
      }

      // --- Project forward 12 months from latest actual ---
      // Use 3-month rolling avg savings to project
      const recentMonths = sortedMonths.slice(-3);
      const avgMonthlySavings =
        recentMonths.reduce((sum, m) => {
          const monthEntries = entries.filter((e) => e.month === m);
          return sum + monthEntries.reduce((s, e) => s + e.actual, 0);
        }, 0) / Math.max(recentMonths.length, 1);

      const projectionPoints: { month: string; nw: number }[] = [];
      let projNW = actualPoints[actualPoints.length - 1]?.nw ?? inputs.currentPortfolio;
      for (let i = 1; i <= 24; i++) {
        const m = addMonths(latestMonth, i);
        projNW = projNW * (1 + monthlyReal) + avgMonthlySavings;
        projectionPoints.push({ month: m, nw: projNW });
      }

      // --- Projected FIRE age ---
      const fireNumber = results.fireNumber;
      let projectedFIREAge: number | null = null;
      const allActualAndProjected = [...actualPoints, ...projectionPoints];
      for (const pt of allActualAndProjected) {
        if (pt.nw >= fireNumber) {
          const mo = monthsBetween(startMonth, pt.month);
          projectedFIREAge = inputs.currentAge + mo / 12;
          break;
        }
      }

      // --- Merge into chart data ---
      const allMonths = new Set([
        ...plannedPoints.map((p) => p.month),
        ...actualPoints.map((p) => p.month),
        ...projectionPoints.map((p) => p.month),
      ]);
      const sortedAll = Array.from(allMonths).sort();

      const plannedMap = Object.fromEntries(plannedPoints.map((p) => [p.month, p.nw]));
      const actualMap = Object.fromEntries(actualPoints.map((p) => [p.month, p.nw]));
      const projMap = Object.fromEntries(projectionPoints.map((p) => [p.month, p.nw]));

      const chartData: ChartPoint[] = sortedAll.map((m) => ({
        label: fmtMonth(m),
        planned: plannedMap[m],
        actual: actualMap[m],
        projected: projMap[m],
      }));

      // --- Per-category deviation (all-time sum) ---
      const categoryDeviations = categories.map((cat) => {
        const catEntries = entries.filter((e) => e.categoryId === cat.id);
        const totalPlanned = catEntries.reduce((s, e) => s + e.planned, 0);
        const totalActual = catEntries.reduce((s, e) => s + e.actual, 0);
        const dev = totalActual - totalPlanned;
        const devPct = totalPlanned > 0 ? dev / totalPlanned : 0;
        return { id: cat.id, label: cat.label, color: cat.color, dev, devPct };
      }).filter((c) => Math.abs(c.dev) > 0);

      return {
        chartData,
        projectedFIREAge,
        plannedFIREAge: results.fireAge,
        categoryDeviations,
      };
    }, [entries, categories, inputs, results]);

  if (!results) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Run the calculator first to see trending analysis.
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Log at least one month of savings in the Monthly Log tab to see trends.
      </div>
    );
  }

  const ageDiff =
    projectedFIREAge != null && plannedFIREAge != null
      ? projectedFIREAge - plannedFIREAge
      : null;

  return (
    <div className="space-y-6">
      {/* FIRE age comparison */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Planned FIRE age</p>
          <p className="text-2xl font-bold text-primary tabular-nums">
            {plannedFIREAge != null ? `Age ${plannedFIREAge.toFixed(1)}` : "—"}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Projected FIRE age</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums",
            projectedFIREAge == null ? "text-muted-foreground" :
            ageDiff != null && ageDiff <= 0 ? "text-success" : "text-destructive"
          )}>
            {projectedFIREAge != null ? `Age ${projectedFIREAge.toFixed(1)}` : "Not reached"}
          </p>
        </div>
        {ageDiff != null && (
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Difference</p>
            <div className={cn(
              "flex items-center gap-1.5 text-2xl font-bold tabular-nums",
              ageDiff <= 0 ? "text-success" : "text-destructive"
            )}>
              {ageDiff === 0 ? (
                <Minus className="w-5 h-5" />
              ) : ageDiff < 0 ? (
                <TrendingDown className="w-5 h-5" />
              ) : (
                <TrendingUp className="w-5 h-5" />
              )}
              {ageDiff > 0 ? "+" : ""}
              {ageDiff.toFixed(1)} yrs
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-semibold mb-1">Net worth trajectory</p>
          <p className="text-xs text-muted-foreground mb-4">
            Planned path vs actual logged savings + 24-month projection
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="plannedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.68 0.15 195)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.68 0.15 195)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.03 265 / 30%)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "oklch(0.55 0.02 265)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "oklch(0.55 0.02 265)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, true)} width={56} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.55 0.02 265)" }} />

              <ReferenceLine
                y={results.fireNumber}
                stroke="oklch(0.76 0.155 75)"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{ value: "FIRE", fill: "oklch(0.76 0.155 75)", fontSize: 10, position: "right" }}
              />

              <Area
                name="Planned"
                type="monotone"
                dataKey="planned"
                stroke="oklch(0.68 0.15 195)"
                strokeWidth={1.5}
                fill="url(#plannedGrad)"
                dot={false}
                activeDot={false}
                connectNulls
              />
              <Line
                name="Actual"
                type="monotone"
                dataKey="actual"
                stroke="oklch(0.65 0.18 150)"
                strokeWidth={2}
                dot={{ r: 3, fill: "oklch(0.65 0.18 150)", strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                connectNulls
              />
              <Line
                name="Projected"
                type="monotone"
                dataKey="projected"
                stroke="oklch(0.76 0.155 75)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                activeDot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-category deviation table */}
      {categoryDeviations.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-semibold mb-3">Per-category insights (all-time)</p>
          <div className="space-y-1">
            {categoryDeviations
              .sort((a, b) => b.dev - a.dev)
              .map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between text-xs py-2 border-b border-border/20 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: cat.color }}
                    />
                    <span className="text-muted-foreground">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span className={cn(
                      "font-medium",
                      cat.dev > 0 ? "text-success" : "text-destructive"
                    )}>
                      {cat.dev > 0 ? "+" : ""}{formatCurrency(cat.dev, true)}
                    </span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      cat.dev > 0
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {cat.devPct > 0 ? "+" : ""}
                      {(cat.devPct * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
