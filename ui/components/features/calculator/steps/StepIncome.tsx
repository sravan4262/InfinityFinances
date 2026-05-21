"use client";
import { useFireStore, currentMonthStr } from "@/lib/store";
import { useValidationErrors } from "@/lib/ValidationContext";
import { NumberField } from "@/components/ui/NumberField";
import { useState } from "react";
import {
  DollarSign, TrendingUp, ShoppingCart, Plus, Trash2,
  ChevronDown, ChevronRight, PiggyBank,
} from "lucide-react";
import { formatCurrency, formatPct } from "@/lib/utils";
import { getFireCurrency } from "@/lib/currency";
import type { SavingsStream, FireInputs } from "@/lib/engine/types";

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

export function StepIncome() {
  const { inputs, updateInputs, includeSpouse, spouseInputs, updateSpouseInputs, setPreviewPerson } = useFireStore();
  const errors = useValidationErrors();
  const [person, setPerson] = useState<Person>("you");

  const handlePersonChange = (p: Person) => { setPerson(p); setPreviewPerson(p); };

  const activeInputs: FireInputs = includeSpouse && person === "spouse" ? spouseInputs : inputs;
  const activeUpdate = includeSpouse && person === "spouse" ? updateSpouseInputs : updateInputs;
  const currency = inputs.currency ?? "USD";
  const currencySymbol = getFireCurrency(currency).symbol;

  const savingsRate =
    activeInputs.afterTaxIncome > 0
      ? (activeInputs.afterTaxIncome - activeInputs.currentSpending) / activeInputs.afterTaxIncome
      : 0;
  const annualSavings = activeInputs.afterTaxIncome - activeInputs.currentSpending;

  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, savingsRate)));

  const addStream = () => {
    activeUpdate({
      savingsStreams: [
        ...(activeInputs.savingsStreams ?? []),
        {
          label: `Stream ${(activeInputs.savingsStreams?.length ?? 0) + 1}`,
          monthlyAmount: 500,
          annualIncreaseRate: 0.03,
          startDate: currentMonthStr(),
          endDate: "",
        } satisfies SavingsStream,
      ],
    });
  };

  const removeStream = (idx: number) => {
    activeUpdate({ savingsStreams: (activeInputs.savingsStreams ?? []).filter((_, i) => i !== idx) });
  };

  const updateStream = (idx: number, patch: Partial<SavingsStream>) => {
    activeUpdate({
      savingsStreams: (activeInputs.savingsStreams ?? []).map((s, i) =>
        i === idx ? { ...s, ...patch } : s
      ),
    });
  };

  const totalStreams = (activeInputs.savingsStreams ?? []).reduce(
    (s, st) => s + st.monthlyAmount,
    0
  );

  const isSpouse = includeSpouse && person === "spouse";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Income & spending</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your savings rate is the single biggest lever for early retirement.
        </p>
      </div>

      {includeSpouse && (
        <PersonTabs person={person} onChange={handlePersonChange} />
      )}

      <div className="grid gap-4">
        <NumberField
          label="Annual gross income"
          icon={<DollarSign className="w-4 h-4" />}
          value={activeInputs.grossIncome}
          onChange={(v) => activeUpdate({ grossIncome: v })}
          prefix={currencySymbol}
          format="currency"
          placeholder="e.g. 120,000"
          hint="Before taxes and deductions"
        />
        <NumberField
          label="Annual after-tax income"
          icon={<DollarSign className="w-4 h-4" />}
          value={activeInputs.afterTaxIncome}
          onChange={(v) => activeUpdate({ afterTaxIncome: v })}
          prefix={currencySymbol}
          format="currency"
          placeholder="e.g. 90,000"
          hint="Take-home pay you actually receive"
          error={!isSpouse ? errors.afterTaxIncome : undefined}
        />
        <NumberField
          label={isSpouse ? "Annual spending (leave 0 to share household)" : "Annual spending"}
          icon={<ShoppingCart className="w-4 h-4" />}
          value={activeInputs.currentSpending}
          onChange={(v) => activeUpdate({ currentSpending: v })}
          prefix={currencySymbol}
          format="currency"
          placeholder="e.g. 60,000"
          hint={isSpouse ? "Spouse's individual spending; combined uses your household total" : "What you actually spend each year"}
          error={!isSpouse ? errors.currentSpending : undefined}
        />
        <NumberField
          label="Salary growth rate"
          icon={<TrendingUp className="w-4 h-4" />}
          value={activeInputs.salaryGrowthRate}
          onChange={(v) => activeUpdate({ salaryGrowthRate: v })}
          format="percent"
          suffix="%/yr"
          min={0}
          max={0.3}
          placeholder="e.g. 3"
          hint="Expected annual raise (e.g. 3%)"
        />
      </div>

      {/* Savings rate visual */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="20" fill="none" stroke="currentColor" strokeWidth="4"
              className="text-border" />
            <circle cx="26" cy="26" r="20" fill="none" stroke="currentColor" strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={savingsRate >= 0.5 ? "text-success" : savingsRate >= 0.25 ? "text-primary" : "text-warning"}
              transform="rotate(-90 26 26)"
              style={{ transition: "stroke-dashoffset 0.4s ease" }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
            {formatPct(savingsRate, 0)}
          </span>
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-semibold">Base savings rate</p>
          <p className="text-muted-foreground text-xs">
            {isSpouse ? "Spouse saves" : "You save"}{" "}
            <span className="text-foreground font-medium">
              {formatCurrency(Math.max(0, annualSavings), false, currency)}
            </span>{" "}
            per year
            {totalStreams > 0 && (
              <> +{" "}
                <span className="text-primary font-medium">
                  {formatCurrency(totalStreams * 12, false, currency)}
                </span>{" "}
                from streams
              </>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            {savingsRate >= 0.5
              ? "Excellent — FIRE is very achievable"
              : savingsRate >= 0.3
              ? "Good — you're on a solid path"
              : savingsRate >= 0.15
              ? "Moderate — consider cutting spending"
              : "Low — aggressive action needed"}
          </p>
        </div>
      </div>

      {/* Additional savings streams */}
      <Section title="Additional savings streams" icon={<PiggyBank className="w-4 h-4" />}>
        <p className="text-xs text-muted-foreground">
          Named savings vehicles (SIP, 401k, LIC, chits, etc.) added on top of base income − spending.
          Each stream can have its own growth rate and date range.
        </p>
        <div className="space-y-4">
          {(activeInputs.savingsStreams ?? []).map((stream, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-transparent text-sm font-medium border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  value={stream.label}
                  onChange={(e) => updateStream(idx, { label: e.target.value })}
                  placeholder="Stream label (e.g. SIP, 401k)"
                />
                <button
                  onClick={() => removeStream(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Monthly amount"
                  value={stream.monthlyAmount}
                  onChange={(v) => updateStream(idx, { monthlyAmount: v })}
                  prefix={currencySymbol}
                  format="currency"
                />
                <NumberField
                  label="Annual increase"
                  value={stream.annualIncreaseRate}
                  onChange={(v) => updateStream(idx, { annualIncreaseRate: v })}
                  format="percent"
                  suffix="%/yr"
                  min={0}
                  max={0.3}
                  hint="How fast this stream grows"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Start date</label>
                  <input
                    type="month"
                    value={stream.startDate}
                    onChange={(e) => updateStream(idx, { startDate: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">End date (optional)</label>
                  <input
                    type="month"
                    value={stream.endDate}
                    onChange={(e) => updateStream(idx, { endDate: e.target.value })}
                    placeholder="No end"
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addStream}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add savings stream
          </button>
        </div>
      </Section>
    </div>
  );
}
