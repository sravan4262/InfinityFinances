import { notFound } from "next/navigation";
import { Flame } from "lucide-react";
import type { FireInputs, FireResults } from "@/lib/engine/types";
import { calculateFireMonthly } from "@/lib/engine/monthly";
import { formatCurrency, formatPct } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

async function getPlan(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const res = await fetch(`${apiUrl}/plans/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json() as Promise<{ name: string; inputs: FireInputs; isPublic: boolean }>;
}

export default async function SharedPlanPage({ params }: Props) {
  const { id } = await params;
  const plan = await getPlan(id);

  if (!plan || !plan.isPublic) notFound();

  const results: FireResults = calculateFireMonthly(plan.inputs);
  const fireAgeStr = results.fireAge ? `Age ${results.fireAge}` : "Not reached";
  const depletionStr = results.depletionAge
    ? `Age ${results.depletionAge}`
    : `${plan.inputs.lifeExpectancy}+`;

  const stats = [
    { label: "FIRE number", value: formatCurrency(results.fireNumber) },
    { label: "Retire at", value: fireAgeStr },
    { label: "Years to FIRE", value: results.yearsToFire ? `${results.yearsToFire} yrs` : "—" },
    { label: "Savings rate", value: formatPct(results.currentSavingsRate) },
    { label: "PV corpus", value: formatCurrency(results.requiredCorpusPV) },
    { label: "Money lasts until", value: depletionStr },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Infinity Finances</span>
          </div>
          <h1 className="text-2xl font-bold">{plan.name}</h1>
          <p className="text-sm text-muted-foreground">Shared FIRE projection</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-lg font-bold tabular-nums text-primary">{s.value}</p>
            </div>
          ))}
        </div>

        {/* FIRE variants */}
        <div className="glass rounded-2xl p-5 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">FIRE variants</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: "Lean FIRE", value: results.leanFireNumber },
              { label: "Standard FIRE", value: results.fireNumber },
              { label: "Fat FIRE", value: results.fatFireNumber },
              { label: "Coast FIRE", value: results.coastFireNumber },
            ].map((v) => (
              <div key={v.label} className="rounded-xl bg-muted/10 border border-border p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">{v.label}</p>
                <p className="font-semibold tabular-nums">{formatCurrency(v.value)}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Calculated with{" "}
          <a href="/" className="text-primary hover:underline">Infinity Finances</a>
        </p>
      </div>
    </div>
  );
}
