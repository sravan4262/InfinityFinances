"use client";
import { useState, useMemo, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { formatCurrency, formatPct } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { calculateFireMonthly } from "@/lib/engine/monthly";
import type { FireCurrency, FireInputs, FireResults } from "@/lib/engine/types";
import { RotateCcw, Zap } from "lucide-react";

interface Props {
  baseInputs: FireInputs;
  baseResults: FireResults;
  onWhatIfChange: (results: FireResults | null) => void;
}

function Delta({
  label,
  base,
  override,
  format = "currency",
  higherIsBetter = true,
  currency,
}: {
  label: string;
  base: number | null;
  override: number | null;
  format?: "currency" | "age" | "years";
  higherIsBetter?: boolean;
  currency?: FireCurrency;
}) {
  if (base === null || override === null) return null;
  const diff = override - base;
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  const neutral = Math.abs(diff) < 0.05;

  const fmt = (v: number) => {
    if (format === "currency") return formatCurrency(v, true, currency);
    if (format === "age") return `Age ${v.toFixed(1)}`;
    return `${v.toFixed(1)} yrs`;
  };

  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 tabular-nums">
        <span className="text-muted-foreground/60">{fmt(base)}</span>
        <span className="text-muted-foreground">→</span>
        <span className={cn(
          "font-semibold",
          neutral ? "text-foreground" : improved ? "text-success" : "text-destructive"
        )}>
          {fmt(override)}
        </span>
        {!neutral && (
          <span className={cn(
            "text-[10px]",
            improved ? "text-success" : "text-destructive"
          )}>
            ({diff > 0 ? "+" : ""}
            {format === "currency"
              ? formatCurrency(diff, true, currency)
              : diff.toFixed(1)}
            )
          </span>
        )}
      </div>
    </div>
  );
}

