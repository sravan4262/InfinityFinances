"use client";
import { useMemo, useState } from "react";
import { NumberField } from "@/components/ui/NumberField";
import {
  buildBreakEvenTable,
  breakEvenMonth,
  computeBreakEvenRow,
  fmt$,
  fmtSigned,
  fmtBreakEven,
  pmt,
} from "./lib/math";
import type { BreakEvenInputs } from "./lib/types";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

const DEFAULTS: BreakEvenInputs = {
  purchasePrice: 600000,
  downPayment: 120000,
  interestRate: 6.5,
  loanTermYears: 30,
  initialClosingCosts: 15000,
  annualAppreciation: 3,
  sellingCostPercent: 7,
  annualPropertyTax: 12000,
  annualInsurance: 2500,
  annualMaintenance: 6000,
  monthlyHOA: 0,
  maxYears: 15,
  monthlyRentSaved: 2500,
  annualRentGrowth: 3,
  opportunityCostRate: 6,
  annualTaxBenefit: 0,
};

function StatCard({ label, value, hint, positive }: { label: string; value: string; hint: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold font-mono tracking-tight ${positive === true ? "text-emerald-500" : positive === false ? "text-red-500" : ""}`}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export function BreakEvenCalc({ inputs: externalInputs, onInputsChange }: {
  inputs?: BreakEvenInputs;
  onInputsChange?: (i: BreakEvenInputs) => void;
}) {
  const [local, setLocal] = useState<BreakEvenInputs>(DEFAULTS);
  const [advOpen, setAdvOpen] = useState(false);

  const inputs = externalInputs ?? local;
  const set = (patch: Partial<BreakEvenInputs>) => {
    const next = { ...inputs, ...patch };
    setLocal(next);
    onInputsChange?.(next);
  };

  const { rows, beBasic, beAdv, monthly, fiveYrAdv } = useMemo(() => {
    const rows = buildBreakEvenTable(inputs);
    const beBasic = breakEvenMonth(inputs, false);
    const beAdv = breakEvenMonth(inputs, true);
    const loanAmount = Math.max(0, inputs.purchasePrice - inputs.downPayment);
    const monthly = pmt(loanAmount, inputs.interestRate, inputs.loanTermYears);
    const fiveYrAdv = computeBreakEvenRow(inputs, 60).advancedNet;
    return { rows, beBasic, beAdv, monthly, fiveYrAdv };
  }, [inputs]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      {/* ── Inputs ── */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Calculator Inputs</h3>
            <p className="text-xs text-muted-foreground mt-0.5">How long before buying beats renting?</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground text-[11px]">Start here</p>
            <p>Compares what you put into the house against what you get back when you sell. Basic Net uses house-only costs; Advanced Net adds rent avoided and subtracts opportunity cost.</p>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Core Numbers</p>
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">What to enter here</p>
            <p>These are the key numbers from your home purchase. You can find them on any listing (price, taxes) or by calling a lender (rate, term, closing costs). Appreciation is your best guess at how fast home values grow in your area — 3% is a safe default.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Purchase Price" value={inputs.purchasePrice} onChange={(v) => set({ purchasePrice: v })} prefix="$" format="currency" hint="The listed or agreed-upon sale price of the home" />
            <NumberField label="Down Payment" value={inputs.downPayment} onChange={(v) => set({ downPayment: v })} prefix="$" format="currency" hint="Upfront cash you pay — 20% of price avoids PMI" />
            <NumberField label="Interest Rate" value={inputs.interestRate} onChange={(v) => set({ interestRate: v })} suffix="%" hint="Fixed rate your lender quotes (check today's rates)" />
            <NumberField label="Loan Term" value={inputs.loanTermYears} onChange={(v) => set({ loanTermYears: v })} suffix="yrs" hint="30yr = lower payment; 15yr = less total interest" />
            <NumberField label="Closing Costs" value={inputs.initialClosingCosts} onChange={(v) => set({ initialClosingCosts: v })} prefix="$" format="currency" hint="~2–5% of price: title, appraisal, lender fees" />
            <NumberField label="Appreciation" value={inputs.annualAppreciation} onChange={(v) => set({ annualAppreciation: v })} suffix="%/yr" hint="US avg ~3–4%/yr; check your local market trend" />
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ongoing Costs</p>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Selling Costs" value={inputs.sellingCostPercent} onChange={(v) => set({ sellingCostPercent: v })} suffix="%" hint="Agent + fees" />
            <NumberField label="Property Tax" value={inputs.annualPropertyTax} onChange={(v) => set({ annualPropertyTax: v })} prefix="$" suffix="/yr" format="currency" />
            <NumberField label="Insurance" value={inputs.annualInsurance} onChange={(v) => set({ annualInsurance: v })} prefix="$" suffix="/yr" format="currency" />
            <NumberField label="Maintenance" value={inputs.annualMaintenance} onChange={(v) => set({ annualMaintenance: v })} prefix="$" suffix="/yr" format="currency" />
            <NumberField label="HOA" value={inputs.monthlyHOA} onChange={(v) => set({ monthlyHOA: v })} prefix="$" suffix="/mo" format="currency" />
            <NumberField label="Years to Show" value={inputs.maxYears} onChange={(v) => set({ maxYears: Math.max(1, Math.floor(v)) })} />
          </div>

          {/* Advanced */}
          <button
            onClick={() => setAdvOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 text-xs font-semibold text-muted-foreground transition-colors"
          >
            Advanced settings
            <span>{advOpen ? "▲" : "▼"}</span>
          </button>
          {advOpen && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Rent Avoided" value={inputs.monthlyRentSaved} onChange={(v) => set({ monthlyRentSaved: v })} prefix="$" suffix="/mo" format="currency" hint="What you'd pay in rent" />
              <NumberField label="Rent Growth" value={inputs.annualRentGrowth} onChange={(v) => set({ annualRentGrowth: v })} suffix="%/yr" />
              <NumberField label="Opp. Cost Rate" value={inputs.opportunityCostRate} onChange={(v) => set({ opportunityCostRate: v })} suffix="%/yr" hint="S&P avg ~6-7%" />
              <NumberField label="Annual Tax Benefit" value={inputs.annualTaxBenefit} onChange={(v) => set({ annualTaxBenefit: v })} prefix="$" format="currency" hint="Leave 0 if unsure" />
            </div>
          )}

          <button
            onClick={() => { setLocal(DEFAULTS); onInputsChange?.(DEFAULTS); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg py-1.5 transition-colors"
          >
            Reset defaults
          </button>
        </div>

        {/* How to read */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide">How to read results</p>
          <ul className="space-y-1.5 list-none">
            {[
              ["Basic Net", "House-only: cash from sale minus down, closing costs, interest, and ownership costs."],
              ["Advanced Net", "Basic Net + rent avoided + tax benefit − opportunity cost on upfront cash."],
              ["Break-even", "First year the chosen net value turns positive."],
            ].map(([term, def]) => (
              <li key={term}><span className="font-medium text-foreground">{term}:</span> {def}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Monthly P&I" value={fmt$(monthly)} hint="Principal + interest only" />
          <StatCard label="Basic Break-Even" value={fmtBreakEven(beBasic)} hint="House-only math" positive={beBasic !== null} />
          <StatCard label="Adv. Break-Even" value={fmtBreakEven(beAdv)} hint="Rent saved + opp. cost" positive={beAdv !== null} />
          <StatCard label="Adv. Net @ 5 Yrs" value={fmtSigned(fiveYrAdv)} hint="Quick benchmark" positive={fiveYrAdv >= 0} />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm">Break-Even Over Time</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Where lines cross zero, buying starts to beat renting.</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold shrink-0 mt-0.5">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-500 inline-block" />Adv. Net</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Basic Net</span>
            </div>
          </div>
          <div className="px-2 py-4">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={rows.map(r => ({ year: `Yr ${r.year}`, "Basic Net": r.basicNet, "Adv. Net": r.advancedNet }))}
                margin={{ top: 44, right: 16, left: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradAdv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8c4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#14b8c4" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="gradBasic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "rgba(128,128,128,0.7)" }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(v) => v >= 0 ? `+$${(v / 1000).toFixed(0)}k` : `-$${(Math.abs(v) / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: "rgba(128,128,128,0.7)" }} tickLine={false} axisLine={false} width={56}
                />
                <Tooltip
                  position={{ y: 0 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, padding: "7px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 20, whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
                        {payload.map((p, i) => (
                          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                            <span style={{ color: "hsl(var(--muted-foreground))" }}>{p.name}</span>
                            <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: (p.value as number) >= 0 ? "#10b981" : "#ef4444" }}>
                              {fmtSigned(p.value as number)}
                            </span>
                          </span>
                        ))}
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeDasharray="5 4"
                  label={{ value: "break-even", position: "insideTopRight", fontSize: 9, fill: "rgba(128,128,128,0.5)", dy: -6 }}
                />
                <Area type="monotone" dataKey="Adv. Net" stroke="#14b8c4" strokeWidth={2.5} fill="url(#gradAdv)" dot={false} activeDot={{ r: 5, fill: "#14b8c4", strokeWidth: 0 }} />
                <Area type="monotone" dataKey="Basic Net" stroke="#10b981" strokeWidth={2.5} fill="url(#gradBasic)" dot={false} activeDot={{ r: 5, fill: "#10b981", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Year-by-Year Breakdown</h3>
              <p className="text-xs text-muted-foreground mt-0.5">What happens if you sell at the end of each year.</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />Cost</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Gain</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-500 inline-block" />Advanced</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 900 }}>
              <thead>
                <tr className="bg-muted/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="sticky left-0 bg-muted/50 px-4 py-3 text-left">Year</th>
                  <th className="px-3 py-3 text-right">Sale Price</th>
                  <th className="px-3 py-3 text-right">Loan Balance</th>
                  <th className="px-3 py-3 text-right text-red-500">Selling Costs</th>
                  <th className="px-3 py-3 text-right text-red-500">Interest Paid</th>
                  <th className="px-3 py-3 text-right text-red-500">Tax+Ins+Maint+HOA</th>
                  <th className="px-3 py-3 text-right text-emerald-600">Cash Back</th>
                  <th className="px-3 py-3 text-right text-cyan-600">Rent Saved</th>
                  <th className="px-3 py-3 text-right text-red-500">Opp. Cost</th>
                  <th className="px-3 py-3 text-right font-bold">Basic Net</th>
                  <th className="px-3 py-3 text-right font-bold">Adv. Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((r) => (
                  <tr key={r.year} className="hover:bg-muted/20 transition-colors">
                    <td className="sticky left-0 bg-card px-4 py-2.5 font-semibold">Yr {r.year}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmt$(r.salePrice)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmt$(r.loanBalance)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-red-500">{fmt$(r.sellingCosts)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-red-500">{fmt$(r.interestPaid)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-red-500">{fmt$(r.otherCosts)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-600">{fmt$(r.cashBack)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-cyan-600">{fmt$(r.rentSaved)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-red-500">{fmt$(r.oppCost)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${r.basicNet >= 0 ? "text-emerald-600 bg-emerald-500/10" : "text-red-500 bg-red-500/10"}`}>
                      {fmtSigned(r.basicNet)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${r.advancedNet >= 0 ? "text-emerald-600 bg-emerald-500/10" : "text-red-500 bg-red-500/10"}`}>
                      {fmtSigned(r.advancedNet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Column guide</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <li><span className="font-medium text-foreground">Sale Price</span> — Home value after annual appreciation compounds.</li>
              <li><span className="font-medium text-foreground">Loan Balance</span> — What you still owe the bank at year-end.</li>
              <li><span className="font-medium text-red-500">Selling Costs</span> — Agent commission + transfer fees (% of sale price).</li>
              <li><span className="font-medium text-red-500">Interest Paid</span> — Cumulative mortgage interest paid to this point.</li>
              <li><span className="font-medium text-red-500">Tax+Ins+Maint+HOA</span> — Cumulative annual ownership costs.</li>
              <li><span className="font-medium text-emerald-600">Cash Back</span> — Sale proceeds minus loan payoff and selling costs.</li>
              <li><span className="font-medium text-cyan-600">Rent Saved</span> — Total rent you avoided by owning instead of renting.</li>
              <li><span className="font-medium text-red-500">Opp. Cost</span> — What your down payment could have grown to in the stock market.</li>
              <li><span className="font-medium text-foreground">Basic Net</span> — Cash Back minus all house costs vs. your initial investment. Positive = buying paid off.</li>
              <li><span className="font-medium text-foreground">Adv. Net</span> — Basic Net plus rent saved and tax benefit, minus opportunity cost. The full picture.</li>
            </ul>
            <p className="pt-1 border-t border-border">Does not include PMI, utilities, or moving costs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
