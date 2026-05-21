"use client";
import { useMemo, useState } from "react";
import { NumberField } from "@/components/ui/NumberField";
import { amortize, pmt, fmt$ } from "./lib/math";
import type { MortgageInputs } from "./lib/types";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const DEFAULTS: MortgageInputs = {
  homePrice: 600000,
  downPayment: 120000,
  interestRate: 6.5,
  loanTermYears: 30,
  extraMonthlyPayment: 0,
  displayYears: 30,
};

function StatCard({ label, value, hint, bad }: { label: string; value: string; hint: string; bad?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold font-mono tracking-tight ${bad ? "text-red-500" : ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function formatPayoff(months: number): string {
  const y = Math.floor(months / 12);
  const mo = months % 12;
  return `${y}y ${mo}m`;
}

export function MortgageCalc({ inputs: externalInputs, onInputsChange }: {
  inputs?: MortgageInputs;
  onInputsChange?: (i: MortgageInputs) => void;
}) {
  const [local, setLocal] = useState<MortgageInputs>(DEFAULTS);
  const inputs = externalInputs ?? local;
  const set = (patch: Partial<MortgageInputs>) => {
    const next = { ...inputs, ...patch };
    setLocal(next);
    onInputsChange?.(next);
  };

  const { rows, monthly, totalInterest, totalCost, payoffStr } = useMemo(() => {
    const loan = Math.max(0, inputs.homePrice - inputs.downPayment);
    const monthly = pmt(loan, inputs.interestRate, inputs.loanTermYears);
    const result = amortize(inputs);
    return {
      rows: result.rows,
      monthly,
      totalInterest: result.totalInterest,
      totalCost: loan + result.totalInterest,
      payoffStr: result.totalMonths > 0 ? formatPayoff(result.totalMonths) : "—",
    };
  }, [inputs]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      {/* ── Inputs ── */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Loan Details</h3>
            <p className="text-xs text-muted-foreground mt-0.5">P&I only — taxes, insurance, and PMI not included.</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-[11px]">About this calculator</p>
            <p>Shows principal & interest only. Try adding an extra monthly payment to see how much interest you save and how many years you shave off your loan.</p>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Core Numbers</p>
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">What to enter here</p>
            <p>Enter the home price and down payment from the listing, then your lender's quoted interest rate and term. Try toggling the Extra Payment field — even $100/mo extra can save tens of thousands in interest.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Home Price" value={inputs.homePrice} onChange={(v) => set({ homePrice: v })} prefix="$" format="currency" hint="Total purchase price of the home" />
            <NumberField label="Down Payment" value={inputs.downPayment} onChange={(v) => set({ downPayment: v })} prefix="$" format="currency" hint="Upfront cash — 20% of price avoids PMI" />
            <NumberField label="Interest Rate" value={inputs.interestRate} onChange={(v) => set({ interestRate: v })} suffix="%" hint="Fixed rate quoted by your lender" />
            <NumberField label="Loan Term" value={inputs.loanTermYears} onChange={(v) => set({ loanTermYears: v })} suffix="yrs" hint="30yr = lower payment; 15yr = less total interest" />
            <NumberField label="Extra Payment" value={inputs.extraMonthlyPayment} onChange={(v) => set({ extraMonthlyPayment: v })} prefix="$" suffix="/mo" format="currency" hint="Goes straight to principal — cuts years off your loan" />
            <NumberField label="Years to Show" value={inputs.displayYears} onChange={(v) => set({ displayYears: Math.max(1, Math.floor(v)) })} hint="Limit table rows to this many years" />
          </div>

          <button
            onClick={() => { setLocal(DEFAULTS); onInputsChange?.(DEFAULTS); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg py-1.5 transition-colors"
          >
            Reset defaults
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide">How to read the table</p>
          <ul className="space-y-1.5">
            {[
              ["Annual Payment", "Total P&I you paid that year (monthly × 12 ± any extra payments)."],
              ["Principal Paid", "How much your loan balance actually shrank — this is real equity you own."],
              ["Interest Paid", "The lender's fee for that year. It's highest in Year 1 and shrinks every year as your balance drops."],
              ["Cum. Interest", "Running total of all interest paid since day one — the true cost of borrowing."],
              ["Remaining Balance", "What you still owe the bank. If you sold the home, you'd need to cover this from the sale price."],
              ["Equity %", "What fraction of the original loan you've paid off. Starts near 0%, reaches 100% when fully paid."],
            ].map(([term, def]) => (
              <li key={term}><span className="font-medium text-foreground">{term}:</span> {def}</li>
            ))}
          </ul>
          <p className="pt-1 border-t border-border">Tip: In early years most of your payment is interest, not principal — that&apos;s normal for mortgages. Extra payments go straight to principal and can shave years off your loan.</p>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Monthly P&I" value={fmt$(monthly)} hint="Principal & interest only" />
          <StatCard label="Total Interest" value={fmt$(totalInterest)} hint="Total cost of borrowing" bad />
          <StatCard label="Total Cost" value={fmt$(totalCost)} hint="Loan amount + interest" />
          <StatCard label="Payoff" value={payoffStr} hint="With extra payments applied" />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm">Principal vs Interest + Remaining Balance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Bars show annual payment split; line tracks the loan balance declining over time.</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold shrink-0 mt-0.5">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />Interest</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Principal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-400 inline-block" />Balance</span>
            </div>
          </div>
          <div className="px-2 py-4">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={rows.map(r => ({ year: `Yr ${r.year}`, Interest: r.interestPaid, Principal: r.principalPaid, Balance: r.balance }))}
                barSize={rows.length > 20 ? 7 : 12}
                margin={{ top: 44, right: 52, left: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="balanceLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "rgba(128,128,128,0.7)" }} tickLine={false} axisLine={false} interval={rows.length > 20 ? 4 : rows.length > 10 ? 1 : 0} />
                <YAxis yAxisId="bars" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "rgba(128,128,128,0.7)" }} tickLine={false} axisLine={false} width={44} />
                <YAxis yAxisId="balance" orientation="right" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "rgba(128,128,128,0.7)" }} tickLine={false} axisLine={false} width={48} />
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
                            <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt$(p.value as number)}</span>
                          </span>
                        ))}
                      </div>
                    );
                  }}
                />
                <Bar yAxisId="bars" dataKey="Interest" stackId="a" fill="#ef4444" fillOpacity={0.85} radius={[0, 0, 0, 0]} />
                <Bar yAxisId="bars" dataKey="Principal" stackId="a" fill="#10b981" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
                <Line yAxisId="balance" type="monotone" dataKey="Balance" stroke="#818cf8" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#818cf8", strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Amortization Schedule</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Year-by-year breakdown of where your payments go and how equity grows.</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />Interest</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Principal & Equity</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 700 }}>
              <thead>
                <tr className="bg-muted/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="sticky left-0 bg-muted/50 px-4 py-3 text-left">Year</th>
                  <th className="px-3 py-3 text-right">Annual Payment</th>
                  <th className="px-3 py-3 text-right text-emerald-600">Principal Paid</th>
                  <th className="px-3 py-3 text-right text-red-500">Interest Paid</th>
                  <th className="px-3 py-3 text-right text-red-500">Cum. Interest</th>
                  <th className="px-3 py-3 text-right">Remaining Balance</th>
                  <th className="px-3 py-3 text-right text-emerald-600">Equity %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((r) => (
                  <tr key={r.year} className="hover:bg-muted/20 transition-colors">
                    <td className="sticky left-0 bg-card px-4 py-2.5 font-semibold">Yr {r.year}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmt$(r.annualPayment)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-600">{fmt$(r.principalPaid)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-red-500">{fmt$(r.interestPaid)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-red-500">{fmt$(r.cumInterest)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{fmt$(r.balance)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono text-emerald-600 text-[11px] w-10 text-right">{r.equityPct.toFixed(1)}%</span>
                        <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${r.equityPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
            Assumes a fixed-rate mortgage with constant monthly payments. Rounding may cause minor variances at payoff. Does not include taxes, insurance, PMI, or HOA.
          </div>
        </div>
      </div>
    </div>
  );
}
