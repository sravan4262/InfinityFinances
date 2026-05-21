"use client";
import { useEffect, useState } from "react";
import { Pencil, Trash2, FolderOpen } from "lucide-react";
import { plansApi, type SavedPlan } from "@/lib/api/plans";
import { useUser } from "@/lib/hooks/useUser";
import { useFireStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export function SavedPlansPanel() {
  const { user } = useUser();
  const { loadPlan, calculate } = useFireStore();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SavedPlan | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    plansApi.list().then(setPlans).finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const open = (plan: SavedPlan, shouldCalculate: boolean) => {
    loadPlan(plan.id, plan.name, plan.inputs);
    if (shouldCalculate) calculate();
  };
  const remove = async () => {
    if (!planToDelete) return;
    await plansApi.delete(planToDelete.id);
    setPlans((current) => current.filter((plan) => plan.id !== planToDelete.id));
    setPlanToDelete(null);
  };

  return (
    <section className="glass rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Your plans</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">{plans.length}/3 saved</span>
      </div>
      {loading ? <p className="text-xs text-muted-foreground">Loading plans…</p> : null}
      {!loading && plans.length === 0 ? (
        <p className="text-xs text-muted-foreground">No saved plans yet. Your first one will live here.</p>
      ) : null}
      {plans.map((plan) => {
        const monthlySavings = Math.max(0, (plan.inputs.afterTaxIncome - plan.inputs.currentSpending) / 12);
        return (
          <div key={plan.id} className="rounded-xl border border-border bg-muted/10 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => open(plan, true)} className="min-w-0 text-left">
                <p className="text-sm font-medium truncate">{plan.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  Retire at {plan.inputs.retirementAge || "—"} · {formatCurrency(monthlySavings, false, plan.inputs.currency)}/mo saved
                </p>
              </button>
              <div className="flex gap-1">
                <button onClick={() => open(plan, false)} title="Edit plan" className="p-1.5 text-muted-foreground hover:text-primary">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setPlanToDelete(plan)} title="Delete plan" className="p-1.5 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {planToDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 space-y-4">
            <div>
              <p className="font-semibold">Delete {planToDelete.name}?</p>
              <p className="text-sm text-muted-foreground">This removes the saved plan permanently.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPlanToDelete(null)} className="rounded-lg px-3 py-2 text-sm text-muted-foreground">Cancel</button>
              <button onClick={remove} className="rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground">Delete plan</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
