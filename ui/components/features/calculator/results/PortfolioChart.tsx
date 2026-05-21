"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import type { FireCurrency, YearlyRow } from "@/lib/engine/types";
import type { MonteCarloPercentileRow } from "@/lib/engine/types";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";

interface PortfolioChartProps {
  rows: YearlyRow[];
  fireNumber: number;
  fireAge: number | null;
  retirementAge: number;
  whatIfRows?: YearlyRow[];
  whatIfFireAge?: number | null;
  monteCarloRows?: MonteCarloPercentileRow[];
  currency?: FireCurrency;
}

type ChartRow = YearlyRow & {
  whatIfPortfolio?: number | null;
  mcP10?: number; mcP25?: number; mcP50?: number; mcP75?: number; mcP90?: number;
};

const BG_FILL = "oklch(0.07 0.025 265)";

function CustomTooltip({ active, payload, currency }: any) {
  if (!active || !payload?.length) return null;
  const row: ChartRow = payload[0].payload;
  const hasWhatIf = row.whatIfPortfolio != null;
  const hasMC = row.mcP50 != null;
  return (
    <div className="glass rounded-xl p-3 text-xs space-y-1.5 shadow-xl min-w-[160px]">
      <p className="font-semibold text-foreground">Age {row.age} · {row.year}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Base</span>
          <span className="font-medium text-primary">{formatCurrency(row.portfolio, true, currency)}</span>
        </div>
        {hasWhatIf && (
          <>
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">What-if</span>
              <span className="font-medium text-gold">{formatCurrency(row.whatIfPortfolio!, true, currency)}</span>
            </div>
            <div className="flex justify-between gap-6 border-t border-border/40 pt-1">
              <span className="text-muted-foreground">Δ</span>
              <span className={row.whatIfPortfolio! >= row.portfolio ? "text-success font-medium" : "text-destructive font-medium"}>
                {row.whatIfPortfolio! >= row.portfolio ? "+" : ""}
                {formatCurrency(row.whatIfPortfolio! - row.portfolio, true, currency)}
              </span>
            </div>
          </>
        )}
        {hasMC && (
          <div className="border-t border-border/40 pt-1 space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Monte Carlo</p>
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">p90</span>
              <span className="font-medium text-cyan-300">{formatCurrency(row.mcP90!, true, currency)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">median</span>
              <span className="font-medium">{formatCurrency(row.mcP50!, true, currency)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">p10</span>
              <span className="font-medium text-destructive/80">{formatCurrency(row.mcP10!, true, currency)}</span>
            </div>
          </div>
        )}
        {!row.isRetired && row.annualSavings > 0 && (
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Saved</span>
            <span className="font-medium text-success">{formatCurrency(row.annualSavings, true, currency)}</span>
          </div>
        )}
        {row.isFire && (
          <p className="text-success font-semibold pt-0.5">🔥 FIRE achieved</p>
        )}
      </div>
    </div>
  );
}

export function PortfolioChart({
  rows,
  fireNumber,
  fireAge,
  retirementAge,
  whatIfRows,
  whatIfFireAge,
  monteCarloRows,
  currency,
}: PortfolioChartProps) {
  const hasWhatIf = !!whatIfRows?.length;
  const hasMC = !!monteCarloRows?.length;

  // Build mc lookup by age
  const mcByAge = new Map<number, MonteCarloPercentileRow>();
  if (hasMC) {
    for (const r of monteCarloRows!) mcByAge.set(r.age, r);
  }

  const chartData: ChartRow[] = rows.map((row, i) => ({
    ...row,
    whatIfPortfolio: whatIfRows ? (whatIfRows[i]?.portfolio ?? null) : undefined,
    ...(hasMC && mcByAge.has(row.age)
      ? {
          mcP10: mcByAge.get(row.age)!.p10,
          mcP25: mcByAge.get(row.age)!.p25,
          mcP50: mcByAge.get(row.age)!.p50,
          mcP75: mcByAge.get(row.age)!.p75,
          mcP90: mcByAge.get(row.age)!.p90,
        }
      : {}),
  }));

  const maxBase = Math.max(...rows.map((r) => r.portfolio));
  const maxWhatIf = whatIfRows ? Math.max(...whatIfRows.map((r) => r.portfolio)) : 0;
  const maxMC = hasMC ? Math.max(...monteCarloRows!.map((r) => r.p90)) : 0;
  const yDomain = [0, Math.max(maxBase, maxWhatIf, maxMC, fireNumber) * 1.1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="glass rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold">Portfolio growth</p>
          <p className="text-xs text-muted-foreground mt-0.5">Year-by-year projection</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-primary inline-block rounded-full" />
            Base
          </span>
          {hasWhatIf && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-gold inline-block rounded-full" style={{ borderTop: "2px dashed oklch(0.76 0.155 75)" }} />
              What-if
            </span>
          )}
          {hasMC && (
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-3 rounded-sm inline-block" style={{ background: "oklch(0.68 0.15 195 / 25%)", border: "1px solid oklch(0.68 0.15 195 / 50%)" }} />
              p10–p90
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-gold inline-block" />
            FIRE target
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.68 0.15 195)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="oklch(0.68 0.15 195)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="whatIfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.76 0.155 75)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="oklch(0.76 0.155 75)" stopOpacity={0.01} />
            </linearGradient>
            {/* MC outer band gradient */}
            <linearGradient id="mcOuterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.68 0.15 195)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="oklch(0.68 0.15 195)" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="mcInnerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.68 0.15 195)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="oklch(0.68 0.15 195)" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="oklch(0.22 0.03 265 / 30%)"
            vertical={false}
          />
          <XAxis
            dataKey="age"
            tick={{ fill: "oklch(0.55 0.02 265)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={yDomain}
            tick={{ fill: "oklch(0.55 0.02 265)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatCurrency(v, true, currency)}
            width={52}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />

          {/* FIRE target reference */}
          <ReferenceLine
            y={fireNumber}
            stroke="oklch(0.76 0.155 75)"
            strokeDasharray="5 4"
            strokeWidth={1.5}
          />

          {/* Retirement age line */}
          {retirementAge && (
            <ReferenceLine
              x={retirementAge}
              stroke="oklch(0.68 0.15 195 / 50%)"
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: "Retire", fill: "oklch(0.68 0.15 195)", fontSize: 10, position: "top" }}
            />
          )}

          {/* What-if FIRE age marker */}
          {hasWhatIf && whatIfFireAge && whatIfFireAge !== fireAge && (
            <ReferenceLine
              x={Math.round(whatIfFireAge)}
              stroke="oklch(0.76 0.155 75 / 60%)"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ value: "W-I FIRE", fill: "oklch(0.76 0.155 75)", fontSize: 9, position: "top" }}
            />
          )}

          {/* ── Monte Carlo fan bands (behind base line) ── */}
          {hasMC && (
            <>
              {/* p90 outer fill (will be "clipped" by p10 background fill below) */}
              <Area
                type="monotone"
                dataKey="mcP90"
                stroke="none"
                fill="url(#mcOuterGrad)"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
                legendType="none"
              />
              {/* p10 fill with background to erase bottom of outer band */}
              <Area
                type="monotone"
                dataKey="mcP10"
                stroke="none"
                fill={BG_FILL}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
                legendType="none"
              />
              {/* p75 inner fill */}
              <Area
                type="monotone"
                dataKey="mcP75"
                stroke="none"
                fill="url(#mcInnerGrad)"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
                legendType="none"
              />
              {/* p25 fill with background to erase inner bottom */}
              <Area
                type="monotone"
                dataKey="mcP25"
                stroke="none"
                fill={BG_FILL}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
                legendType="none"
              />
              {/* Median (p50) dashed line */}
              <Line
                type="monotone"
                dataKey="mcP50"
                stroke="oklch(0.68 0.15 195 / 55%)"
                strokeWidth={1}
                strokeDasharray="3 2"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
                legendType="none"
              />
            </>
          )}

          {/* What-if area (behind base) */}
          {hasWhatIf && (
            <Area
              type="monotone"
              dataKey="whatIfPortfolio"
              stroke="oklch(0.76 0.155 75)"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              fill="url(#whatIfGradient)"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* Base portfolio area — always on top */}
          <Area
            type="monotone"
            dataKey="portfolio"
            stroke="oklch(0.68 0.15 195)"
            strokeWidth={2}
            fill="url(#portfolioGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "oklch(0.68 0.15 195)", stroke: "oklch(0.07 0.025 265)", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
