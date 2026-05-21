"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useFireStore } from "@/lib/store";
import { mergeInputs } from "@/lib/engine/merge";
import { StatCard } from "./StatCard";
import { PortfolioChart } from "./PortfolioChart";
import { FireVariants } from "./FireVariants";
import { YearlyTable } from "./YearlyTable";
import { SensitivityTable } from "./SensitivityTable";
import { WhatIfPanel } from "./WhatIfPanel";
import { AccountSequencingPanel } from "./AccountSequencingPanel";
import { MonteCarloPanel } from "./MonteCarloPanel";
import { FireCelebration } from "./FireCelebration";
import { ShareButton } from "./ShareButton";
import { SavePlanButton } from "@/components/features/plans/SavePlanButton";
import { useChatContextStore } from "@/lib/chatContextStore";
import { runMonteCarlo } from "@/lib/engine/monteCarlo";
import { HISTORICAL_SCENARIOS, runHistoricalSequence } from "@/lib/engine/historicalSequences";
import { formatCurrency, formatPct } from "@/lib/utils";
import type { FireResults, MonteCarloResults, HistoricalSequenceResult, FireInputs } from "@/lib/engine/types";
import {
  Flame, Target, Clock, TrendingUp, AlertTriangle,
  Hourglass, Shield, ArrowUpRight, Pencil, Shuffle, Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

type ResultView = "you" | "spouse" | "combined";

export function ResultsDashboard() {
  const { results, inputs, editInputs, includeSpouse, spouseInputs, spouseResults, unifiedResults } = useFireStore();
  const setChatContext = useChatContextStore((s) => s.setContext);
  const clearChatContext = useChatContextStore((s) => s.clearContext);
  const [view, setView] = useState<ResultView>("you");
  const [whatIfResults, setWhatIfResults] = useState<FireResults | null>(null);
  const [mcEnabled, setMcEnabled] = useState(false);
  const [mcRunning, setMcRunning] = useState(false);
  const [mcResults, setMcResults] = useState<MonteCarloResults | null>(null);
  const [historicalResults, setHistoricalResults] = useState<HistoricalSequenceResult[]>([]);

  // When view changes, reset what-if and MC
  useEffect(() => {
    setWhatIfResults(null);
    setMcEnabled(false);
    setMcResults(null);
    setHistoricalResults([]);
  }, [view]);

  // Determine active results / inputs based on view
  const activeResults: FireResults | null =
    view === "spouse" ? spouseResults :
    view === "combined" ? unifiedResults :
    results;

  const activeInputs: FireInputs = useMemo(() => {
    if (view === "spouse") return spouseInputs;
    if (view === "combined") return mergeInputs(inputs, spouseInputs);
    return inputs;
  }, [view, inputs, spouseInputs]);

  const handleWhatIfChange = useCallback((r: FireResults | null) => {
    setWhatIfResults(r);
  }, []);

  useEffect(() => {
    setChatContext("retirement", {
      inputs: activeInputs as unknown as Record<string, unknown>,
      results: (activeResults ?? undefined) as unknown as Record<string, unknown> | undefined,
    });
    return () => clearChatContext("retirement");
  }, [activeInputs, activeResults, setChatContext, clearChatContext]);

  // Run MC when enabled
  useEffect(() => {
    if (!mcEnabled || !activeResults) {
      setMcResults(null);
      setHistoricalResults((prev) => prev.length > 0 ? [] : prev);
      return;
    }
    setMcRunning(true);
    const id = setTimeout(() => {
      const mc = runMonteCarlo(activeInputs);
      const hist = HISTORICAL_SCENARIOS.map((s) => runHistoricalSequence(activeInputs, s));
      setMcResults(mc);
      setHistoricalResults(hist);
      setMcRunning(false);
    }, 0);
    return () => clearTimeout(id);
  }, [mcEnabled, activeResults, activeInputs]);

  if (!results) return null;
  if (!activeResults) return null;

  const realAnnualReturn = (1 + activeInputs.expectedReturn) / (1 + activeInputs.inflationRate) - 1;
  const currency = activeInputs.currency ?? inputs.currency ?? "USD";
  const money = (value: number, compact = false) => formatCurrency(value, compact, currency);

  const fireAgeDisplay = activeResults.fireAge ? `Age ${activeResults.fireAge}` : "Not reached";
  const yearsDisplay = activeResults.yearsToFire ? `${activeResults.yearsToFire} yrs` : "—";
  const gapPositive = activeResults.gapAtTargetAge >= 0;

  const monthlyRetirementSalary =
    activeInputs.monthlyRetirementSalary ?? activeInputs.retirementSpending / 12;
  const pvLabel = activeResults.requiredCorpusPV > 0
    ? money(activeResults.requiredCorpusPV)
    : "—";
  const depletionDisplay = activeResults.depletionAge
    ? `Age ${activeResults.depletionAge}`
    : `${activeInputs.lifeExpectancy}+`;
  const nominalMonthly = activeResults.nominalRetirementSalary;

  const viewLabel =
    view === "spouse" ? "Spouse's FIRE plan" :
    view === "combined" ? "Combined household plan" :
    "Your FIRE plan";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16">
      {/* FIRE celebration — renders once if fireAge is set */}
      <FireCelebration fireAge={activeResults.fireAge} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-4 space-y-3"
      >
        {/* You / Spouse / Combined view switcher */}
        {includeSpouse && spouseResults && (
          <div className="flex justify-center">
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(["you", "spouse", "combined"] as ResultView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    view === v
                      ? "bg-background text-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "you" ? "You" : v === "spouse" ? "Spouse" : "Combined"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons row */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setMcEnabled((v) => !v)}
            className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-2.5 transition-colors ${
              mcEnabled
                ? "text-primary border-primary/50 bg-primary/10 hover:bg-primary/15"
                : "text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {mcRunning
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Shuffle className="w-3.5 h-3.5" />}
            Certainty Check
          </button>
          <ShareButton results={activeResults} inputs={activeInputs} />
          <SavePlanButton inputs={activeInputs} />
          <button
            onClick={editInputs}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 rounded-lg px-3 py-2.5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
            {viewLabel}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-primary tabular-nums">
            {money(activeResults.fireNumber)}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Withdrawal-rate target · PV corpus{" "}
            <span className="text-foreground font-medium">{pvLabel}</span>
          </p>
          {/* MC success rate badge */}
          {mcResults && !mcRunning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{
                borderColor: mcResults.successRate >= 0.9 ? "oklch(0.65 0.18 150 / 50%)" : mcResults.successRate >= 0.75 ? "oklch(0.76 0.155 75 / 50%)" : "oklch(0.65 0.20 25 / 50%)",
                background: mcResults.successRate >= 0.9 ? "oklch(0.65 0.18 150 / 10%)" : mcResults.successRate >= 0.75 ? "oklch(0.76 0.155 75 / 10%)" : "oklch(0.65 0.20 25 / 10%)",
                color: mcResults.successRate >= 0.9 ? "oklch(0.65 0.18 150)" : mcResults.successRate >= 0.75 ? "oklch(0.76 0.155 75)" : "oklch(0.65 0.20 25)",
              }}
            >
              <Shuffle className="w-3 h-3" />
              {Math.round(mcResults.successRate * 100)}% chance of not running out
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="FIRE number"
          value={money(activeResults.fireNumber)}
          gold
          delay={0}
          icon={<Flame className="w-4 h-4" />}
        />
        <StatCard
          label="Retire at"
          value={fireAgeDisplay}
          subValue={
            activeResults.fireAge
              ? `Year ${new Date().getFullYear() + Math.round(activeResults.fireAge - activeInputs.currentAge)}`
              : undefined
          }
          highlight
          delay={0.06}
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="Years to FIRE"
          value={yearsDisplay}
          subValue={`From age ${activeInputs.currentAge}`}
          delay={0.12}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Savings rate"
          value={formatPct(activeResults.currentSavingsRate)}
          subValue="of after-tax income"
          delay={0.18}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="PV corpus needed"
          value={pvLabel}
          subValue={`${money(monthlyRetirementSalary)}/mo target`}
          delay={0.24}
          icon={<Shield className="w-4 h-4" />}
        />
        <StatCard
          label="Money lasts until"
          value={depletionDisplay}
          subValue={activeResults.depletionAge ? "corpus depletes" : "past life expectancy"}
          delay={0.30}
          icon={<Hourglass className="w-4 h-4" />}
        />
      </div>

      {/* Nominal salary callout */}
      {nominalMonthly > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.34 }}
          className="rounded-xl border border-border bg-muted/20 p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <ArrowUpRight className="w-4 h-4 text-gold shrink-0" />
            <div className="text-sm">
              <p className="font-medium">
                Today&apos;s{" "}
                <span className="text-primary">{money(monthlyRetirementSalary)}/mo</span>{" "}
                target =
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inflation-adjusted at age {activeInputs.retirementAge}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-gold tabular-nums">
              {money(nominalMonthly)}/mo
            </p>
            <p className="text-xs text-muted-foreground">nominal</p>
          </div>
        </motion.div>
      )}

      {/* Gap alerts */}
      {!gapPositive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.38 }}
          className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-warning">Shortfall at target retirement age</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {view === "spouse" ? "Spouse will be" : "You'll be"}{" "}
              <span className="text-foreground font-medium">
                {money(Math.abs(activeResults.gapAtTargetAge))}
              </span>{" "}
              short of the FIRE number at age {activeInputs.retirementAge}.{" "}
              {activeResults.fireAge
                ? `FIRE is reached at age ${activeResults.fireAge} instead.`
                : "Consider increasing savings or reducing spending."}
            </p>
          </div>
        </motion.div>
      )}
      {gapPositive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.38 }}
          className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3"
        >
          <span className="text-lg">🎉</span>
          <div className="text-sm">
            <p className="font-medium text-success">On track — with a cushion!</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              At age {activeInputs.retirementAge},{" "}
              {view === "combined" ? "the household" : view === "spouse" ? "spouse" : "you"}{" "}
              will have{" "}
              <span className="text-foreground font-medium">
                {money(activeResults.gapAtTargetAge)}
              </span>{" "}
              more than the FIRE number. That&apos;s a{" "}
              {formatPct(activeResults.gapAtTargetAge / activeResults.fireNumber)} buffer.
            </p>
          </div>
        </motion.div>
      )}

      {/* PV vs WR callout */}
      {Math.abs(activeResults.requiredCorpusPV - activeResults.fireNumber) / activeResults.fireNumber > 0.05 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.44 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"
        >
          <p className="font-medium text-primary mb-1">Withdrawal-rate vs PV corpus</p>
          <p className="text-muted-foreground text-xs">
            The 4% rule gives{" "}
            <span className="text-foreground font-medium">{money(activeResults.fireNumber)}</span>.
            The PV formula — funding{" "}
            <span className="text-foreground font-medium">
              {money(monthlyRetirementSalary)}/mo
            </span>{" "}
            for {activeInputs.lifeExpectancy - activeInputs.retirementAge} years — gives{" "}
            <span className="text-foreground font-medium">{pvLabel}</span>.
            {activeResults.requiredCorpusPV < activeResults.fireNumber
              ? " PV says you need less; the 4% rule is more conservative."
              : " PV says you need more; a lower real return demands a larger corpus."}
          </p>
        </motion.div>
      )}

      {/* Chart */}
      <PortfolioChart
        rows={activeResults.yearlyRows}
        fireNumber={activeResults.fireNumber}
        fireAge={activeResults.fireAge}
        retirementAge={activeInputs.retirementAge}
        whatIfRows={whatIfResults?.yearlyRows}
        whatIfFireAge={whatIfResults?.fireAge}
        monteCarloRows={mcResults?.percentileRows}
        currency={currency}
      />

      {/* What-if explorer */}
      <WhatIfPanel
        baseInputs={activeInputs}
        baseResults={activeResults}
        onWhatIfChange={handleWhatIfChange}
      />

      {/* Monte Carlo panel */}
      {mcResults && !mcRunning && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MonteCarloPanel
            mc={mcResults}
            historicalResults={historicalResults}
            retirementAge={activeInputs.retirementAge}
            lifeExpectancy={activeInputs.lifeExpectancy}
            currency={currency}
          />
        </motion.div>
      )}

      {/* Account sequencing */}
      <AccountSequencingPanel
        seq={activeResults.accountSequencing}
        retirementAge={activeInputs.retirementAge}
        currency={currency}
      />

      {/* FIRE variants */}
      <div className="glass rounded-2xl p-5">
        <FireVariants
          results={activeResults}
          currentAge={activeInputs.currentAge}
          realAnnualReturn={realAnnualReturn}
          currency={currency}
        />
      </div>

      {/* Retirement age sensitivity table */}
      {activeResults.retirementSensitivity?.length > 0 && (
        <SensitivityTable
          rows={activeResults.retirementSensitivity}
          plannedRetirementAge={activeInputs.retirementAge}
          currency={currency}
        />
      )}

      {/* Year-by-year table */}
      <YearlyTable rows={activeResults.yearlyRows} fireAge={activeResults.fireAge} currency={currency} />
    </div>
  );
}
