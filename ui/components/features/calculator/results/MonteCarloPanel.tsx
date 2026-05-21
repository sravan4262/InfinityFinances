"use client";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { FireCurrency, MonteCarloResults, HistoricalSequenceResult } from "@/lib/engine/types";
import { AlertTriangle, CheckCircle2, TrendingDown, Shuffle } from "lucide-react";

interface Props {
  mc: MonteCarloResults;
  historicalResults: HistoricalSequenceResult[];
  retirementAge: number;
  lifeExpectancy: number;
  currency?: FireCurrency;
}

// ── Success rate ring ─────────────────────────────────────────────────────────

function SuccessRing({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color =
    pct >= 90 ? "oklch(0.65 0.18 150)"   // green
    : pct >= 75 ? "oklch(0.76 0.155 75)"  // amber
    : "oklch(0.65 0.20 25)";              // red

  return (
    <div className="relative flex items-center justify-center">
      <svg width={92} height={92} className="-rotate-90">
        <circle cx={46} cy={46} r={r} fill="none" stroke="oklch(0.22 0.03 265)" strokeWidth={7} />
        <circle
          cx={46} cy={46} r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
          {pct}%
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5">success</p>
      </div>
    </div>
  );
}

// ── Sequence risk meter ───────────────────────────────────────────────────────

function SequenceRiskMeter({ score }: { score: number }) {
  // score = p10/p50 at retirement; 0.5 = bad (half the median), 0.8 = ok
  const risk = 1 - Math.max(0, Math.min(1, score));
  const riskPct = Math.round(risk * 100);
  const label = riskPct >= 70 ? "High" : riskPct >= 40 ? "Moderate" : "Low";
  const color =
    riskPct >= 70 ? "oklch(0.65 0.20 25)"
    : riskPct >= 40 ? "oklch(0.76 0.155 75)"
    : "oklch(0.65 0.18 150)";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Sequence-of-returns risk</span>
        <span className="font-semibold" style={{ color }}>{label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${riskPct}%`, background: color }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        p10 portfolio at retirement is {Math.round(score * 100)}% of the median —
        {riskPct >= 70
          ? " severe sequence risk. Consider a bond tent or cash buffer."
          : riskPct >= 40
          ? " moderate risk. A 1–2 year cash reserve would help."
          : " low risk. Your taxable bridge provides a good cushion."}
      </p>
    </div>
  );
}

// ── Historical stress table ───────────────────────────────────────────────────

function HistoricalTable({
  results,
  lifeExpectancy,
  retirementAge,
  currency,
}: {
  results: HistoricalSequenceResult[];
  lifeExpectancy: number;
  retirementAge: number;
  currency?: FireCurrency;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Historical sequence stress test
      </p>
      <p className="text-[10px] text-muted-foreground">
        Your withdrawal plan applied to actual return sequences from major historical periods.
      </p>
      <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
        {/* Header */}
        <div className="grid grid-cols-[1fr_56px_90px_72px] sm:grid-cols-[1fr_80px_100px_80px] text-[10px] text-muted-foreground px-3 py-2 bg-muted/20 border-b border-border/30 uppercase tracking-wide min-w-[340px]">
          <span>Period</span>
          <span className="text-center">OK?</span>
          <span className="text-right">End value</span>
          <span className="text-right">Depletes</span>
        </div>
        {results.map((r) => (
          <div
            key={r.scenario.shortLabel}
            className="grid grid-cols-[1fr_56px_90px_72px] sm:grid-cols-[1fr_80px_100px_80px] items-center px-3 py-2.5 border-b border-border/15 last:border-0 hover:bg-muted/10 min-w-[340px]"
          >
            <div>
              <p className="text-xs font-medium">{r.scenario.shortLabel}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{r.scenario.description.split(".")[0]}</p>
            </div>
            <div className="flex justify-center">
              {r.survived ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-destructive" />
              )}
            </div>
            <p className="text-xs tabular-nums text-right font-medium">
              {r.survived ? formatCurrency(r.portfolioAtEnd, true, currency) : "—"}
            </p>
            <p className={cn(
              "text-xs tabular-nums text-right",
              r.depletionAge ? "text-destructive" : "text-muted-foreground"
            )}>
              {r.depletionAge ? `Age ${r.depletionAge}` : `${lifeExpectancy}+`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function MonteCarloPanel({
  mc,
  historicalResults,
  retirementAge,
  lifeExpectancy,
  currency,
}: Props) {
  const successPct = Math.round(mc.successRate * 100);
  const retRow = mc.percentileRows.find((r) => r.age >= retirementAge);
  const endRow = mc.percentileRows.find((r) => r.age >= lifeExpectancy);

  return (
    <div className="glass rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shuffle className="w-4 h-4 text-primary" />
        <div>
          <p className="text-sm font-semibold">How Certain Is Your FIRE?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mc.numTrials.toLocaleString()} randomized simulations · σ = {(mc.annualVolatility * 100).toFixed(1)}% annual volatility
          </p>
        </div>
      </div>

      {/* Top row: ring + key stats */}
      <div className="flex items-center gap-5 flex-wrap">
        <SuccessRing rate={mc.successRate} />
        <div className="flex-1 space-y-2 min-w-[200px]">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-muted/20 p-2.5">
              <p className="text-muted-foreground mb-0.5">Median at retirement</p>
              <p className="font-semibold tabular-nums text-sm">
                {retRow ? formatCurrency(retRow.p50, true, currency) : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/20 p-2.5">
              <p className="text-muted-foreground mb-0.5">p10 at retirement</p>
              <p className="font-semibold tabular-nums text-sm text-destructive/80">
                {retRow ? formatCurrency(retRow.p10, true, currency) : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/20 p-2.5">
              <p className="text-muted-foreground mb-0.5">Median end of life</p>
              <p className="font-semibold tabular-nums text-sm">
                {endRow ? formatCurrency(endRow.p50, true, currency) : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/20 p-2.5">
              <p className="text-muted-foreground mb-0.5">Worst depletion age</p>
              <p className={cn(
                "font-semibold tabular-nums text-sm",
                mc.worstCaseDepletionAge ? "text-destructive/80" : "text-success"
              )}>
                {mc.worstCaseDepletionAge ? `Age ${mc.worstCaseDepletionAge}` : `${lifeExpectancy}+`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success callout */}
      {successPct >= 90 ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-3 flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-success font-medium">{successPct}% success rate.</span>{" "}
            Your plan survives in the vast majority of randomized scenarios. You're in excellent shape.
          </p>
        </div>
      ) : successPct >= 75 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-warning font-medium">{successPct}% success rate.</span>{" "}
            Reasonable but not bulletproof — consider a small spending buffer or one extra year of savings.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
          <TrendingDown className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-destructive font-medium">{successPct}% success rate.</span>{" "}
            High risk of portfolio depletion. Increase savings, reduce spending, or delay retirement by a few years.
          </p>
        </div>
      )}

      {/* Sequence risk meter */}
      <SequenceRiskMeter score={mc.sequenceRiskScore} />

      {/* Sequence risk explainer */}
      <div className="rounded-xl border border-border bg-muted/10 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-warning" />
          What is sequence-of-returns risk?
        </p>
        <p>
          Even with identical average returns, retiring into a bear market forces you to sell assets
          at low prices to fund spending. Those sold shares can't participate in the eventual recovery —
          permanently shrinking your portfolio. The p10 fan band shows the "bad luck" scenario.
        </p>
        <p className="mt-1">
          <span className="text-foreground font-medium">Mitigations:</span> a 1–2 year cash buffer,
          a bond tent (higher bonds at retirement, then glide back to equities), or flexible spending
          (reduce withdrawals 10–15% in down years).
        </p>
      </div>

      {/* Historical stress test */}
      <HistoricalTable
        results={historicalResults}
        lifeExpectancy={lifeExpectancy}
        retirementAge={retirementAge}
        currency={currency}
      />
    </div>
  );
}
