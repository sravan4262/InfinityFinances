"use client";
import { useFireStore } from "@/lib/store";
import { NumberField } from "@/components/ui/NumberField";
import { formatCurrency } from "@/lib/utils";
import { getAssetPresets, getFireCurrency } from "@/lib/currency";
import { useState } from "react";
import {
  Wallet, TrendingUp, Activity, Plus, Trash2,
  ChevronDown, ChevronRight,
} from "lucide-react";
import type { AssetClass, AccountType, FireInputs } from "@/lib/engine/types";

type Person = "you" | "spouse";

const ACCOUNT_TYPE_LABELS: Record<AccountType, { label: string; color: string; bg: string }> = {
  taxable:     { label: "Taxable",     color: "oklch(0.68 0.15 195)", bg: "bg-primary/10 text-primary" },
  roth:        { label: "Roth",        color: "oklch(0.65 0.18 150)", bg: "bg-success/10 text-success" },
  traditional: { label: "Traditional", color: "oklch(0.76 0.155 75)", bg: "bg-gold/10 text-gold" },
};

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

export function StepPortfolio() {
  const { inputs, updateInputs, includeSpouse, spouseInputs, updateSpouseInputs, setPreviewPerson } = useFireStore();
  const [person, setPerson] = useState<Person>("you");
  const [expandedAssets, setExpandedAssets] = useState<Set<number>>(new Set());

  const activeInputs: FireInputs = includeSpouse && person === "spouse" ? spouseInputs : inputs;
  const activeUpdate = includeSpouse && person === "spouse" ? updateSpouseInputs : updateInputs;

  const { assets, inflationRate } = activeInputs;
  const currency = inputs.currency ?? "USD";
  const currencySymbol = getFireCurrency(currency).symbol;
  const assetPresets = getAssetPresets(currency);

  const toggleAsset = (idx: number) => {
    setExpandedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const totalNetWorth = assets.reduce((s, a) => s + a.value, 0);
  const totalMonthlyContributions = assets.reduce((s, a) => s + (a.monthlyContribution ?? 0), 0);
  const weightedNominalReturn =
    totalNetWorth > 0
      ? assets.reduce((s, a) => s + a.annualReturn * a.value, 0) / totalNetWorth
      : activeInputs.expectedReturn;
  const weightedRealReturn =
    (1 + weightedNominalReturn) / (1 + inflationRate) - 1;

  const updateAsset = (idx: number, patch: Partial<AssetClass>) => {
    activeUpdate({
      assets: assets.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
    });
  };
  const addAsset = () => {
    const newIdx = assets.length;
    const preset = assetPresets[0];
    activeUpdate({
      assets: [
        ...assets,
        {
          label: preset.label,
          value: 0,
          annualReturn: preset.annualReturn,
          accountType: preset.accountType,
        },
      ],
    });
    setExpandedAssets((prev) => new Set([...prev, newIdx]));
  };
  const removeAsset = (idx: number) => {
    activeUpdate({ assets: assets.filter((_, i) => i !== idx) });
    setExpandedAssets((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => { if (i < idx) next.add(i); else if (i > idx) next.add(i - 1); });
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          {includeSpouse ? "Net worth" : "Your net worth"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Break your portfolio into asset classes — each gets its own return rate.
        </p>
      </div>

      {includeSpouse && (
        <PersonTabs person={person} onChange={(p) => { setPerson(p); setPreviewPerson(p); setExpandedAssets(new Set()); }} />
      )}

      {/* Total net worth summary */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="w-4 h-4 text-primary" />
          {includeSpouse && person === "spouse" ? "Spouse's net worth" : "Total net worth"}
        </div>
        <span className="text-xl font-bold text-primary tabular-nums">
          {formatCurrency(totalNetWorth, false, currency)}
        </span>
      </div>

      {/* Asset rows */}
      <div className="space-y-3">
        {assets.map((asset, idx) => {
          const isOpen = expandedAssets.has(idx);
          return (
            <div key={idx} className="rounded-xl border border-border bg-muted/20 overflow-hidden">
              {/* Collapsible header */}
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  onClick={() => toggleAsset(idx)}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  {isOpen
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="text-sm font-medium truncate">{asset.label}</span>
                  {!isOpen && asset.value > 0 && (
                    <span className="text-xs text-muted-foreground ml-1 shrink-0">
                      {formatCurrency(asset.value, false, currency)}
                    </span>
                  )}
                </button>
                {!isOpen && (
                  <div className="shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ACCOUNT_TYPE_LABELS[asset.accountType ?? "taxable"].bg}`}>
                      {ACCOUNT_TYPE_LABELS[asset.accountType ?? "taxable"].label}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAsset(idx)}
                  disabled={assets.length <= 1}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                  {/* Asset type selector */}
                  <select
                    value={asset.label}
                    onChange={(e) => {
                      const preset = assetPresets.find((p) => p.label === e.target.value);
                      updateAsset(idx, {
                        label: e.target.value,
                        ...(preset ? { annualReturn: preset.annualReturn, accountType: preset.accountType } : {}),
                      });
                    }}
                    className="w-full bg-transparent text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1.5 border border-border"
                  >
                    {assetPresets.map((p) => (
                      <option key={p.label} value={p.label}>{p.label}</option>
                    ))}
                    {!assetPresets.find((p) => p.label === asset.label) && (
                      <option value={asset.label}>{asset.label}</option>
                    )}
                  </select>

                  {/* Account type toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Account type:</span>
                    <div className="flex gap-1">
                      {(["taxable", "roth", "traditional"] as AccountType[]).map((t) => {
                        const cfg = ACCOUNT_TYPE_LABELS[t];
                        const active = (asset.accountType ?? "taxable") === t;
                        return (
                          <button
                            key={t}
                            onClick={() => updateAsset(idx, { accountType: t })}
                            className={`text-xs px-2 py-0.5 rounded-full transition-colors border ${
                              active
                                ? `${cfg.bg} border-current`
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <NumberField
                      label="Current value"
                      value={asset.value}
                      onChange={(v) => updateAsset(idx, { value: v })}
                      prefix={currencySymbol}
                      format="currency"
                      placeholder="e.g. 50,000"
                    />
                    <NumberField
                      label="Annual return"
                      value={asset.annualReturn}
                      onChange={(v) => updateAsset(idx, { annualReturn: v })}
                      format="percent"
                      suffix="%/yr"
                      min={0}
                      max={0.3}
                      placeholder="e.g. 10"
                    />
                    <NumberField
                      label="Monthly investment"
                      value={asset.monthlyContribution ?? 0}
                      onChange={(v) => updateAsset(idx, { monthlyContribution: v || undefined })}
                      prefix={currencySymbol}
                      format="currency"
                      placeholder="e.g. 500"
                      hint="Ongoing monthly contribution to this asset"
                    />
                  </div>

                  {totalNetWorth > 0 && (
                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (asset.value / totalNetWorth) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        {((asset.value / totalNetWorth) * 100).toFixed(1)}% of net worth
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={addAsset}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add asset class
        </button>
      </div>

      {/* Inflation — shared setting, only show on "you" tab */}
      {(!includeSpouse || person === "you") && (
        <NumberField
          label="Inflation rate"
          icon={<Activity className="w-4 h-4" />}
          value={inflationRate}
          onChange={(v) => activeUpdate({ inflationRate: v })}
          format="percent"
          suffix="%/yr"
          min={0}
          max={0.1}
          placeholder="e.g. 3"
          hint="Historical average ~3%. All returns are nominal; engine converts to real."
        />
      )}

      {/* Blended return summary */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
          Blended return summary
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground text-xs block">Weighted nominal</span>
            <span className="font-semibold flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3 text-primary" />
              {(weightedNominalReturn * 100).toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">Inflation</span>
            <span className="font-semibold mt-0.5 block">{(inflationRate * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">Real return</span>
            <span className="font-semibold mt-0.5 text-success block">
              {(weightedRealReturn * 100).toFixed(2)}%
            </span>
          </div>
          {totalMonthlyContributions > 0 && (
            <div>
              <span className="text-muted-foreground text-xs block">Monthly invest.</span>
              <span className="font-semibold mt-0.5 block">{formatCurrency(totalMonthlyContributions, false, currency)}/mo</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
