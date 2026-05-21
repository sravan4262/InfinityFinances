"use client";
import { Clock, TrendingUp, PiggyBank, Target, Zap, Lock, Calendar, BarChart3, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFireStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

function calcMonthlySavingsNeeded(
  fireNumber: number,
  currentPortfolio: number,
  yearsToRetirement: number,
  expectedReturn: number
): number {
  if (yearsToRetirement <= 0) return 0;
  const n = yearsToRetirement * 12;
  const r = expectedReturn / 12;
  const fvPortfolio = currentPortfolio * Math.pow(1 + r, n);
  const remaining = fireNumber - fvPortfolio;
  if (remaining <= 0) return 0;
  if (r === 0) return remaining / n;
  return (remaining * r) / (Math.pow(1 + r, n) - 1);
}

const STEP_TIPS = [
  "Retiring 5 years earlier than planned can double the savings you need — compounding works against you on shorter timelines.",
  "Savings rate is the #1 lever for FIRE. Jumping from 20% to 40% can cut your timeline by almost a decade.",
  "Historical stock market returns average 7% real over long periods. Your asset mix drives this number.",
  "Social security and pension income directly reduce how much portfolio you need — every $1k/mo saves ~$300k in required corpus.",
  "The 4% rule (25× spending) is the standard. Drop to 3.5% for a longer runway or higher confidence.",
];

// Steps where the FIRE number is considered "user-defined" (Scenarios step)
const FIRE_NUMBER_UNLOCKED_STEP = 4;

export function LivePreviewPanel({ step }: { step: number }) {
  const { inputs, spouseInputs, previewPerson, includeSpouse } = useFireStore();
  const currency = inputs.currency ?? "USD";
  const money = (value: number, compact = false) => formatCurrency(value, compact, currency);

  // For step-specific previews (1-3), use the active person's inputs
  const preview = (includeSpouse && previewPerson === "spouse") ? spouseInputs : inputs;

  // FIRE number and top-level FIRE hero always use primary
  const fireNumber = inputs.retirementSpending / inputs.withdrawalRate;
  const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.currentAge);
  const retirementDuration = Math.max(0, inputs.lifeExpectancy - inputs.retirementAge);

  // Step-specific calculations use preview person
  const baseAnnualSavings = Math.max(0, preview.afterTaxIncome - preview.currentSpending);
  const streamsAnnual = preview.savingsStreams.reduce((sum, s) => sum + s.monthlyAmount * 12, 0);
  const annualSavings = baseAnnualSavings + streamsAnnual;
  const savingsRate = preview.afterTaxIncome > 0
    ? (annualSavings / preview.afterTaxIncome) * 100
    : 0;
  const totalPortfolio =
    preview.assets.length > 0
      ? preview.assets.reduce((sum, a) => sum + a.value, 0)
      : preview.currentPortfolio;
  const blendedReturn =
    preview.assets.length > 0 && totalPortfolio > 0
      ? preview.assets.reduce((sum, a) => sum + a.value * a.annualReturn, 0) / totalPortfolio
      : preview.expectedReturn;

  const monthlySavingsNeeded = calcMonthlySavingsNeeded(
    fireNumber,
    totalPortfolio,
    yearsToRetirement,
    blendedReturn
  );
  const portfolioProgress = Math.min(100, (totalPortfolio / fireNumber) * 100);
  const onTrack = annualSavings / 12 >= monthlySavingsNeeded && monthlySavingsNeeded > 0;
  const isUnlocked = step >= FIRE_NUMBER_UNLOCKED_STEP;

  const totalMonthlyContributions = preview.assets.reduce((sum, a) => sum + (a.monthlyContribution ?? 0), 0);
  const baseMonthlyFromIncome = Math.max(0, preview.afterTaxIncome - preview.currentSpending) / 12;
  const totalMonthlyIn = totalMonthlyContributions + baseMonthlyFromIncome + streamsAnnual / 12;
  const n = yearsToRetirement * 12;
  const r = blendedReturn / 12;
  const projectedPortfolio =
    totalPortfolio * Math.pow(1 + r, n) +
    (r > 0 ? (totalMonthlyIn * (Math.pow(1 + r, n) - 1)) / r : totalMonthlyIn * n);

  return (
    <div className="hidden lg:flex flex-col gap-4 sticky top-24 self-start">
      {/* FIRE number hero — locked until Scenarios step */}
      <AnimatePresence mode="wait">
        {isUnlocked ? (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="glass rounded-2xl p-5 text-center glow-primary"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
              Your FIRE Number
            </p>
            <p className="text-3xl font-bold text-primary tabular-nums">
              {money(fireNumber)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {money(inputs.retirementSpending)} ÷{" "}
              {(inputs.withdrawalRate * 100).toFixed(1)}% withdrawal rate
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl p-5 text-center border border-border"
          >
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                Your FIRE Number
              </p>
            </div>
            <p className="text-3xl font-bold text-muted-foreground/30 tabular-nums select-none blur-sm">
              $0,000,000
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Set your spending in step 5 to reveal
            </p>
            {/* Step progress dots */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {[0, 1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s < step ? "w-4 bg-primary" : s === step ? "w-4 bg-primary/50" : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step-specific main content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-3"
        >
          {step === 0 && (
            /* Step 0: Timeline focus */
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Years to FIRE"
                  value={`${yearsToRetirement} yrs`}
                  sub={`Retire at ${inputs.retirementAge}`}
                  accent={yearsToRetirement <= 15 ? "success" : undefined}
                />
                <StatTile
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Retirement length"
                  value={`${retirementDuration} yrs`}
                  sub={`Until age ${inputs.lifeExpectancy}`}
                />
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-3">Retirement timeline</p>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex-1 bg-primary/20 rounded-full h-3 relative overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-primary/40 rounded-full"
                      style={{ width: `${(yearsToRetirement / (inputs.lifeExpectancy - inputs.currentAge)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Now ({inputs.currentAge})</span>
                  <span className="text-primary">FIRE ({inputs.retirementAge})</span>
                  <span>{inputs.lifeExpectancy}</span>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            /* Step 1: Income & savings focus */
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  label="Savings Rate"
                  value={`${savingsRate.toFixed(0)}%`}
                  sub={`${money(annualSavings / 12, true)}/mo saved`}
                  accent={savingsRate >= 40 ? "success" : savingsRate >= 20 ? undefined : "warning"}
                />
                <StatTile
                  icon={<Briefcase className="w-3.5 h-3.5" />}
                  label="After-tax Income"
                  value={money(preview.afterTaxIncome, true)}
                  sub={`${money(preview.afterTaxIncome / 12, true)}/mo`}
                />
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-3">Income breakdown</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Spending</span>
                    <span>{money(preview.currentSpending, true)}/yr</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Base saved</span>
                    <span className="text-success">{money(baseAnnualSavings, true)}/yr</span>
                  </div>
                  {streamsAnnual > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">+ Streams</span>
                      <span className="text-primary">{money(streamsAnnual, true)}/yr</span>
                    </div>
                  )}
                  <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, savingsRate)}%` }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            /* Step 2: Portfolio focus */
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={<Target className="w-3.5 h-3.5" />}
                  label="Portfolio Now"
                  value={money(totalPortfolio, true)}
                  sub="current balance"
                />
                <StatTile
                  icon={<BarChart3 className="w-3.5 h-3.5" />}
                  label="Blended Return"
                  value={`${(blendedReturn * 100).toFixed(1)}%`}
                  sub="nominal annual"
                  accent={blendedReturn >= 0.07 ? "success" : undefined}
                />
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Projected at retirement</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {money(projectedPortfolio, true)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  In {yearsToRetirement} yrs at {(blendedReturn * 100).toFixed(1)}%
                </p>
                {totalMonthlyIn > 0 && (
                  <p className="text-xs text-primary mt-2 pt-2 border-t border-border">
                    + {money(totalMonthlyIn, true)}/mo in contributions
                  </p>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            /* Step 3: Advanced / benefits focus */
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={<PiggyBank className="w-3.5 h-3.5" />}
                  label="Social Security"
                  value={preview.socialSecurityBenefit ? money(preview.socialSecurityBenefit * 12, true) + "/yr" : "Not set"}
                  sub={preview.socialSecurityBenefit ? `from age ${preview.socialSecurityAge}` : "optional"}
                />
                <StatTile
                  icon={<Briefcase className="w-3.5 h-3.5" />}
                  label="Pension"
                  value={preview.pensionBenefit ? money(preview.pensionBenefit * 12, true) + "/yr" : "Not set"}
                  sub={preview.pensionBenefit ? `from age ${preview.pensionStartAge}` : "optional"}
                />
              </div>
              <div className="glass rounded-xl p-4 space-y-2">
                <p className="text-xs text-muted-foreground mb-2">Tax rates</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Accumulation</span>
                  <span>{((preview.effectiveTaxRateAccumulation ?? 0.22) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Retirement</span>
                  <span>{((preview.effectiveTaxRateRetirement ?? 0.12) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            /* Step 4: Full stats now FIRE number is set */
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  label="Savings Rate"
                  value={`${savingsRate.toFixed(0)}%`}
                  sub={`${money(annualSavings / 12, true)}/mo`}
                  accent={savingsRate >= 40 ? "success" : undefined}
                />
                <StatTile
                  icon={<PiggyBank className="w-3.5 h-3.5" />}
                  label="Needed / mo"
                  value={money(monthlySavingsNeeded, true)}
                  sub="to retire on time"
                  accent={onTrack ? "success" : "warning"}
                />
              </div>
              <div className="glass rounded-xl p-4">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-muted-foreground">Progress to FIRE</span>
                  <span className="font-medium text-primary">{portfolioProgress.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${portfolioProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-2 text-muted-foreground tabular-nums">
                  <span>{money(totalPortfolio, true)}</span>
                  <span>{money(fireNumber, true)}</span>
                </div>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">FIRE Variants</p>
                <div className="space-y-2">
                  {[
                    { label: "Lean FIRE", mult: 0.7, cls: "text-success" },
                    { label: "Standard FIRE", mult: 1.0, cls: "text-primary" },
                    { label: "Fat FIRE", mult: 1.5, cls: "text-gold" },
                  ].map(({ label, mult, cls }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className={`text-sm font-semibold tabular-nums ${cls}`}>
                        {money(fireNumber * mult, true)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Step tip */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {STEP_TIPS[step] ?? STEP_TIPS[0]}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: "success" | "warning";
}) {
  const accentCls =
    accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-foreground";
  const iconCls =
    accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-muted-foreground";

  return (
    <div className="glass rounded-xl p-3.5">
      <div className={`flex items-center gap-1.5 mb-1.5 ${iconCls}`}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-sm font-bold tabular-nums ${accentCls}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
