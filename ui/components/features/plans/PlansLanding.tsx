"use client";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { plansApi, type SavedPlan } from "@/lib/api/plans";
import { useFireStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export function PlansLanding({
  plans,
  onPlansChange,
  onStartNew,
  onEdit,
}: {
  plans: SavedPlan[];
  onPlansChange: (plans: SavedPlan[]) => void;
  onStartNew: () => void;
  onEdit: () => void;
}) {
  const { loadPlan, calculate } = useFireStore();
  const [planToDelete, setPlanToDelete] = useState<SavedPlan | null>(null);

  const view = (plan: SavedPlan) => {
    loadPlan(plan.id, plan.name, plan.inputs);
    calculate();
  };
  const edit = (plan: SavedPlan) => {
    loadPlan(plan.id, plan.name, plan.inputs);
    onEdit();
  };
  const remove = async () => {
    if (!planToDelete) return;
    await plansApi.delete(planToDelete.id);
    onPlansChange(plans.filter((plan) => plan.id !== planToDelete.id));
    setPlanToDelete(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Your retirement plans</h1>
        <p className="text-sm text-muted-foreground">Pick a saved scenario to continue where you left off.</p>
      </div>
      <div className="grid gap-3">
        {plans.map((plan) => {
          const monthlySavings = Math.max(0, (plan.inputs.afterTaxIncome - plan.inputs.currentSpending) / 12);
          return (
            <div
              key={plan.id}
              onClick={() => view(plan)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === "Enter") view(plan); }}
              className="glass cursor-pointer rounded-2xl border border-border p-5 text-left hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">{plan.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Retire at {plan.inputs.retirementAge || "—"} · {formatCurrency(monthlySavings, false, plan.inputs.currency)}/mo saved
                  </p>
                </div>
                <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                  <button onClick={() => edit(plan)} className="p-2 text-muted-foreground hover:text-primary" title="Edit plan">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPlanToDelete(plan)} className="p-2 text-muted-foreground hover:text-destructive" title="Delete plan">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {plans.length < 3 && (
        <div className="text-center">
          <button onClick={onStartNew} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            Create new plan
          </button>
        </div>
      )}
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
    </div>
  );
}
