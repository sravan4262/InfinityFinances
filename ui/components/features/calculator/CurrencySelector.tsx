"use client";
import { FIRE_CURRENCIES } from "@/lib/currency";
import { useFireStore } from "@/lib/store";
import type { FireCurrency } from "@/lib/engine/types";

export function CurrencySelector() {
  const inputs = useFireStore((s) => s.inputs);
  const updateInputs = useFireStore((s) => s.updateInputs);
  const currency = inputs.currency ?? "USD";
  const selected = FIRE_CURRENCIES[currency];

  return (
    <div className="rounded-2xl border border-border bg-muted/15 p-4 grid gap-2 sm:grid-cols-[1fr_260px] sm:items-center">
      <div>
        <label htmlFor="fire-currency" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Currency
        </label>
        <p className="text-xs text-muted-foreground mt-1">
          Amounts and portfolio presets use {selected.country}.
        </p>
      </div>
      <select
        id="fire-currency"
        value={currency}
        onChange={(event) => updateInputs({ currency: event.target.value as FireCurrency })}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {Object.entries(FIRE_CURRENCIES).map(([code, cfg]) => (
          <option key={code} value={code}>
            {cfg.symbol} {cfg.label} - {cfg.country}
          </option>
        ))}
      </select>
    </div>
  );
}
