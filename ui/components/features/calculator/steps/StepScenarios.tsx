"use client";
import { useFireStore } from "@/lib/store";
import { useValidationErrors } from "@/lib/ValidationContext";
import { NumberField } from "@/components/ui/NumberField";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/utils";
import { getFireCurrency } from "@/lib/currency";
import { Zap } from "lucide-react";
import { useState } from "react";
import type { FireInputs } from "@/lib/engine/types";

type Person = "you" | "spouse";

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

export function StepScenarios() {
  const { inputs, updateInputs, includeSpouse, spouseInputs, updateSpouseInputs, setPreviewPerson } = useFireStore();
  const errors = useValidationErrors();
  const [person, setPerson] = useState<Person>("you");
  const handlePersonChange = (p: Person) => { setPerson(p); setPreviewPerson(p); };

  const activeInputs: FireInputs = includeSpouse && person === "spouse" ? spouseInputs : inputs;
  const activeUpdate = includeSpouse && person === "spouse" ? updateSpouseInputs : updateInputs;
  const currency = inputs.currency ?? "USD";
  const currencySymbol = getFireCurrency(currency).symbol;

  const fireNumber = activeInputs.withdrawalRate > 0
    ? activeInputs.retirementSpending / activeInputs.withdrawalRate
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Scenarios & assumptions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fine-tune your FIRE number and stress-test your plan.
        </p>
      </div>

      {includeSpouse && (
        <PersonTabs person={person} onChange={handlePersonChange} />
      )}

      {/* FIRE number preview */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center glow-primary">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
          {includeSpouse && person === "spouse" ? "Spouse's FIRE number" : "Your FIRE number"}
        </p>
        <p className="text-4xl font-bold text-primary tabular-nums">
          {fireNumber > 0 ? formatCurrency(fireNumber, false, currency) : "—"}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {activeInputs.retirementSpending > 0 && activeInputs.withdrawalRate > 0
            ? `${formatCurrency(activeInputs.retirementSpending, false, currency)} ÷ ${(activeInputs.withdrawalRate * 100).toFixed(1)}% withdrawal rate`
            : "Enter retirement spending and withdrawal rate above"}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground uppercase tracking-wide">Withdrawal rate</span>
            <span className="font-medium text-primary">{(activeInputs.withdrawalRate * 100).toFixed(1)}%</span>
          </div>
          <Slider
            value={[activeInputs.withdrawalRate * 100]}
            onValueChange={(val) => {
              const v = Array.isArray(val) ? (val as number[])[0] : (val as number);
              activeUpdate({ withdrawalRate: v / 100 });
            }}
            min={2} max={6} step={0.1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>2% (very conservative)</span>
            <span>6% (aggressive)</span>
          </div>
        </div>

        <NumberField
          label="Annual retirement spending"
          value={activeInputs.retirementSpending}
          onChange={(v) => activeUpdate({ retirementSpending: v })}
          prefix={currencySymbol}
          format="currency"
          placeholder="e.g. 60,000"
          hint={
            includeSpouse && person === "spouse"
              ? "Spouse's individual annual spend in retirement (today's dollars). Leave 0 to inherit household total."
              : "Your target annual spend in retirement (today's dollars)"
          }
          error={person === "you" ? errors.retirementSpending : undefined}
        />
      </div>

      {/* FIRE variants quick preview */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Lean", multiplier: 0.7, color: "text-success" },
          { label: "Standard", multiplier: 1, color: "text-primary" },
          { label: "Fat", multiplier: 1.5, color: "text-gold" },
        ].map(({ label, multiplier, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-muted/30 p-3 text-center"
          >
            <p className="text-xs text-muted-foreground">{label} FIRE</p>
            <p className={`text-sm font-bold mt-1 ${color}`}>
              {formatCurrency(fireNumber * multiplier, true, currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-4 h-4 text-gold mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            The 4% rule (25x rule) is a widely-cited safe withdrawal guideline from the Trinity Study.
            A more conservative 3.5% gives you a larger buffer; 5% works if you have flexible spending or other income.
          </p>
        </div>
      </div>
    </div>
  );
}