export function WhatIfPanel({ baseInputs, baseResults, onWhatIfChange }: Props) {
  const currency = baseInputs.currency ?? "USD";
  const baseMonthlyRetirementSalary =
    baseInputs.monthlyRetirementSalary ?? baseInputs.retirementSpending / 12;
  const baseMonthlySavings = (baseInputs.afterTaxIncome - baseInputs.currentSpending) / 12;

  // Slider state — starts at base values
  const [returnRate, setReturnRate] = useState(baseInputs.expectedReturn * 100);
  const [spending, setSpending] = useState(baseMonthlyRetirementSalary);
  const [savings, setSavings] = useState(Math.max(0, baseMonthlySavings));
  const [retirementAge, setRetirementAge] = useState(baseInputs.retirementAge);

  // Reset to base when baseInputs change
  useEffect(() => {
    setReturnRate(baseInputs.expectedReturn * 100);
    setSpending(baseMonthlyRetirementSalary);
    setSavings(Math.max(0, baseMonthlySavings));
    setRetirementAge(baseInputs.retirementAge);
  }, [baseInputs, baseMonthlyRetirementSalary, baseMonthlySavings]);

  const isUnchanged =
    Math.abs(returnRate / 100 - baseInputs.expectedReturn) < 0.0005 &&
    Math.abs(spending - baseMonthlyRetirementSalary) < 1 &&
    Math.abs(savings - Math.max(0, baseMonthlySavings)) < 1 &&
    retirementAge === baseInputs.retirementAge;

  // Recompute what-if on every slider change
  const whatIfResults = useMemo<FireResults | null>(() => {
    if (isUnchanged) return null;
    const overriddenInputs: FireInputs = {
      ...baseInputs,
      expectedReturn: returnRate / 100,
      // override the blended asset returns proportionally
      assets: baseInputs.assets.map((a) => ({
        ...a,
        annualReturn: a.annualReturn + (returnRate / 100 - baseInputs.expectedReturn),
      })),
      monthlyRetirementSalary: spending,
      retirementSpending: spending * 12,
      afterTaxIncome:
        baseInputs.afterTaxIncome - Math.max(0, baseMonthlySavings) * 12 + savings * 12,
      currentSpending:
        baseInputs.currentSpending + Math.max(0, baseMonthlySavings) * 12 - savings * 12,
      retirementAge,
    };
    return calculateFireMonthly(overriddenInputs);
  }, [returnRate, spending, savings, retirementAge, baseInputs, isUnchanged, baseMonthlySavings]);

  // Notify parent whenever what-if changes
  useEffect(() => {
    onWhatIfChange(whatIfResults);
  }, [whatIfResults, onWhatIfChange]);

  const reset = () => {
    setReturnRate(baseInputs.expectedReturn * 100);
    setSpending(baseMonthlyRetirementSalary);
    setSavings(Math.max(0, baseMonthlySavings));
    setRetirementAge(baseInputs.retirementAge);
  };

  const minSavings = 0;
  const maxSavings = Math.max(baseMonthlySavings * 3, 5000);

  return (
    <div className="glass rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-gold" />
          <div>
            <p className="text-sm font-semibold">What-if explorer</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag sliders — the chart updates live
            </p>
          </div>
        </div>
        {!isUnchanged && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Sliders grid */}
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
        {/* Expected return */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Expected return (nominal)</span>
            <span className={cn(
              "font-semibold tabular-nums",
              !isUnchanged && returnRate / 100 !== baseInputs.expectedReturn
                ? returnRate / 100 > baseInputs.expectedReturn ? "text-success" : "text-destructive"
                : "text-foreground"
            )}>
              {returnRate.toFixed(1)}%
            </span>
          </div>
          <Slider
            value={[returnRate]}
            onValueChange={(v) => setReturnRate(Array.isArray(v) ? (v as number[])[0] : (v as number))}
            min={1} max={15} step={0.5}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/50">
            <span>1%</span><span>Base: {(baseInputs.expectedReturn * 100).toFixed(1)}%</span><span>15%</span>
          </div>
        </div>

        {/* Retirement age */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Target retirement age</span>
            <span className={cn(
              "font-semibold tabular-nums",
              retirementAge !== baseInputs.retirementAge
                ? retirementAge < baseInputs.retirementAge ? "text-success" : "text-destructive"
                : "text-foreground"
            )}>
              {retirementAge}
            </span>
          </div>
          <Slider
            value={[retirementAge]}
            onValueChange={(v) => setRetirementAge(Array.isArray(v) ? (v as number[])[0] : (v as number))}
            min={baseInputs.currentAge + 1} max={75} step={1}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/50">
            <span>{baseInputs.currentAge + 1}</span>
            <span>Base: {baseInputs.retirementAge}</span>
            <span>75</span>
          </div>
        </div>

        {/* Monthly retirement spending */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Monthly retirement salary</span>
            <span className={cn(
              "font-semibold tabular-nums",
              Math.abs(spending - baseMonthlyRetirementSalary) > 1
                ? spending < baseMonthlyRetirementSalary ? "text-success" : "text-destructive"
                : "text-foreground"
            )}>
              {formatCurrency(spending, true, currency)}/mo
            </span>
          </div>
          <Slider
            value={[spending]}
            onValueChange={(v) => setSpending(Array.isArray(v) ? (v as number[])[0] : (v as number))}
            min={Math.round(baseMonthlyRetirementSalary * 0.4)}
            max={Math.round(baseMonthlyRetirementSalary * 2)}
            step={100}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/50">
            <span>40%</span>
            <span>Base: {formatCurrency(baseMonthlyRetirementSalary, true, currency)}/mo</span>
            <span>200%</span>
          </div>
        </div>

        {/* Monthly savings */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Monthly savings</span>
            <span className={cn(
              "font-semibold tabular-nums",
              Math.abs(savings - Math.max(0, baseMonthlySavings)) > 1
                ? savings > Math.max(0, baseMonthlySavings) ? "text-success" : "text-destructive"
                : "text-foreground"
            )}>
              {formatCurrency(savings, true, currency)}/mo
            </span>
          </div>
          <Slider
            value={[savings]}
            onValueChange={(v) => setSavings(Array.isArray(v) ? (v as number[])[0] : (v as number))}
            min={minSavings}
            max={Math.round(maxSavings)}
            step={100}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/50">
            <span>{formatCurrency(0, true, currency)}</span>
            <span>Base: {formatCurrency(Math.max(0, baseMonthlySavings), true, currency)}/mo</span>
            <span>{formatCurrency(maxSavings, true, currency)}</span>
          </div>
        </div>
      </div>

      {/* Delta summary */}
      {whatIfResults && !isUnchanged && (
        <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 space-y-0.5">
          <p className="text-xs font-medium text-gold mb-2">Impact vs base</p>
          <Delta
            label="FIRE number"
            base={baseResults.fireNumber}
            override={whatIfResults.fireNumber}
            format="currency"
            higherIsBetter={false}
            currency={currency}
          />
          <Delta
            label="FIRE age"
            base={baseResults.fireAge}
            override={whatIfResults.fireAge}
            format="age"
            higherIsBetter={false}
          />
          <Delta
            label="Years to FIRE"
            base={baseResults.yearsToFire}
            override={whatIfResults.yearsToFire}
            format="years"
            higherIsBetter={false}
          />
          <Delta
            label="PV corpus needed"
            base={baseResults.requiredCorpusPV}
            override={whatIfResults.requiredCorpusPV}
            format="currency"
            higherIsBetter={false}
            currency={currency}
          />
          <Delta
            label="Money lasts until"
            base={baseResults.depletionAge ?? baseInputs.lifeExpectancy + 1}
            override={whatIfResults.depletionAge ?? baseInputs.lifeExpectancy + 1}
            format="age"
            higherIsBetter
          />
        </div>
      )}

      {isUnchanged && (
        <p className="text-xs text-muted-foreground text-center py-1">
          Drag any slider to see the impact on your plan.
        </p>
      )}
    </div>
  );
}
