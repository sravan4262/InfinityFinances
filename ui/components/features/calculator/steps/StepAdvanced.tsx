"use client";
import { useFireStore, nextMonthStr, currentMonthStr } from "@/lib/store";
import { NumberField } from "@/components/ui/NumberField";
import { getFireCurrency } from "@/lib/currency";
import { useState } from "react";
import {
  ChevronDown, ChevronRight, Heart, Shield, GraduationCap,
  CreditCard, Plus, Trash2, Banknote, ArrowRightLeft, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmiStream, FutureExpense, FutureInvestment, ChildOneTimeExpense, FireInputs } from "@/lib/engine/types";

type Person = "you" | "spouse";

function Section({
  title, icon, children, defaultOpen = false,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="text-primary">{icon}</span>
          {title}
        </span>
        {open
          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function PersonTabs({ person, onChange }: { person: Person; onChange: (p: Person) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
      {(["you", "spouse"] as Person[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-4 py-1 text-sm rounded-md transition-colors ${
            person === p
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p === "you" ? "You" : "Spouse"}
        </button>
      ))}
    </div>
  );
}

export function StepAdvanced() {
  const { inputs, updateInputs, includeSpouse, spouseInputs, updateSpouseInputs, setPreviewPerson } = useFireStore();
  const [person, setPerson] = useState<Person>("you");
  const handlePersonChange = (p: Person) => { setPerson(p); setPreviewPerson(p); };

  const activeInputs: FireInputs = includeSpouse && person === "spouse" ? spouseInputs : inputs;
  const activeUpdate = includeSpouse && person === "spouse" ? updateSpouseInputs : updateInputs;
  const currency = inputs.currency ?? "USD";
  const currencySymbol = getFireCurrency(currency).symbol;

  // ── EMI helpers ────────────────────────────────────────────────────────────
  const addEmi = () => {
    activeUpdate({
      emis: [
        ...(activeInputs.emis ?? []),
        {
          label: `Loan ${(activeInputs.emis?.length ?? 0) + 1}`,
          monthlyAmount: 0,
          endDate: nextMonthStr(),
          redirectToSavings: false,
        } satisfies EmiStream,
      ],
    });
  };
  const removeEmi = (idx: number) => {
    activeUpdate({ emis: (activeInputs.emis ?? []).filter((_, i) => i !== idx) });
  };
  const updateEmi = (idx: number, patch: Partial<EmiStream>) => {
    activeUpdate({
      emis: (activeInputs.emis ?? []).map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    });
  };

  // ── Future expense helpers ─────────────────────────────────────────────────
  const addExpense = () => {
    activeUpdate({
      futureExpenses: [
        ...(activeInputs.futureExpenses ?? []),
        {
          label: "Expense",
          monthlyAmount: 500,
          startDate: currentMonthStr(),
          endDate: "",
        } satisfies FutureExpense,
      ],
    });
  };
  const removeExpense = (idx: number) => {
    activeUpdate({ futureExpenses: (activeInputs.futureExpenses ?? []).filter((_, i) => i !== idx) });
  };
  const updateExpense = (idx: number, patch: Partial<FutureExpense>) => {
    activeUpdate({
      futureExpenses: (activeInputs.futureExpenses ?? []).map((e, i) =>
        i === idx ? { ...e, ...patch } : e
      ),
    });
  };

  // ── Child helpers ─────────────────────────────────────────────────────────
  const addChild = () => {
    activeUpdate({
      children: [
        ...(activeInputs.children ?? []),
        {
          label: `Child ${(activeInputs.children?.length ?? 0) + 1}`,
          currentAge: 5,
          educationStartAge: 18,
          educationEndAge: 22,
          annualCostToday: 30000,
          educationInflation: 0.05,
          monthlyLivingExpenses: 0,
          livingEndAge: 22,
          oneTimeExpenses: [],
        },
      ],
    });
  };
  const removeChild = (idx: number) => {
    activeUpdate({ children: (activeInputs.children ?? []).filter((_, i) => i !== idx) });
  };
  const updateChild = (idx: number, patch: object) => {
    activeUpdate({
      children: (activeInputs.children ?? []).map((c, i) =>
        i === idx ? { ...c, ...patch } : c
      ),
    });
  };
  const addOneTime = (childIdx: number) => {
    const child = (activeInputs.children ?? [])[childIdx];
    if (!child) return;
    const ote: ChildOneTimeExpense = {
      label: "One-time expense",
      date: currentMonthStr(),
      amount: 10000,
    };
    updateChild(childIdx, { oneTimeExpenses: [...(child.oneTimeExpenses ?? []), ote] });
  };
  const removeOneTime = (childIdx: number, oteIdx: number) => {
    const child = (activeInputs.children ?? [])[childIdx];
    if (!child) return;
    updateChild(childIdx, {
      oneTimeExpenses: (child.oneTimeExpenses ?? []).filter((_, i) => i !== oteIdx),
    });
  };
  const updateOneTime = (childIdx: number, oteIdx: number, patch: Partial<ChildOneTimeExpense>) => {
    const child = (activeInputs.children ?? [])[childIdx];
    if (!child) return;
    updateChild(childIdx, {
      oneTimeExpenses: (child.oneTimeExpenses ?? []).map((o, i) =>
        i === oteIdx ? { ...o, ...patch } : o
      ),
    });
  };

  // ── Future investment helpers ──────────────────────────────────────────────
  const addInvestment = () => {
    activeUpdate({
      futureInvestments: [
        ...(activeInputs.futureInvestments ?? []),
        {
          label: "New Home / Property",
          purchaseDate: nextMonthStr(),
          investmentValue: 300000,
          annualReturn: 0.07,
          downPayment: 60000,
          deductDownPayment: true,
          emiAmount: 1500,
          emiStartDate: nextMonthStr(),
          emiEndDate: "",
          deductEmiFromSavings: true,
        } satisfies FutureInvestment,
      ],
    });
  };
  const removeInvestment = (idx: number) => {
    activeUpdate({ futureInvestments: (activeInputs.futureInvestments ?? []).filter((_, i) => i !== idx) });
  };
  const updateInvestment = (idx: number, patch: Partial<FutureInvestment>) => {
    activeUpdate({
      futureInvestments: (activeInputs.futureInvestments ?? []).map((inv, i) =>
        i === idx ? { ...inv, ...patch } : inv
      ),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Advanced inputs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          All optional — skip anything that doesn&apos;t apply to you.
        </p>
      </div>

      {includeSpouse && (
        <PersonTabs person={person} onChange={handlePersonChange} />
      )}

      {/* Retirement spending */}
      <Section title="Retirement spending" icon={<Shield className="w-4 h-4" />}>
        <NumberField
          label="Monthly retirement salary"
          value={activeInputs.monthlyRetirementSalary ?? activeInputs.retirementSpending / 12}
          onChange={(v) => activeUpdate({ monthlyRetirementSalary: v, retirementSpending: v * 12 })}
          prefix={currencySymbol}
          format="currency"
          placeholder="e.g. 5,000"
          hint={
            includeSpouse && person === "spouse"
              ? "Spouse's monthly retirement target (today's dollars). Defaults to your household target if left blank."
              : "Monthly take-home you need in retirement (today's dollars). Used for PV corpus."
          }
        />
        <NumberField
          label="Withdrawal rate (investments only)"
          value={activeInputs.withdrawalRate}
          onChange={(v) => activeUpdate({ withdrawalRate: v })}
          format="percent"
          suffix="%"
          min={0.02}
          max={0.08}
          placeholder="e.g. 4"
          hint={`% of your invested portfolio you draw each year. 4% is the classic safe rate — at that rate your corpus is ${currencySymbol}Annual Spending ÷ 4% = 25× your yearly expenses. Cash savings are not included.`}
        />
      </Section>

      {/* EMI management */}
      <Section title="EMIs & loans" icon={<CreditCard className="w-4 h-4" />}>
        <p className="text-xs text-muted-foreground">
          Active EMIs are deducted from monthly savings. Tick &quot;redirect&quot; to
          channel freed-up cash back to savings after payoff.
        </p>
        <div className="space-y-4">
          {(activeInputs.emis ?? []).map((emi, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-transparent text-sm font-medium border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  value={emi.label}
                  onChange={(e) => updateEmi(idx, { label: e.target.value })}
                  placeholder="EMI label"
                />
                <button onClick={() => removeEmi(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField
                  label="Monthly EMI"
                  value={emi.monthlyAmount}
                  onChange={(v) => updateEmi(idx, { monthlyAmount: v })}
                  prefix={currencySymbol}
                  format="currency"
                />
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">End date</label>
                  <input
                    type="month"
                    value={emi.endDate}
                    onChange={(e) => updateEmi(idx, { endDate: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={emi.redirectToSavings}
                  onChange={(e) => updateEmi(idx, { redirectToSavings: e.target.checked })}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  Redirect freed EMI to savings after payoff
                </span>
              </label>
            </div>
          ))}
          <button onClick={addEmi}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
            <Plus className="w-4 h-4" /> Add EMI
          </button>
        </div>
      </Section>

      {/* Future expenses */}
      <Section title="Future expense streams" icon={<Banknote className="w-4 h-4" />}>
        <p className="text-xs text-muted-foreground">
          Date-gated recurring expenses — travel budget, insurance, club memberships, etc.
          Deducted from monthly savings while active.
        </p>
        <div className="space-y-4">
          {(activeInputs.futureExpenses ?? []).map((exp, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-transparent text-sm font-medium border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  value={exp.label}
                  onChange={(e) => updateExpense(idx, { label: e.target.value })}
                  placeholder="e.g. Annual travel, Insurance"
                />
                <button onClick={() => removeExpense(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <NumberField
                label="Monthly amount"
                value={exp.monthlyAmount}
                onChange={(v) => updateExpense(idx, { monthlyAmount: v })}
                prefix={currencySymbol}
                format="currency"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Start date</label>
                  <input
                    type="month"
                    value={exp.startDate}
                    onChange={(e) => updateExpense(idx, { startDate: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">End date (optional)</label>
                  <input
                    type="month"
                    value={exp.endDate}
                    onChange={(e) => updateExpense(idx, { endDate: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          ))}
          <button onClick={addExpense}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
            <Plus className="w-4 h-4" /> Add future expense
          </button>
        </div>
      </Section>

      {/* Social Security / Pension */}
      <Section title="Other retirement income" icon={<Shield className="w-4 h-4" />}>
        <NumberField
          label="Social Security / NPS annual benefit"
          value={activeInputs.socialSecurityBenefit ?? 0}
          onChange={(v) => activeUpdate({ socialSecurityBenefit: v })}
          prefix={currencySymbol} format="currency"
          placeholder="e.g. 18,000"
          hint="Annual SS benefit at your claiming age (from ssa.gov)"
        />
        <NumberField
          label="SS / NPS claiming age"
          value={activeInputs.socialSecurityAge ?? 0}
          onChange={(v) => activeUpdate({ socialSecurityAge: v })}
          suffix="years" min={55} max={70}
          placeholder="e.g. 67"
        />
        <NumberField
          label="Pension annual benefit"
          value={activeInputs.pensionBenefit ?? 0}
          onChange={(v) => activeUpdate({ pensionBenefit: v })}
          prefix={currencySymbol} format="currency"
          placeholder="e.g. 12,000"
        />
        <NumberField
          label="Pension start age"
          value={activeInputs.pensionStartAge ?? 0}
          onChange={(v) => activeUpdate({ pensionStartAge: v })}
          suffix="years" min={50} max={75}
          placeholder="e.g. 65"
        />
      </Section>

      {/* Healthcare */}
      <Section title="Healthcare" icon={<Heart className="w-4 h-4" />}>
        <NumberField
          label="Annual healthcare premium (pre-Medicare)"
          value={activeInputs.healthcarePremium ?? 0}
          onChange={(v) => activeUpdate({ healthcarePremium: v })}
          prefix={currencySymbol} format="currency"
          placeholder="e.g. 6,000"
          hint="ACA marketplace premiums before age 65"
        />
        <NumberField
          label="Healthcare inflation rate"
          value={activeInputs.healthcareInflation ?? 0}
          onChange={(v) => activeUpdate({ healthcareInflation: v })}
          format="percent" suffix="%/yr" min={0} max={0.15}
          placeholder="e.g. 5"
        />
        <NumberField
          label="Medicare start age"
          value={activeInputs.medicareAge ?? 0}
          onChange={(v) => activeUpdate({ medicareAge: v })}
          suffix="years" min={60} max={70}
          placeholder="e.g. 65"
        />
      </Section>

      {/* Kids education + living expenses — only on primary tab (shared household) */}
      {(!includeSpouse || person === "you") && (
        <Section title="Children's education & living expenses" icon={<GraduationCap className="w-4 h-4" />}>
          <div className="space-y-5">
            {(activeInputs.children ?? []).map((child, idx) => (
              <div key={idx} className="space-y-4 p-4 rounded-lg bg-muted/20 border border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{child.label}</span>
                  <button onClick={() => removeChild(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <NumberField
                    label="Child's current age"
                    value={child.currentAge}
                    onChange={(v) => updateChild(idx, { currentAge: v })}
                    suffix="yrs" min={0} max={25}
                  />
                  <NumberField
                    label="Annual education cost (today $)"
                    value={child.annualCostToday}
                    onChange={(v) => updateChild(idx, { annualCostToday: v })}
                    prefix={currencySymbol} format="currency"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Education start age"
                    value={child.educationStartAge}
                    onChange={(v) => updateChild(idx, { educationStartAge: v })}
                    suffix="yrs" min={0} max={30}
                  />
                  <NumberField
                    label="Education end age"
                    value={child.educationEndAge}
                    onChange={(v) => updateChild(idx, { educationEndAge: v })}
                    suffix="yrs" min={0} max={30}
                  />
                </div>
                <NumberField
                  label="Education inflation"
                  value={child.educationInflation}
                  onChange={(v) => updateChild(idx, { educationInflation: v })}
                  format="percent" suffix="%/yr" min={0} max={0.2}
                />

                <div className="pt-2 border-t border-border space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Monthly living expenses</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Monthly amount"
                      value={child.monthlyLivingExpenses ?? 0}
                      onChange={(v) => updateChild(idx, { monthlyLivingExpenses: v })}
                      prefix={currencySymbol} format="currency"
                      hint="Groceries, clothing, activities, etc."
                    />
                    <NumberField
                      label="Living expenses until age"
                      value={child.livingEndAge ?? child.educationEndAge}
                      onChange={(v) => updateChild(idx, { livingEndAge: v })}
                      suffix="yrs" min={0} max={30}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">One-time expenses</p>
                  {(child.oneTimeExpenses ?? []).map((ote, oteIdx) => (
                    <div key={oteIdx} className="flex items-end gap-2">
                      <div className="flex-1">
                        <input
                          className="w-full bg-transparent text-xs border border-border rounded px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-primary"
                          value={ote.label}
                          onChange={(e) => updateOneTime(idx, oteIdx, { label: e.target.value })}
                          placeholder="e.g. Wedding"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <NumberField
                            label="Amount"
                            value={ote.amount}
                            onChange={(v) => updateOneTime(idx, oteIdx, { amount: v })}
                            prefix={currencySymbol} format="currency"
                          />
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Date</label>
                            <input
                              type="month"
                              value={ote.date}
                              onChange={(e) => updateOneTime(idx, oteIdx, { date: e.target.value })}
                              className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeOneTime(idx, oteIdx)}
                        className="text-muted-foreground hover:text-destructive transition-colors mb-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addOneTime(idx)}
                    className={cn("flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors")}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add one-time expense
                  </button>
                </div>
              </div>
            ))}

            <button onClick={addChild}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
              <Plus className="w-4 h-4" /> Add a child
            </button>
          </div>
        </Section>
      )}

      {/* Taxes */}
      <Section title="Tax assumptions" icon={<Shield className="w-4 h-4" />}>
        <NumberField
          label="Effective tax rate during retirement"
          value={activeInputs.effectiveTaxRateRetirement ?? 0}
          onChange={(v) => activeUpdate({ effectiveTaxRateRetirement: v })}
          format="percent" suffix="%" min={0} max={0.5}
          placeholder="e.g. 12"
          hint="Effective rate on withdrawals in retirement"
        />
        <NumberField
          label="Effective tax rate now (accumulation)"
          value={activeInputs.effectiveTaxRateAccumulation ?? 0}
          onChange={(v) => activeUpdate({ effectiveTaxRateAccumulation: v })}
          format="percent" suffix="%" min={0} max={0.5}
          placeholder="e.g. 22"
        />
      </Section>

      {/* Planned future purchases */}
      <Section title="Planned future purchases" icon={<Building2 className="w-4 h-4" />}>
        <p className="text-xs text-muted-foreground">
          Future homes, cars, or other assets. Added to your net worth at the purchase date and appreciate from then on.
        </p>
        <div className="space-y-5">
          {(activeInputs.futureInvestments ?? []).map((inv, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-transparent text-sm font-medium border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  value={inv.label}
                  onChange={(e) => updateInvestment(idx, { label: e.target.value })}
                  placeholder="e.g. Second home, Car"
                />
                <button onClick={() => removeInvestment(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Purchase date</label>
                  <input
                    type="month"
                    value={inv.purchaseDate}
                    onChange={(e) => updateInvestment(idx, { purchaseDate: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <NumberField
                  label="Asset value at purchase"
                  value={inv.investmentValue}
                  onChange={(v) => updateInvestment(idx, { investmentValue: v })}
                  prefix={currencySymbol} format="currency"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Annual appreciation"
                  value={inv.annualReturn}
                  onChange={(v) => updateInvestment(idx, { annualReturn: v })}
                  format="percent" suffix="%/yr" min={0} max={0.3}
                />
                <NumberField
                  label="Down payment"
                  value={inv.downPayment}
                  onChange={(v) => updateInvestment(idx, { downPayment: v })}
                  prefix={currencySymbol} format="currency"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inv.deductDownPayment}
                  onChange={(e) => updateInvestment(idx, { deductDownPayment: e.target.checked })}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-xs text-muted-foreground">Deduct down payment from net worth at purchase</span>
              </label>
              <div className="pt-1 border-t border-border space-y-3">
                <p className="text-xs font-medium text-muted-foreground">EMI for this purchase</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <NumberField
                    label="Monthly EMI"
                    value={inv.emiAmount}
                    onChange={(v) => updateInvestment(idx, { emiAmount: v })}
                    prefix={currencySymbol} format="currency"
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">EMI start</label>
                    <input
                      type="month"
                      value={inv.emiStartDate}
                      onChange={(e) => updateInvestment(idx, { emiStartDate: e.target.value })}
                      className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">EMI end</label>
                    <input
                      type="month"
                      value={inv.emiEndDate}
                      onChange={(e) => updateInvestment(idx, { emiEndDate: e.target.value })}
                      className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inv.deductEmiFromSavings}
                    onChange={(e) => updateInvestment(idx, { deductEmiFromSavings: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">Deduct EMI from monthly savings while active</span>
                </label>
              </div>
            </div>
          ))}
          <button onClick={addInvestment}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
            <Plus className="w-4 h-4" /> Add future purchase
          </button>
        </div>
      </Section>

      {/* Roth conversion ladder */}
      <Section title="Roth conversion ladder" icon={<ArrowRightLeft className="w-4 h-4" />}>
        <p className="text-xs text-muted-foreground">
          Each year during accumulation, convert this amount from Traditional accounts to
          Roth. Conversions are taxed today but unlock after a 5-year seasoning period — creating
          a tax-free bridge before age 59½.
        </p>
        <NumberField
          label="Annual Roth conversion amount"
          value={activeInputs.rothConversionAnnual ?? 0}
          onChange={(v) => activeUpdate({ rothConversionAnnual: v })}
          prefix={currencySymbol}
          format="currency"
          placeholder="e.g. 10,000"
          hint="Leave blank to skip. Requires Traditional account assets on the Portfolio step."
        />
        {(activeInputs.rothConversionAnnual ?? 0) > 0 && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-primary">How the ladder works</p>
            <p>Year 1 conversion → accessible at year 6 (age {(activeInputs.currentAge + 6).toFixed(0)}+)</p>
            <p>Year 2 conversion → accessible at year 7, and so on.</p>
            <p>Each tranche is penalty-free and tax-free once unlocked.</p>
          </div>
        )}
      </Section>
    </div>
  );
}
