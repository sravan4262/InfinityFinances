"use client";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useFireStore } from "@/lib/store";
import { calculateFireMonthly } from "@/lib/engine/monthly";
import { FIRE_ENGINE_DEFAULTS } from "@/lib/fireDefaults";
import { getFireCurrency } from "@/lib/currency";
import { CurrencySelector } from "./CurrencySelector";
import { NumberField } from "@/components/ui/NumberField";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  User, Calendar, Wallet, PiggyBank, ShoppingBag,
  Flame, Target, Clock, Hourglass, TrendingUp, Settings2, Info,
} from "lucide-react";

export function SimpleCalculator() {
  const {
    inputs, updateInputs, calculate, setInputMode,
    includeSpouse, spouseInputs,
  } = useFireStore();

  // Apply hidden engine defaults silently the first time the user lands on
  // Simple mode. Same constants the chat-Calculate flow uses (see
  // FIRE_ENGINE_DEFAULTS) so both surfaces produce identical numbers.
  useEffect(() => {
    const patch: Partial<typeof inputs> = {};
    if (!inputs.lifeExpectancy) patch.lifeExpectancy = FIRE_ENGINE_DEFAULTS.lifeExpectancy;
    if (!inputs.withdrawalRate) patch.withdrawalRate = FIRE_ENGINE_DEFAULTS.withdrawalRate;
    if (!inputs.inflationRate) patch.inflationRate = FIRE_ENGINE_DEFAULTS.inflationRate;
    if (!inputs.expectedReturn) patch.expectedReturn = FIRE_ENGINE_DEFAULTS.expectedReturn;
    if (Object.keys(patch).length > 0) updateInputs(patch);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived simple-mode values from the underlying engine inputs
  const totalSaved = inputs.assets.length > 0
    ? inputs.assets.reduce((s, a) => s + a.value, 0)
    : inputs.currentPortfolio;
  const monthlySavings = Math.max(0, (inputs.afterTaxIncome - inputs.currentSpending) / 12);
  const monthlyRetirementSpend = inputs.monthlyRetirementSalary
    ?? (inputs.retirementSpending > 0 ? inputs.retirementSpending / 12 : 0);
  const currency = inputs.currency ?? "USD";
  const currencySymbol = getFireCurrency(currency).symbol;

  // ── Writers — every Simple field maps to the same engine fields the
  // Advanced wizard writes to. No parallel calculation, no shadow state.
  const setAge = (v: number) => updateInputs({ currentAge: v });
  const setRetireAge = (v: number) => updateInputs({ retirementAge: v });

  const setTotalSaved = (v: number) => {
    // Mirror into both the assets array and the single-balance fallback so
    // every downstream calc sees the same number regardless of which path
    // it reads. Keep a single asset row so the user lands cleanly in
    // Advanced with their balance pre-populated.
    updateInputs({
      currentPortfolio: v,
      assets: [{
        label: inputs.assets[0]?.label ?? "Stocks / Equity",
        value: v,
        annualReturn: inputs.expectedReturn || 0.07,
        accountType: inputs.assets[0]?.accountType ?? "taxable",
      }],
    });
  };

  const setMonthlySavings = (v: number) => {
    // Engine: baseMonthlySavings = (afterTaxIncome - currentSpending) / 12.
    // Encoding monthly savings as afterTaxIncome with currentSpending=0 keeps
    // the math identical to typing the same monthly figure in Advanced.
    updateInputs({ afterTaxIncome: v * 12, currentSpending: 0 });
  };

  const setMonthlyRetire = (v: number) => {
    updateInputs({
      monthlyRetirementSalary: v,
      retirementSpending: v * 12,
    });
  };

  const setExpectedReturn = (v: number) => {
    updateInputs({
      expectedReturn: v,
      assets: inputs.assets.length > 0
        ? inputs.assets.map((a, i) => i === 0 ? { ...a, annualReturn: v } : a)
        : inputs.assets,
    });
  };

  // ── Live preview: real engine call, not a closed-form approximation ──
  // Memoised on the inputs object so it only recomputes when something
  // relevant changes.
  const preview = useMemo(() => {
    const ready =
      inputs.currentAge > 0 &&
      inputs.retirementAge > inputs.currentAge &&
      inputs.lifeExpectancy > inputs.retirementAge &&
      monthlyRetirementSpend > 0;
    if (!ready) return null;
    return calculateFireMonthly(inputs);
  }, [inputs, monthlyRetirementSpend]);

  // ── "Advanced inputs active" detection — anything the Simple form hides
  // but that still affects the math. We surface it transparently rather
  // than zeroing it out, so switching modes is non-destructive.
  const advancedActive = useMemo(() => {
    const items: string[] = [];
    if ((inputs.emis?.length ?? 0) > 0) items.push(`${inputs.emis!.length} EMI${inputs.emis!.length > 1 ? "s" : ""}`);
    if ((inputs.savingsStreams?.length ?? 0) > 0) items.push(`${inputs.savingsStreams!.length} savings stream${inputs.savingsStreams!.length > 1 ? "s" : ""}`);
    if ((inputs.futureExpenses?.length ?? 0) > 0) items.push(`${inputs.futureExpenses!.length} future expense${inputs.futureExpenses!.length > 1 ? "s" : ""}`);
    if ((inputs.futureInvestments?.length ?? 0) > 0) items.push(`${inputs.futureInvestments!.length} future purchase${inputs.futureInvestments!.length > 1 ? "s" : ""}`);
    if ((inputs.children?.length ?? 0) > 0) items.push(`${inputs.children!.length} child`);
    if (inputs.assets.length > 1) items.push(`${inputs.assets.length} asset classes`);
    if ((inputs.socialSecurityBenefit ?? 0) > 0) items.push("SS / NPS");
    if ((inputs.pensionBenefit ?? 0) > 0) items.push("pension");
    if ((inputs.healthcarePremium ?? 0) > 0) items.push("healthcare");
    if ((inputs.effectiveTaxRateRetirement ?? 0) > 0 || (inputs.effectiveTaxRateAccumulation ?? 0) > 0) items.push("taxes");
    if ((inputs.rothConversionAnnual ?? 0) > 0) items.push("Roth ladder");
    if (includeSpouse && (spouseInputs.currentAge > 0 || spouseInputs.afterTaxIncome > 0)) items.push("spouse");
    return items;
  }, [inputs, includeSpouse, spouseInputs]);

  const canCalculate = preview !== null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <CurrencySelector />
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start">
      {/* ── Left: input card ────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Six numbers, one answer</h2>
          <p className="text-sm text-muted-foreground mt-1">
            The fastest path to your FIRE estimate. Nothing here is hidden — we use sensible defaults
            for inflation, withdrawal rate, and life expectancy. Need EMIs, kids, taxes, or a spouse?{" "}
            <button
              onClick={() => setInputMode("form")}
              className="text-primary hover:underline font-medium"
            >
              Switch to Advanced
            </button>.
          </p>
        </div>

        {advancedActive.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs">
            <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-foreground font-medium">
                Advanced inputs are also active and affecting this preview:
              </p>
              <p className="text-muted-foreground">{advancedActive.join(", ")}.</p>
              <button
                onClick={() => setInputMode("form")}
                className="text-primary hover:underline font-medium"
              >
                Open Advanced to view or remove them →
              </button>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <NumberField
            label="Current age"
            icon={<User className="w-4 h-4" />}
            value={inputs.currentAge}
            onChange={setAge}
            min={18} max={80}
            suffix="years"
            placeholder="e.g. 32"
          />
          <NumberField
            label="Target retirement age"
            icon={<Calendar className="w-4 h-4" />}
            value={inputs.retirementAge}
            onChange={setRetireAge}
            min={(inputs.currentAge || 0) + 1} max={80}
            suffix="years"
            placeholder="e.g. 50"
          />
          <NumberField
            label="Total saved today"
            icon={<Wallet className="w-4 h-4" />}
            value={totalSaved}
            onChange={setTotalSaved}
            prefix={currencySymbol}
            format="currency"
            placeholder="e.g. 80,000"
            hint="All your investments and savings combined"
          />
          <NumberField
            label="Monthly savings"
            icon={<PiggyBank className="w-4 h-4" />}
            value={monthlySavings}
            onChange={setMonthlySavings}
            prefix={currencySymbol}
            format="currency"
            placeholder="e.g. 2,000"
            hint="What you put away each month"
          />
          <NumberField
            label="Monthly spend in retirement"
            icon={<ShoppingBag className="w-4 h-4" />}
            value={monthlyRetirementSpend}
            onChange={setMonthlyRetire}
            prefix={currencySymbol}
            format="currency"
            placeholder="e.g. 5,000"
            hint="Today's dollars — we'll inflation-adjust"
          />
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              Expected annual return
            </label>
            <div className="rounded-xl border border-border bg-input px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  Stock-heavy portfolio
                </span>
                <span className="font-semibold text-primary tabular-nums">
                  {((inputs.expectedReturn || 0.07) * 100).toFixed(1)}%
                </span>
              </div>
              <Slider
                value={[(inputs.expectedReturn || 0.07) * 100]}
                onValueChange={(val) => {
                  const v = Array.isArray(val) ? (val as number[])[0] : (val as number);
                  setExpectedReturn(v / 100);
                }}
                min={3} max={12} step={0.5}
              />
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Historical S&amp;P 500 average is ~10%; mixed portfolios sit around 7%.
            </p>
          </div>
        </div>

        <details className="rounded-xl border border-border/60 bg-muted/10 group">
          <summary className="cursor-pointer list-none flex items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <span className="flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5" />
              Hidden defaults — click to view or change
            </span>
            <span className="text-[10px] uppercase tracking-wider">Optional</span>
          </summary>
          <div className="px-4 pb-4 grid sm:grid-cols-3 gap-3 border-t border-border/40 pt-3">
            <NumberField
              label="Life expectancy"
              value={inputs.lifeExpectancy}
              onChange={(v) => updateInputs({ lifeExpectancy: v })}
              suffix="years"
              min={(inputs.retirementAge || 50) + 1} max={110}
            />
            <NumberField
              label="Withdrawal rate"
              value={inputs.withdrawalRate}
              onChange={(v) => updateInputs({ withdrawalRate: v })}
              format="percent"
              suffix="%"
              min={0.02} max={0.08}
              hint="4% is the classic safe rate"
            />
            <NumberField
              label="Inflation rate"
              value={inputs.inflationRate}
              onChange={(v) => updateInputs({ inflationRate: v })}
              format="percent"
              suffix="%/yr"
              min={0} max={0.1}
            />
          </div>
        </details>

        <button
          onClick={calculate}
          disabled={!canCalculate}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-all",
            canCalculate
              ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
              : "bg-muted text-muted-foreground/50 cursor-not-allowed"
          )}
        >
          <Flame className="w-4 h-4" />
          See full breakdown
        </button>
      </div>

      {/* ── Right: live preview panel ───────────────────────────────── */}
      <div className="lg:sticky lg:top-24 mt-6 lg:mt-0 space-y-3">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 glow-primary">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
            Your FIRE number
          </p>
          {preview ? (
            <motion.p
              key={Math.round(preview.fireNumber)}
              initial={{ opacity: 0.4, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="text-3xl sm:text-4xl font-bold text-primary tabular-nums"
            >
              {formatCurrency(preview.fireNumber, false, currency)}
            </motion.p>
          ) : (
            <p className="text-3xl font-bold text-muted-foreground/40">—</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">
            {monthlyRetirementSpend > 0 && inputs.withdrawalRate > 0
              ? `${formatCurrency(monthlyRetirementSpend, false, currency)}/mo × 12 ÷ ${(inputs.withdrawalRate * 100).toFixed(1)}%`
              : "Fill in the form to see your number"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PreviewStat
            icon={<Target className="w-4 h-4" />}
            label="Retire at"
            value={preview?.fireAge ? `Age ${preview.fireAge}` : "—"}
            sub={preview?.fireAge && inputs.currentAge
              ? `${preview.fireAge - inputs.currentAge} yrs from now`
              : undefined}
            highlight
          />
          <PreviewStat
            icon={<Clock className="w-4 h-4" />}
            label="Years to FIRE"
            value={preview?.yearsToFire ? `${preview.yearsToFire}` : "—"}
            sub="of saving"
          />
          <PreviewStat
            icon={<Hourglass className="w-4 h-4" />}
            label="Money lasts until"
            value={preview?.depletionAge
              ? `Age ${preview.depletionAge}`
              : preview ? `${inputs.lifeExpectancy}+` : "—"}
            sub={preview?.depletionAge ? "depletes" : preview ? "past plan" : undefined}
          />
          <PreviewStat
            icon={<TrendingUp className="w-4 h-4" />}
            label="Savings rate"
            value={preview ? `${(preview.currentSavingsRate * 100).toFixed(0)}%` : "—"}
            sub="of income"
          />
        </div>

        {preview && preview.gapAtTargetAge < 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs">
            <p className="font-medium text-warning">Short by {formatCurrency(Math.abs(preview.gapAtTargetAge), false, currency)}</p>
            <p className="text-muted-foreground mt-1">
              At age {inputs.retirementAge} you&apos;ll be below the FIRE number.
              {preview.fireAge ? ` FIRE reached at ${preview.fireAge} instead.` : " Try saving more or retiring later."}
            </p>
          </div>
        )}
        {preview && preview.gapAtTargetAge >= 0 && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-xs">
            <p className="font-medium text-success">
              On track with a {formatCurrency(preview.gapAtTargetAge, true, currency)} cushion
            </p>
            <p className="text-muted-foreground mt-1">
              At age {inputs.retirementAge} you&apos;ll have more than your FIRE number.
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function PreviewStat({
  icon, label, value, sub, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-3",
      highlight ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
    )}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className={highlight ? "text-primary" : ""}>{icon}</span>
        {label}
      </div>
      <p className={cn(
        "text-base font-bold mt-1 tabular-nums",
        highlight ? "text-primary" : "text-foreground"
      )}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
