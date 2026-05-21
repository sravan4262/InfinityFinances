"use client";
import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { AccountSequencingResult, FireCurrency } from "@/lib/engine/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Shield, AlertTriangle, ArrowRightLeft, Clock } from "lucide-react";

interface Props {
  seq: AccountSequencingResult;
  retirementAge: number;
  currency?: FireCurrency;
}

function InfoRow({ label, value, sub, accent }: {
  label: string;
  value: string;
  sub?: string;
  accent?: "warning" | "success" | "default";
}) {
  const colors = {
    warning: "text-warning",
    success: "text-success",
    default: "text-foreground",
  };
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/20 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={cn("text-xs font-semibold tabular-nums", colors[accent ?? "default"])}>
          {value}
        </span>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 text-xs space-y-1.5 shadow-xl">
      <p className="font-semibold text-foreground">Age {label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-6">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-medium" style={{ color: p.fill }}>
            {formatCurrency(p.value, true, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AccountSequencingPanel({ seq, retirementAge, currency }: Props) {
  const [expanded, setExpanded] = useState(false);

  const totalAtRetirement =
    seq.taxableAtRetirement + seq.rothAtRetirement + seq.traditionalAtRetirement;

  const hasMixedAccounts = seq.rothAtRetirement > 0 || seq.traditionalAtRetirement > 0;
  const hasEarlyPenalty = seq.earlyPenaltyTotal > 0;
  const isBridgeNeeded = seq.bridgeYears > 0;

  // Build stacked bar data from withdrawal rows (every other year for readability)
  const chartData = seq.withdrawalRows
    .filter((r) => r.age % 2 === 0 || r.age === seq.withdrawalRows[0]?.age)
    .map((r) => ({
      age: r.age,
      Taxable: Math.round(r.taxable),
      "Roth basis": Math.round(r.rothBasis),
      Traditional: Math.round(r.traditional),
    }));

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <div className="text-left">
            <p className="text-sm font-semibold">Account sequencing</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Withdrawal order · bridge years · Roth ladder
            </p>
          </div>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-border/20">

          {/* Account balance at retirement */}
          {hasMixedAccounts && (
            <div className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Estimated balances at retirement (age {retirementAge})
              </p>
              <div className="grid grid-cols-3 gap-2 min-w-0">
                {[
                  { label: "Taxable", value: seq.taxableAtRetirement, color: "oklch(0.68 0.15 195)", bg: "bg-primary/10 text-primary" },
                  { label: "Roth",    value: seq.rothAtRetirement,    color: "oklch(0.65 0.18 150)", bg: "bg-success/10 text-success" },
                  { label: "Traditional", value: seq.traditionalAtRetirement, color: "oklch(0.76 0.155 75)", bg: "bg-gold/10 text-gold" },
                ].map((bucket) => (
                  <div key={bucket.label} className="rounded-xl border border-border bg-muted/10 p-3 text-center">
                    <p className={cn("text-xs font-medium mb-1 px-1.5 py-0.5 rounded-full inline-block", bucket.bg)}>
                      {bucket.label}
                    </p>
                    <p className="text-sm font-bold tabular-nums mt-1">
                      {formatCurrency(bucket.value, true, currency)}
                    </p>
                    {totalAtRetirement > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {((bucket.value / totalAtRetirement) * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key facts */}
          <div className="rounded-xl border border-border bg-muted/10 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Sequencing summary
            </p>
            <div>
              <InfoRow
                label="Withdrawal order"
                value="Taxable → Roth basis → Traditional"
                sub="Defers taxes longest; Roth earnings last"
              />
              {isBridgeNeeded && (
                <InfoRow
                  label="Taxable bridge years"
                  value={`${seq.bridgeYears.toFixed(1)} years`}
                  sub={`From age ${retirementAge} to 59½ — funded by taxable accounts`}
                  accent={seq.taxableAtRetirement > 0 ? "success" : "warning"}
                />
              )}
              {seq.taxableDepletionAge !== null && (
                <InfoRow
                  label="Taxable depletes at"
                  value={`Age ${seq.taxableDepletionAge}`}
                  sub="Roth basis takes over from here"
                />
              )}
              {seq.conversionLadderFirstAccessAge !== null && (
                <InfoRow
                  label="Roth ladder first access"
                  value={`Age ${seq.conversionLadderFirstAccessAge}`}
                  sub="First conversion tranche unlocks (5-year rule)"
                  accent="success"
                />
              )}
              {hasEarlyPenalty && (
                <InfoRow
                  label="Early withdrawal penalties"
                  value={formatCurrency(seq.earlyPenaltyTotal, true, currency)}
                  sub="10% penalty on Traditional accessed before age 59½"
                  accent="warning"
                />
              )}
            </div>
          </div>

          {/* Alerts */}
          {isBridgeNeeded && seq.taxableAtRetirement <= 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="text-warning font-medium">No taxable bridge.</span>{" "}
                You retire at {retirementAge} but have no taxable assets to bridge until 59½.
                Add taxable brokerage assets or set up a Roth conversion ladder.
              </p>
            </div>
          )}

          {hasEarlyPenalty && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="text-warning font-medium">Early penalty detected.</span>{" "}
                {formatCurrency(seq.earlyPenaltyTotal, true, currency)} in 10% penalties from accessing
                Traditional accounts before age 59½. Increase taxable or Roth assets to avoid this.
              </p>
            </div>
          )}

          {/* Conversion ladder info */}
          {(seq.conversionLadderFirstAccessAge !== null) && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
              <ArrowRightLeft className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">Roth ladder active.</span>{" "}
                Conversions start unlocking at age{" "}
                <span className="text-foreground font-medium">{seq.conversionLadderFirstAccessAge}</span>.
                Each tranche is accessible tax-free and penalty-free once the 5-year clock runs out.
              </p>
            </div>
          )}

          {/* Withdrawal source breakdown chart */}
          {chartData.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Annual withdrawal sources
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.03 265 / 30%)" vertical={false} />
                  <XAxis dataKey="age" tick={{ fill: "oklch(0.55 0.02 265)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.55 0.02 265)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, true, currency)} width={52} />
                  <Tooltip content={<CustomTooltip currency={currency} />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.55 0.02 265)" }} />
                  <Bar dataKey="Taxable"     stackId="a" fill="oklch(0.68 0.15 195)" radius={[0,0,0,0]} />
                  <Bar dataKey="Roth basis"  stackId="a" fill="oklch(0.65 0.18 150)" radius={[0,0,0,0]} />
                  <Bar dataKey="Traditional" stackId="a" fill="oklch(0.76 0.155 75)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
